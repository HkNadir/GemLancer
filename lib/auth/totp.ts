/**
 * GemLancer — TOTP 2FA helpers (server-side only)
 * Uses otplib (RFC 6238 TOTP) + qrcode for QR generation.
 * Never call these functions from client components.
 */

import { authenticator } from 'otplib'
import QRCode from 'qrcode'

// ── Configuration ─────────────────────────────────────────────

// ±1 step tolerance = accepts codes from 30s before / after current window.
// Balances security vs usability for slight clock drift.
authenticator.options = {
  digits: 6,
  step: 30,
  window: 1,
}

const ISSUER = 'GemLancer'

// ── Secret generation ─────────────────────────────────────────

/**
 * Generates a cryptographically random 32-byte base32 TOTP secret.
 * Store this (encrypted or with DB-at-rest encryption) in users.totp_secret.
 */
export function generateTOTPSecret(): string {
  return authenticator.generateSecret(32)
}

// ── Verification ──────────────────────────────────────────────

/**
 * Verifies a 6-digit TOTP code against the stored secret.
 * Returns true if valid within the configured time window.
 */
export function verifyTOTPCode(secret: string, token: string): boolean {
  // Strip spaces/dashes that some authenticator apps add
  const cleanToken = token.replace(/[\s-]/g, '')
  if (!/^\d{6}$/.test(cleanToken)) return false

  try {
    return authenticator.verify({ token: cleanToken, secret })
  } catch {
    return false
  }
}

// ── QR Code generation ────────────────────────────────────────

/**
 * Builds the otpauth:// URI that authenticator apps (Google Authenticator,
 * Authy, 1Password, etc.) use to import the secret.
 */
export function generateOTPAuthUri(email: string, secret: string): string {
  return authenticator.keyuri(email, ISSUER, secret)
}

/**
 * Converts an otpauth URI into a base64 PNG data URL.
 * Returns something like "data:image/png;base64,..." suitable for <img src>.
 * Runs server-side only — the secret never touches the client.
 */
export async function generateQRCodeDataUrl(uri: string): Promise<string> {
  return QRCode.toDataURL(uri, {
    width: 200,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  })
}
