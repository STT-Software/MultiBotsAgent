"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptToken = encryptToken;
exports.decryptToken = decryptToken;
const crypto_1 = require("crypto");
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 12 bytes for GCM
const AUTH_TAG_LENGTH = 16; // 16 bytes
/**
 * Cifra un Business Token usando AES-256-GCM.
 * Función pura: recibe el token y la clave, retorna el resultado cifrado.
 *
 * @param plainToken - Token en texto plano a cifrar (string no vacío)
 * @param encryptionKey - Clave de 32 bytes codificada en hex (64 chars) o base64
 * @returns Objeto con ciphertext, iv y tag codificados en Base64
 * @throws Error si la clave no tiene 32 bytes o el token está vacío
 */
function encryptToken(plainToken, encryptionKey) {
    if (!plainToken) {
        throw new Error("plainToken must be a non-empty string");
    }
    const key = deriveKeyBuffer(encryptionKey);
    const iv = (0, crypto_1.randomBytes)(IV_LENGTH);
    const cipher = (0, crypto_1.createCipheriv)(ALGORITHM, key, iv, {
        authTagLength: AUTH_TAG_LENGTH,
    });
    const encrypted = Buffer.concat([
        cipher.update(plainToken, "utf8"),
        cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return {
        ciphertext: encrypted.toString("base64"),
        iv: iv.toString("base64"),
        tag: tag.toString("base64"),
    };
}
/**
 * Descifra un Business Token cifrado con AES-256-GCM.
 * Función pura: recibe los componentes cifrados y la clave, retorna el token.
 *
 * @param encrypted - Objeto con ciphertext, iv y tag codificados en Base64
 * @param encryptionKey - Clave de 32 bytes codificada en hex (64 chars) o base64
 * @returns Token en texto plano
 * @throws Error si la clave es incorrecta, los datos están corruptos o la autenticación falla
 */
function decryptToken(encrypted, encryptionKey) {
    if (!encrypted || !encrypted.ciphertext || !encrypted.iv || !encrypted.tag) {
        throw new Error("encrypted must contain ciphertext, iv, and tag");
    }
    const key = deriveKeyBuffer(encryptionKey);
    const iv = Buffer.from(encrypted.iv, "base64");
    const tag = Buffer.from(encrypted.tag, "base64");
    const ciphertext = Buffer.from(encrypted.ciphertext, "base64");
    const decipher = (0, crypto_1.createDecipheriv)(ALGORITHM, key, iv, {
        authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
    ]);
    return decrypted.toString("utf8");
}
/**
 * Convierte la clave de cifrado (hex o base64) a un Buffer de 32 bytes.
 * Intenta primero hex (64 chars = 32 bytes), luego base64.
 *
 * @throws Error si la clave resultante no tiene exactamente 32 bytes
 */
function deriveKeyBuffer(encryptionKey) {
    if (!encryptionKey) {
        throw new Error("encryptionKey must be a non-empty string");
    }
    let key;
    // Try hex first (64 hex chars = 32 bytes)
    if (/^[0-9a-fA-F]{64}$/.test(encryptionKey)) {
        key = Buffer.from(encryptionKey, "hex");
    }
    else {
        // Try base64
        key = Buffer.from(encryptionKey, "base64");
    }
    if (key.length !== 32) {
        throw new Error(`encryptionKey must be 32 bytes (got ${key.length} bytes). Provide a 64-char hex string or a valid base64-encoded 32-byte key.`);
    }
    return key;
}
//# sourceMappingURL=token-encryption.js.map