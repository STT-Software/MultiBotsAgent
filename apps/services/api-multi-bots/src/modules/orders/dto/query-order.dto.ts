import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsMongoId, IsEnum } from 'class-validator';

export class QueryOrderDto {
  @ApiPropertyOptional({
    description: 'Filtrar pedidos por el ID del agente que los gestionó.',
    example: '60d5ec49f1b29c3a388fbf01',
  })
  @IsMongoId()
  @IsOptional()
  agentId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar pedidos por el número de teléfono del cliente.',
    example: '+5491123456789',
  })
  @IsString()
  @IsOptional()
  customerPhone?: string;

  @ApiPropertyOptional({
    description: 'Filtrar pedidos por su estado actual.',
    example: 'pending_confirmation',
    enum: ['pending_confirmation', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'],
  })
  @IsEnum(['pending_confirmation', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'])
  @IsOptional()
  status?: 'pending_confirmation' | 'confirmed' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';
}
