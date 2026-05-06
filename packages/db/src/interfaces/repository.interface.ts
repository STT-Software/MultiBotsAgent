/**
 * Interfaz genérica de repositorio.
 * Define el contrato de acceso a datos que deben implementar todos los adaptadores.
 *
 * Los consumidores (apps/functions, apps/services) importan esta interfaz,
 * nunca un adaptador directamente. Esto permite cambiar el motor de BD
 * sin modificar el código consumidor.
 *
 * Implementaciones disponibles (en src/adapters/):
 * - mongodb/   → Para MongoDB / DocumentDB
 * - postgresql/ → Para PostgreSQL / Aurora Serverless
 * - dynamodb/  → Para DynamoDB
 */
export interface Repository<T> {
  findById(id: string): Promise<T | null>;
  findAll(filter?: Partial<T>): Promise<T[]>;
  create(entity: Omit<T, "id">): Promise<T>;
  update(id: string, entity: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
}
