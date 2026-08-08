import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { config } from "../config.js";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

function getKey(): Buffer {
  if (!config.encryptionKey || config.encryptionKey.length !== 64) {
    throw new Error("ENCRYPTION_KEY must be a 32-byte hex string (64 characters)");
  }
  return Buffer.from(config.encryptionKey, "hex");
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptSecret(payload: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(":");
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error("Invalid encrypted payload");
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(ivHex, "hex"),
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
