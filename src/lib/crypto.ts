/**
 * crypto.ts — Secure account recovery code generation & decoding.
 *
 * Recovery code format:
 *   CXv2.<base64url-salt>.<base64url-iv>.<base64url-ciphertext>
 *
 * Key derivation: PBKDF2-SHA256 with 310,000 iterations (NIST SP 800-132 recommended minimum for AES-256).
 * Encryption:     AES-256-GCM (provides both confidentiality + integrity/authentication).
 * The AES-GCM authentication tag (16 bytes) is appended to the ciphertext by WebCrypto automatically,
 * so any tampered code or wrong passphrase will throw a decryption error — no separate HMAC needed.
 */

const PBKDF2_ITERATIONS = 310_000;
const RECOVERY_PREFIX = "CXv2";

// ─── Utilities ────────────────────────────────────────────────────────────────

function toBase64Url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function fromBase64Url(str: string): Uint8Array {
  // Re-pad and convert URL-safe chars back
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveKey(passphrase: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generates a compact, URL-safe recovery code that encodes the user's secret uid
 * AND username, encrypted with the provided passphrase.
 *
 * New format (CXv3): CXv3.<salt>.<iv>.<ciphertext>
 *   The plaintext is JSON: { uid: string, username: string }
 *
 * Old format (CXv2) is still accepted for decoding (backward-compat).
 */
export async function generateRecoveryCode(uid: string, username: string, passphrase: string): Promise<string> {
  if (!passphrase || passphrase.trim().length < 8) {
    throw new Error("Passphrase must be at least 8 characters");
  }

  const salt = crypto.getRandomValues(new Uint8Array(16)) as Uint8Array<ArrayBuffer>;
  const iv = crypto.getRandomValues(new Uint8Array(12)) as Uint8Array<ArrayBuffer>;
  const key = await deriveKey(passphrase.trim(), salt);

  const enc = new TextEncoder();
  // Encrypt the uid AND username together so both are always recovered.
  const payload = JSON.stringify({ uid, username });
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(payload));

  return ["CXv3", toBase64Url(salt), toBase64Url(iv), toBase64Url(ciphertext)].join(".");
}

export interface DecodedRecovery {
  uid: string;
  username: string | null;
}

/**
 * Decodes a recovery code using the provided passphrase.
 * Returns { uid, username } on success.
 *   - CXv3 codes: both uid and username are returned from the code.
 *   - CXv2 codes (legacy, uid-only): username will be null.
 * Throws on wrong passphrase, tampered code, or invalid format.
 */
export async function decodeRecoveryCode(code: string, passphrase: string): Promise<DecodedRecovery> {
  const parts = code.trim().split(".");
  const prefix = parts[0];

  if (parts.length !== 4 || (prefix !== "CXv2" && prefix !== "CXv3")) {
    throw new Error("Invalid recovery code format");
  }

  if (!passphrase || passphrase.trim().length < 8) {
    throw new Error("Passphrase must be at least 8 characters");
  }

  let salt: Uint8Array<ArrayBuffer>, iv: Uint8Array<ArrayBuffer>, ciphertext: Uint8Array<ArrayBuffer>;
  try {
    salt = fromBase64Url(parts[1]) as Uint8Array<ArrayBuffer>;
    iv = fromBase64Url(parts[2]) as Uint8Array<ArrayBuffer>;
    ciphertext = fromBase64Url(parts[3]) as Uint8Array<ArrayBuffer>;
  } catch {
    throw new Error("Malformed recovery code — characters may be corrupted");
  }

  const key = await deriveKey(passphrase.trim(), salt);

  let decrypted: ArrayBuffer;
  try {
    decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  } catch {
    throw new Error("Wrong passphrase or corrupted recovery code");
  }

  const plaintext = new TextDecoder().decode(decrypted);

  if (prefix === "CXv3") {
    // New format: plaintext is JSON { uid, username }
    try {
      const parsed = JSON.parse(plaintext) as { uid: string; username: string };
      if (!parsed.uid) throw new Error("Missing uid in recovery payload");
      return { uid: parsed.uid, username: parsed.username ?? null };
    } catch {
      throw new Error("Corrupted recovery code payload");
    }
  }

  // CXv2 legacy: plaintext was just the uid string
  return { uid: plaintext, username: null };
}


// ─── Passphrase strength helper ───────────────────────────────────────────────

export type PassphraseStrength = "empty" | "weak" | "fair" | "strong" | "excellent";

export interface PassphraseStrengthResult {
  strength: PassphraseStrength;
  score: number; // 0–4
  label: string;
  color: string;
}

export function evaluatePassphrase(passphrase: string): PassphraseStrengthResult {
  if (!passphrase) return { strength: "empty", score: 0, label: "", color: "" };

  let score = 0;
  if (passphrase.length >= 8) score++;
  if (passphrase.length >= 14) score++;
  if (/[A-Z]/.test(passphrase) && /[a-z]/.test(passphrase)) score++;
  if (/[0-9]/.test(passphrase)) score++;
  if (/[^a-zA-Z0-9]/.test(passphrase)) score++;

  const map: Record<number, Omit<PassphraseStrengthResult, "score">> = {
    0: { strength: "weak", label: "Too weak", color: "#ef4444" },
    1: { strength: "weak", label: "Weak", color: "#f97316" },
    2: { strength: "fair", label: "Fair", color: "#eab308" },
    3: { strength: "strong", label: "Strong", color: "#22c55e" },
    4: { strength: "strong", label: "Strong", color: "#22c55e" },
    5: { strength: "excellent", label: "Excellent", color: "#10b981" },
  };

  return { score, ...map[Math.min(score, 5)] };
}
