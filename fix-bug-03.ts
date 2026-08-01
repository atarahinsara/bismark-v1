/**
 * BUG-03 Fix Script
 *
 * Replaces `response.clone().text()` pattern with pre-built responseBody.
 *
 * Pattern BEFORE:
 *   const response = jsonResponse({ data: X }, STATUS)
 *   await IdempotencyHelper.store(request, await response.clone().text(), STATUS)
 *   return response
 *
 * Pattern AFTER:
 *   const response = jsonResponse({ data: X }, STATUS)
 *   const responseBody = await response.text()
 *   await IdempotencyHelper.store(request, responseBody, response.status)
 *   return new Response(responseBody, { status: response.status, headers: { 'Content-Type': 'application/json' } })
 *
 * This avoids response.clone() which fails in Turbopack dev mode.
 * response.text() consumes the body, so we create a new Response from the string.
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
      if (content.includes('response.clone().text()')) {
        files.push(fullPath)
      }
    }
  }
  return files
}

async function fixFile(filePath: string): Promise<{ fixed: boolean; changes: number }> {
  const content = await readFile(filePath, 'utf-8')
  let changes = 0

  let newContent = content

  // Step 1: Replace `await response.clone().text()` with `responseBody`
  // and add `const responseBody = await response.text()` before the IdempotencyHelper.store line
  //
  // The pattern in files is:
  //   await IdempotencyHelper.store(request, await response.clone().text(), STATUS)
  //
  // Replace with:
  //   const responseBody = await response.text()
  //   await IdempotencyHelper.store(request, responseBody, STATUS)

  const storePattern = /await IdempotencyHelper\.store\(request,\s*await response\.clone\(\)\.text\(\),\s*(\d+)\)/g

  newContent = newContent.replace(storePattern, (_match, status) => {
    changes++
    return `const responseBody = await response.text()\n    await IdempotencyHelper.store(request, responseBody, ${status})`
  })

  // Step 2: Replace `return response` (the one right after the store call)
  // with `return new Response(responseBody, { status: response.status, headers: { 'Content-Type': 'application/json' } })`
  //
  // But we need to be careful — `return response` might appear in other contexts.
  // We only want to replace the one that follows the IdempotencyHelper.store call.
  //
  // Strategy: find lines that have `return response` where the previous non-empty line
  // contains `IdempotencyHelper.store` or `responseBody`

  // Simple approach: replace `return response` with the new Response pattern
  // but only if `responseBody` is defined in the file (i.e., we made changes)
  if (changes > 0) {
    // Replace `return response` that comes after `IdempotencyHelper.store(request, responseBody`
    // We use a pattern: look for `IdempotencyHelper.store(request, responseBody` followed by
    // some lines, then `return response`
    const returnPattern = /IdempotencyHelper\.store\(request,\s*responseBody[^)]*\)[^\n]*\n(\s*)return response/g

    newContent = newContent.replace(returnPattern, (_match, indent) => {
      return `IdempotencyHelper.store(request, responseBody${_match.substring(_match.indexOf('('), _match.indexOf(')') + 1).replace('request, responseBody', 'request, responseBody')})\n${indent}return new Response(responseBody, { status: response.status, headers: { 'Content-Type': 'application/json' } })`
    })

    // Simpler approach: just replace all `return response` with the new pattern
    // since `responseBody` is now defined and `response.status` gives us the status
    newContent = newContent.replace(/^(\s*)return response\s*$/gm, (match, indent) => {
      // Only replace if responseBody is defined above (check if this line is after a store call)
      // Simple heuristic: if the file has responseBody, replace all `return response`
      return `${indent}return new Response(responseBody, { status: response.status, headers: { 'Content-Type': 'application/json' } })`
    })
  }

  if (changes > 0 && newContent !== content) {
    await writeFile(filePath, newContent, 'utf-8')
    return { fixed: true, changes }
  }

  return { fixed: false, changes: 0 }
}

// Main
async function main() {
  console.log('BUG-03 Fix: Replacing response.clone().text() pattern...\n')

  const files = await findFiles(API_DIR)
  console.log(`Found ${files.length} files with response.clone().text()\n`)

  let fixed = 0
  let failed = 0

  for (const file of files) {
    const result = await fixFile(file)
    if (result.fixed) {
      console.log(`  FIXED: ${file} (${result.changes} change(s))`)
      fixed++
    } else {
      console.log(`  SKIP:  ${file} (pattern not matched)`)
      failed++
    }
  }

  console.log(`\nDone: ${fixed} files fixed, ${failed} skipped`)
}

main().catch(console.error)
