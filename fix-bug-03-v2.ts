/**
 * BUG-03 Fix v2: Replace `jsonResponse(X, STATUS) + response.text()` with `JSON.stringify(X)` directly.
 *
 * Pattern BEFORE (broken in Turbopack):
 *   const response = jsonResponse(X, STATUS)
 *   const responseBody = await response.text()
 *   await IdempotencyHelper.store(request, responseBody, STATUS)
 *   return new Response(responseBody, { status: response.status, headers: { 'Content-Type': 'application/json' } })
 *
 * Pattern AFTER (works in Turbopack):
 *   const responseBody = JSON.stringify(X)
 *   await IdempotencyHelper.store(request, responseBody, STATUS)
 *   return new Response(responseBody, { status: STATUS, headers: { 'Content-Type': 'application/json' } })
 */

import { readdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'

const API_DIR = 'src/app/api'

async function findFiles(dir: string): Promise<string[]> {
  const files: string[] = []
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await findFiles(fullPath))
    } else if (entry.name === 'route.ts') {
      const content = await readFile(fullPath, 'utf-8')
      if (content.includes('await response.text()') && content.includes('jsonResponse(')) {
        files.push(fullPath)
      }
    }
  }
  return files
}

async function fixFile(filePath: string): Promise<{ fixed: boolean; reason: string }> {
  const lines = (await readFile(filePath, 'utf-8')).split('\n')
  let modified = false

  for (let i = 0; i < lines.length; i++) {
    // Find: const responseBody = await response.text()
    if (lines[i].includes('const responseBody = await response.text()')) {
      // Look backward for: const response = jsonResponse(X, STATUS)
      // The jsonResponse call might span multiple lines
      let jsonResponseStart = -1
      for (let j = i - 1; j >= 0; j--) {
        if (lines[j].includes('const response = jsonResponse(')) {
          jsonResponseStart = j
          break
        }
        // Don't go too far back
        if (i - j > 20) break
      }

      if (jsonResponseStart === -1) {
        return { fixed: false, reason: 'Could not find jsonResponse call' }
      }

      // Extract the full jsonResponse call (might span multiple lines)
      // Find the closing ), STATUS) pattern
      let fullCall = ''
      let endLine = -1
      for (let j = jsonResponseStart; j < i; j++) {
        fullCall += lines[j] + '\n'
        // Check if this line has the closing pattern: ), STATUS)
        const match = lines[j].match(/,\s*(\d+)\)\s*$/)
        if (match) {
          endLine = j
          break
        }
        // Also check: }), STATUS) or })), STATUS)
        const match2 = lines[j].match(/,\s*(\d+)\)\s*\)?\s*$/)
        if (match2 && j > jsonResponseStart) {
          endLine = j
          break
        }
      }

      if (endLine === -1) {
        // Maybe it's on the same line as jsonResponseStart
        const sameLineMatch = lines[jsonResponseStart].match(/jsonResponse\((.+),\s*(\d+)\)/)
        if (sameLineMatch) {
          const dataArg = sameLineMatch[1]
          const status = sameLineMatch[2]

          // Replace: const response = jsonResponse(X, STATUS)
          // With: const responseBody = JSON.stringify(X)
          lines[jsonResponseStart] = lines[jsonResponseStart].replace(
            /const response = jsonResponse\((.+),\s*(\d+)\)/,
            'const responseBody = JSON.stringify($1)'
          )

          // Remove the `const responseBody = await response.text()` line
          lines[i] = ''

          // Replace `response.status` with STATUS in the return line
          for (let k = i + 1; k < Math.min(i + 5, lines.length); k++) {
            if (lines[k].includes('response.status')) {
              lines[k] = lines[k].replace(/response\.status/g, status)
            }
          }

          modified = true
          continue
        }
        return { fixed: false, reason: 'Could not find end of jsonResponse call' }
      }

      // Multi-line case: extract the data argument
      // The data argument is everything between `jsonResponse(` and `, STATUS)`
      const startLine = lines[jsonResponseStart]
      const startMatch = startLine.match(/const response = jsonResponse\((.*)/)
      if (!startMatch) {
        return { fixed: false, reason: 'Could not parse jsonResponse start' }
      }

      let dataArg = startMatch[1]

      // If single line (endLine === jsonResponseStart)
      if (endLine === jsonResponseStart) {
        const endMatch = dataArg.match(/(.+),\s*(\d+)\)/)
        if (endMatch) {
          dataArg = endMatch[1]
          const status = endMatch[2]

          lines[jsonResponseStart] = lines[jsonResponseStart].replace(
            /const response = jsonResponse\(.+,\s*(\d+)\)/,
            `const responseBody = JSON.stringify(${dataArg})`
          )
          lines[i] = ''

          for (let k = i + 1; k < Math.min(i + 5, lines.length); k++) {
            if (lines[k].includes('response.status')) {
              lines[k] = lines[k].replace(/response\.status/g, status)
            }
          }

          modified = true
          continue
        }
      }

      // Multi-line: collect data argument across lines
      // The data argument starts after `jsonResponse(` on jsonResponseStart line
      // and ends before `, STATUS)` on endLine
      const endLineContent = lines[endLine]
      const endMatch = endLineContent.match(/(.*),\s*(\d+)\)\s*\)?\s*$/)
      if (!endMatch) {
        return { fixed: false, reason: 'Could not parse jsonResponse end' }
      }

      const status = endMatch[2]

      // Build the data argument
      // Start: everything after `jsonResponse(` on startLine
      // Middle: all lines between start and end
      // End: everything before `, STATUS)` on endLine
      const startRemainder = startMatch[1] // after jsonResponse(
      const endRemainder = endMatch[1] // before , STATUS)

      // Collect middle lines
      let middleLines: string[] = []
      for (let j = jsonResponseStart + 1; j < endLine; j++) {
        middleLines.push(lines[j])
      }

      // Build the new JSON.stringify call
      let newCall: string
      if (middleLines.length === 0 && endLine === jsonResponseStart) {
        // Single line — already handled above
        continue
      } else if (middleLines.length === 0) {
        // Two lines: start and end
        newCall = `const responseBody = JSON.stringify(${startRemainder}${endRemainder})`
      } else {
        // Multi-line
        const indent = lines[jsonResponseStart].match(/^(\s*)/)?.[1] || ''
        newCall = `const responseBody = JSON.stringify(${startRemainder}\n${middleLines.join('\n')}\n${indent}${endRemainder})`
      }

      // Replace the jsonResponse lines
      lines[jsonResponseStart] = newCall
      // Remove middle lines and end line
      for (let j = jsonResponseStart + 1; j <= endLine; j++) {
        lines[j] = ''
      }
      // Remove the response.text() line
      lines[i] = ''

      // Replace response.status with STATUS
      for (let k = i + 1; k < Math.min(i + 5, lines.length); k++) {
        if (lines[k].includes('response.status')) {
          lines[k] = lines[k].replace(/response\.status/g, status)
        }
      }

      modified = true
    }
  }

  if (modified) {
    // Clean up empty lines (but don't remove all blank lines)
    const cleaned = lines.filter((line, idx) => {
      // Keep non-empty lines
      if (line.trim() !== '') return true
      // Keep empty lines that are between non-empty lines
      if (idx > 0 && idx < lines.length - 1) {
        if (lines[idx - 1].trim() !== '' || lines[idx + 1].trim() !== '') return true
      }
      return false
    })

    await writeFile(filePath, cleaned.join('\n'), 'utf-8')
    return { fixed: true, reason: 'Fixed' }
  }

  return { fixed: false, reason: 'No response.text() pattern found' }
}

async function main() {
  console.log('BUG-03 Fix v2: Replacing jsonResponse + response.text() with JSON.stringify()...\n')

  const files = await findFiles(API_DIR)
  console.log(`Found ${files.length} files with response.text() pattern\n`)

  let fixed = 0
  let failed = 0

  for (const file of files) {
    const result = await fixFile(file)
    if (result.fixed) {
      console.log(`  FIXED: ${file}`)
      fixed++
    } else {
      console.log(`  SKIP:  ${file} (${result.reason})`)
      failed++
    }
  }

  console.log(`\nDone: ${fixed} files fixed, ${failed} skipped`)
}

main().catch(console.error)
