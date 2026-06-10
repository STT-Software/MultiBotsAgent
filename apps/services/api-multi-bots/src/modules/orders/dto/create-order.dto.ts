import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsMongoId,
  IsEmail,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  IsEnum,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @ApiProperty({
    description: 'Nombre del producto o ítem.',
    example: 'Laptop Pro 15',
  })
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @ApiProperty({
    description: 'Precio unitario del ítem.',
    example: 1200.5,
  })
  @IsNumber()
  @Min(0)
  precioUnitario!: number;

  @ApiProperty({
    description: 'Cantidad de unidades compradas.',
    example: 2,
  })
  @IsNumber()
  @Min(1)
  cantidad!: number;

  @ApiProperty({
    description: 'Subtotal calculado para el ítem.',
    example: 2401.0,
  })
  @IsNumber()
  @Min(0)
  subtotal!: number;
}

export class CreateOrderDto {
  @ApiProperty({
    description: 'ID del agente que procesa el pedido.',
    example: '60d5ec49f1b29c3a388fbf01',
  })
  @IsMongoId()
  @IsNotEmpty()
  agentId!: string;

  @ApiProperty({
    description: 'Nombre completo del cliente final.',
    example: 'Juan Pérez',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  customerName!: string;

  @ApiProperty({
    description: 'Número de teléfono de WhatsApp del cliente final.',
    example: '+5491123456789',
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  customerPhone!: string;

  @ApiProperty({
    description: 'Correo electrónico del cliente.',
    example: 'juan.perez@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  customerEmail!: string;

  @ApiProperty({
    description: 'Lista de ítems incluidos en el pedido.',
    type: [OrderItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @ApiProperty({
    description: 'Total acumulado del pedido.',
    example: 2401.0,
  })
  @IsNumber()
  @Min(0)
  total!: number;

  @ApiProperty({
    description: 'Estado inicial del pedido.',
    example: 'pending_confirmation',
    enum: ['pending_confirmation', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'],
  })
  @IsEnum(['pending_confirmation', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'])
  @IsNotEmpty()
  status!: 'pending_confirmation' | 'confirmed' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';

  @ApiPropertyOptional({
    description: 'Notas o comentarios adicionales sobre el pedido.',
    example: 'Entregar después de las 5 PM.',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
