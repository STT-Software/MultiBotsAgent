import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
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
import { OrderItemDto } from './create-order.dto';

export class UpdateOrderDto {
  @ApiPropertyOptional({
    description: 'Nombre completo del cliente final.',
    example: 'Juan Pérez',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  customerName?: string;

  @ApiPropertyOptional({
    description: 'Número de teléfono de WhatsApp del cliente final.',
    example: '+5491123456789',
    maxLength: 20,
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  customerPhone?: string;

  @ApiPropertyOptional({
    description: 'Correo electrónico del cliente.',
    example: 'juan.perez@example.com',
  })
  @IsEmail()
  @IsOptional()
  customerEmail?: string;

  @ApiPropertyOptional({
    description: 'Lista de ítems incluidos en el pedido.',
    type: [OrderItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  @IsOptional()
  items?: OrderItemDto[];

  @ApiPropertyOptional({
    description: 'Total acumulado del pedido.',
    example: 2401.0,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  total?: number;

  @ApiPropertyOptional({
    description: 'Estado actual del pedido.',
    example: 'confirmed',
    enum: ['pending_confirmation', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'],
  })
  @IsEnum(['pending_confirmation', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'])
  @IsOptional()
  status?: 'pending_confirmation' | 'confirmed' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';

  @ApiPropertyOptional({
    description: 'Notas o comentarios adicionales sobre el pedido.',
    example: 'Entregar después de las 5 PM.',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
