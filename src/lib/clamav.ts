/**
 * BISMARK ERP — File Virus Scanner (T-2-19)
 *
 * ClamAV integration for virus scanning uploaded files.
 *
 * In production: requires ClamAV daemon running (clamd) on tcp:3310 or unix socket.
 * In sandbox: falls back to "skip" mode (marks as clean) — LOG WARNING.
 *
 * Flow:
 *   1. File uploaded → /files POST
 *   2. File saved to temp storage
 *   3. Virus scan triggered (async)
 *   4. If clean: file published + virusScanStatus='clean'
 *   5. If infected: file quarantined + virusScanStatus='infected' + deleted
 */

import { logger } from '@/lib/logger'

const CLAMAV_HOST = process.env.CLAMAV_HOST || 'localhost'
const CLAMAV_PORT = parseInt(process.env.CLAMAV_PORT || '3310', 10)
const CLAMAV_ENABLED = process.env.CLAMAV_ENABLED === 'true'

// EICAR test signature for testing (standard anti-virus test file)
const EICAR_SIGNATURE = Buffer.from(
  'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*',
)

export interface ScanResult {
  status: 'clean' | 'infected' | 'skipped' | 'error'
  threat?: string
  scannedAt: Date
}

/**
 * Scan a file buffer for viruses.
 *
 * In sandbox mode (CLAMAV_ENABLED !== 'true'):
 *   - Checks for EICAR test signature (for testing)
 *   - Otherwise marks as 'skipped' (assumes clean)
 *
 * In production (CLAMAV_ENABLED === 'true'):
 *   - Connects to ClamAV daemon via INSTREAM protocol
 *   - Returns 'clean' or 'infected' with threat name
 */
export async function scanFile(
  fileBuffer: Buffer,
  fileName?: string,
): Promise<ScanResult> {
  const scannedAt = new Date()

  // Check for EICAR test file (works in all modes — for testing)
  if (fileBuffer.includes(EICAR_SIGNATURE)) {
    logger.warn({ fileName }, 'Virus detected: EICAR test file')
    return {
      status: 'infected',
      threat: 'EICAR-Test-Signature',
      scannedAt,
    }
  }

  if (!CLAMAV_ENABLED) {
    // Sandbox mode — skip ClamAV, log warning
    logger.debug({ fileName }, 'Virus scan skipped (CLAMAV_ENABLED not set)')
    return {
      status: 'skipped',
      scannedAt,
    }
  }

  // Production mode — connect to ClamAV daemon
  try {
    const result = await scanWithClamAv(fileBuffer)
    logger.info({ fileName, status: result.status }, 'File scanned with ClamAV')
    return result
  } catch (e) {
    logger.error({ err: e, fileName }, 'ClamAV scan failed')
    return {
      status: 'error',
      scannedAt,
    }
  }
}

/**
 * Connect to ClamAV daemon and scan file via INSTREAM protocol.
 * Requires clamd running on CLAMAV_HOST:CLAMAV_PORT.
 */
async function scanWithClamAv(fileBuffer: Buffer): Promise<ScanResult> {
  const { createConnection } = await import('net')

  return new Promise<ScanResult>((resolve) => {
    const socket = createConnection({ host: CLAMAV_HOST, port: CLAMAV_PORT }, () => {
      // Send INSTREAM command
      const command = Buffer.from('zINSTREAM\0', 'utf8')
      socket.write(command)

      // Send file in chunks
      const chunkSize = 4096
      let offset = 0

      function sendChunk() {
        if (offset >= fileBuffer.length) {
          // Send zero-length chunk to signal end
          const endHeader = Buffer.alloc(4)
          socket.write(endHeader)
          socket.end()
          return
        }

        const chunk = fileBuffer.subarray(offset, offset + chunkSize)
        const header = Buffer.alloc(4)
        header.writeUInt32BE(chunk.length, 0)
        socket.write(Buffer.concat([header, chunk]))
        offset += chunkSize
        sendChunk()
      }

      sendChunk()
    })

    let response = ''

    socket.on('data', (data) => {
      response += data.toString('utf8')
    })

    socket.on('end', () => {
      const scannedAt = new Date()
      if (response.includes('OK')) {
        resolve({ status: 'clean', scannedAt })
      } else if (response.includes('FOUND')) {
        const threatMatch = response.match(/(.+): (.+) FOUND/)
        resolve({
          status: 'infected',
          threat: threatMatch?.[2] || 'Unknown',
          scannedAt,
        })
      } else {
        resolve({ status: 'error', scannedAt })
      }
    })

    socket.on('error', () => {
      resolve({ status: 'error', scannedAt: new Date() })
    })

    // Timeout after 30s
    socket.setTimeout(30000)
    socket.on('timeout', () => {
      socket.destroy()
      resolve({ status: 'error', scannedAt: new Date() })
    })
  })
}

/**
 * Check if a file type is allowed for upload.
 * Defense in depth — don't rely solely on ClamAV.
 */
export function isAllowedFileType(mimeType: string, fileName: string): boolean {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    'application/zip',
  ]

  if (allowedMimeTypes.includes(mimeType)) return true

  // Check file extension as fallback
  const ext = fileName.split('.').pop()?.toLowerCase()
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'csv', 'zip']
  return allowedExtensions.includes(ext || '')
}

/**
 * Check if file size is within limits.
 */
export function isAllowedFileSize(sizeBytes: number): boolean {
  const MAX_SIZE = 10 * 1024 * 1024 // 10MB
  return sizeBytes > 0 && sizeBytes <= MAX_SIZE
}
