import type { EncryptedToken } from "@multibotagents/types";
/**
 * Cifra un Business Token usando AES-256-GCM.
 * Función pura: recibe el token y la clave, retorna el resultado cifrado.
 *
 * @param plainToken - Token en texto plano a cifrar (string no vacío)
 * @param encryptionKey - Clave de 32 bytes codificada en hex (64 chars) o base64
 * @returns Objeto con ciphertext, iv y tag codificados en Base64
 * @throws Error si la clave no tiene 32 bytes o el token está vacío
 */
export declare function encryptToken(plainToken: string, encryptionKey: string): EncryptedToken;
/**
 * Descifra un Business Token cifrado con AES-256-GCM.
 * Función pura: recibe los componentes cifrados y la clave, retorna el token.
 *
 * @param encrypted - Objeto con ciphertext, iv y tag codificados en Base64
 * @param encryptionKey - Clave de 32 bytes codificada en hex (64 chars) o base64
 * @returns Token en texto plano
 * @throws Error si la clave es incorrecta, los datos están corruptos o la autenticación falla
 */
export declare function decryptToken(encrypted: EncryptedToken, encryptionKey: string): string;
//# sourceMappingURL=token-encryption.d.ts.map