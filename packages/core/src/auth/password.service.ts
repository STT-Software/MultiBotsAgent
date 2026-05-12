/**
 * Servicio de hashing de contraseñas.
 *
 * Encapsula operaciones de hashing con bcryptjs (cost factor 12).
 * Compatible con Lambda sin binarios nativos.
 *
 * Este módulo es lógica pura sin dependencias de AWS.
 */
import bcrypt from 'bcryptjs';

/** Cost factor para bcrypt. Equilibrio entre seguridad y rendimiento en Lambda. */
const BCRYPT_COST_FACTOR = 12;

export class PasswordService {
  /**
   * Genera un hash bcrypt de la contraseña proporcionada.
   * @param plainPassword - Contraseña en texto plano
   * @returns Hash bcrypt con cost factor 12
   */
  async hash(plainPassword: string): Promise<string> {
    const salt = await bcrypt.genSalt(BCRYPT_COST_FACTOR);
    return bcrypt.hash(plainPassword, salt);
  }

  /**
   * Verifica que una contraseña en texto plano coincida con un hash bcrypt.
   * @param plainPassword - Contraseña en texto plano a verificar
   * @param hash - Hash bcrypt almacenado
   * @returns true si la contraseña coincide, false en caso contrario
   */
  async verify(plainPassword: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hash);
  }
}
