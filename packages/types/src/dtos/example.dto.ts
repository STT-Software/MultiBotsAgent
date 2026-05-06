/**
 * Ejemplo de DTO (Data Transfer Object).
 * Los DTOs definen la forma de los datos que viajan entre frontend y backend.
 * Reemplaza este archivo con los DTOs reales de tu aplicación.
 */
export interface CreateExampleDto {
  name: string;
  description?: string;
}

export interface ExampleResponseDto {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}
