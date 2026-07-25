/**
 * Notification Channel Providers (LAW-56)
 * =======================================
 *
 * Sandbox-safe stub implementations of every channel provider the
 * BISMARK ERP Notification Context will use in production:
 *
 *   email    → smtp (default), ses, sendgrid
 *   sms      → kavenegar (default), melipayamak, twilio
 *   whatsapp → evolution (default), meta_cloud
 *   push     → firebase
 *   inapp    → inapp_db (the Notification row IS the in-app message — no send needed)
 *
 * Why "sandbox-safe"?
 *   In the sandbox (Next.js + SQLite, no real SMTP/SMS gateway) we cannot
 *   actually deliver messages. Each provider:
 *     1. Logs the would-be send to console (with [notification] prefix)
 *     2. Returns success after a small artificial delay (10–50 ms)
 *     3. Returns failure ~10% of the time using a DETERMINISTIC hash of
 *        `to + body` — so retry / DLQ behaviour is reproducible in tests.
 *
 * In production these classes are swapped for real SDK adapters that
 * share the same `ChannelProvider` interface (LAW-56: channel-agnostic).
 *
 * Architecture laws:
 *   LAW-56: Notification Delivery Must Be Channel-Agnostic
 *   LAW-57: Notification Delivery Must Be Retryable And Idempotent (retry exercised here)
 */

import type {
  Channel,
  ChannelProvider,
  ChannelSendInput,
  ChannelSendResult,
} from './types'

// ============================================================
// Deterministic failure oracle (10% threshold)
// ============================================================

/**
 * Compute a deterministic 16-bit hash of `to + body`.
 *
 * Why not Math.random()?  Because the retry engine's behaviour must be
 * reproducible — same notification + same recipient always trips the
 * same failure/success pattern, so tests and audits line up.
 *
 * Uses FNV-1a (fast, well-distributed for short strings). We then take
 * the last byte (0..255) and check if it falls in the lowest 10% (~25/255).
 */
function failureHash(to: string, body: string): number {
  const src = `${to}||${body}`
  let hash = 0x811c9dc5 // FNV-1a 32-bit offset basis
  for (let i = 0; i < src.length; i++) {
    hash ^= src.charCodeAt(i)
    // FNV prime (32-bit): 0x01000193
    hash = Math.imul(hash, 0x01000193)
  }
  // Return only the lowest 8 bits → 0..255
  return hash & 0xff
}

/** True ~10% of the time, deterministically for a given (to, body). */
function shouldFailDeterministically(to: string, body: string): boolean {
  // 0..25 (inclusive) ≈ 26/256 ≈ 10.16% of the keyspace
  return failureHash(to, body) < 26
}

// ============================================================
// Shared helper — simulated network delay + result assembly
// ============================================================

/** Random integer in [min, max] inclusive. */
function randomDelayMs(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1))
}

/**
 * Run a "send" simulation shared by all real-network providers
 * (smtp / ses / sendgrid / kavenegar / melipayamak / twilio / evolution /
 * meta_cloud / firebase).
 *
 * The inapp_db provider is special and does NOT use this — it always
 * succeeds because the Notification row IS the payload.
 */
async function simulateSend(
  providerName: string,
  channel: Channel,
  input: ChannelSendInput,
): Promise<ChannelSendResult> {
  const startedAt = Date.now()
  const delay = randomDelayMs(10, 50)

  // Log the would-be send so developers can see what would have happened.
  const preview = input.body.length > 120 ? input.body.slice(0, 120) + '…' : input.body
  console.log(
    `[notification] [${channel}/${providerName}] would send to="${input.to}"` +
      (input.subject ? ` subject="${input.subject}"` : '') +
      ` body="${preview}" (${delay}ms simulated)`,
  )

  // Simulate the network round-trip.
  await new Promise((resolve) => setTimeout(resolve, delay))

  // Deterministic failure oracle — exercises retry path.
  if (shouldFailDeterministically(input.to, input.body)) {
    const errorMessage = `simulated_${providerName}_transport_error`
    console.error(`[notification] [${channel}/${providerName}] SEND FAILED: ${errorMessage}`)
    return {
      success: false,
      errorMessage,
      providerResponse: { simulated: true, error: errorMessage },
      durationMs: Date.now() - startedAt,
    }
  }

  // Success.
  const messageId = `${providerName}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
  return {
    success: true,
    messageId,
    providerResponse: { simulated: true, delivered: true, messageId },
    durationMs: Date.now() - startedAt,
  }
}

// ============================================================
// Email providers
// ============================================================

class SmtpProvider implements ChannelProvider {
  name = 'smtp'
  channel: Channel = 'email'
  async send(input: ChannelSendInput): Promise<ChannelSendResult> {
    return simulateSend(this.name, this.channel, input)
  }
}

class SesProvider implements ChannelProvider {
  name = 'ses'
  channel: Channel = 'email'
  async send(input: ChannelSendInput): Promise<ChannelSendResult> {
    return simulateSend(this.name, this.channel, input)
  }
}

class SendgridProvider implements ChannelProvider {
  name = 'sendgrid'
  channel: Channel = 'email'
  async send(input: ChannelSendInput): Promise<ChannelSendResult> {
    return simulateSend(this.name, this.channel, input)
  }
}

// ============================================================
// SMS providers
// ============================================================

class KavenegarProvider implements ChannelProvider {
  name = 'kavenegar'
  channel: Channel = 'sms'
  async send(input: ChannelSendInput): Promise<ChannelSendResult> {
    return simulateSend(this.name, this.channel, input)
  }
}

class MelipayamakProvider implements ChannelProvider {
  name = 'melipayamak'
  channel: Channel = 'sms'
  async send(input: ChannelSendInput): Promise<ChannelSendResult> {
    return simulateSend(this.name, this.channel, input)
  }
}

class TwilioProvider implements ChannelProvider {
  name = 'twilio'
  channel: Channel = 'sms'
  async send(input: ChannelSendInput): Promise<ChannelSendResult> {
    return simulateSend(this.name, this.channel, input)
  }
}

// ============================================================
// WhatsApp providers
// ============================================================

class EvolutionProvider implements ChannelProvider {
  name = 'evolution'
  channel: Channel = 'whatsapp'
  async send(input: ChannelSendInput): Promise<ChannelSendResult> {
    return simulateSend(this.name, this.channel, input)
  }
}

class MetaCloudProvider implements ChannelProvider {
  name = 'meta_cloud'
  channel: Channel = 'whatsapp'
  async send(input: ChannelSendInput): Promise<ChannelSendResult> {
    return simulateSend(this.name, this.channel, input)
  }
}

// ============================================================
// Push providers
// ============================================================

class FirebaseProvider implements ChannelProvider {
  name = 'firebase'
  channel: Channel = 'push'
  async send(input: ChannelSendInput): Promise<ChannelSendResult> {
    return simulateSend(this.name, this.channel, input)
  }
}

// ============================================================
// In-App provider (special — no actual send)
// ============================================================

/**
 * In-app notifications need no transport: the Notification row itself
 * IS the payload that the front-end will fetch from the API.
 *
 * We still create a NotificationDelivery row (for audit) but always
 * succeed immediately and never trip the deterministic failure oracle.
 */
class InAppDbProvider implements ChannelProvider {
  name = 'inapp_db'
  channel: Channel = 'inapp'
  async send(input: ChannelSendInput): Promise<ChannelSendResult> {
    const startedAt = Date.now()
    console.log(
      `[notification] [inapp/inapp_db] in-app message stored for user="${input.to}"` +
        ` (Notification row IS the payload — no external send)`,
    )
    // No delay — there's nothing to "send".
    return {
      success: true,
      messageId: `inapp-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      providerResponse: { simulated: true, channel: 'inapp', delivered: true },
      durationMs: Date.now() - startedAt,
    }
  }
}

// ============================================================
// Provider registry
// ============================================================

const PROVIDERS: Record<Channel, Record<string, ChannelProvider>> = {
  email: {
    smtp: new SmtpProvider(),
    ses: new SesProvider(),
    sendgrid: new SendgridProvider(),
  },
  sms: {
    kavenegar: new KavenegarProvider(),
    melipayamak: new MelipayamakProvider(),
    twilio: new TwilioProvider(),
  },
  whatsapp: {
    evolution: new EvolutionProvider(),
    meta_cloud: new MetaCloudProvider(),
  },
  push: {
    firebase: new FirebaseProvider(),
  },
  inapp: {
    inapp_db: new InAppDbProvider(),
  },
}

/** Default provider name per channel. */
export const DEFAULT_PROVIDERS: Record<Channel, string> = {
  email: 'smtp',
  sms: 'kavenegar',
  whatsapp: 'evolution',
  push: 'firebase',
  inapp: 'inapp_db',
}

/**
 * Resolve a channel provider by name.
 *
 * - If `providerName` is omitted, returns the channel's default provider.
 * - If `providerName` is unknown for the channel, falls back to the default
 *   and logs a warning (LAW-56: never block delivery on a config typo).
 */
export function getProvider(channel: Channel, providerName?: string): ChannelProvider {
  const channelRegistry = PROVIDERS[channel]
  if (!channelRegistry) {
    // Defensive — Channel is a closed union, so this should never happen.
    throw new Error(`[notification] unknown channel: ${channel}`)
  }

  if (providerName && channelRegistry[providerName]) {
    return channelRegistry[providerName]
  }

  if (providerName && !channelRegistry[providerName]) {
    console.warn(
      `[notification] provider "${providerName}" not registered for channel ` +
        `"${channel}" — falling back to default "${DEFAULT_PROVIDERS[channel]}"`,
    )
  }

  const defaultName = DEFAULT_PROVIDERS[channel]
  return channelRegistry[defaultName]
}

/**
 * List all registered provider names for a channel — useful for admin
 * UIs and for routing-rule validation.
 */
export function listProviders(channel: Channel): string[] {
  return Object.keys(PROVIDERS[channel] ?? {})
}
