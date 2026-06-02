import { ApiProperty } from '@nestjs/swagger';

export class SeedCreatedResponseDto {
  @ApiProperty({ example: 52, description: 'Número de eventos de métrica insertados' })
  created: number;
}

export class SeedSkippedResponseDto {
  @ApiProperty({ example: true, description: 'Indica que ya existían eventos y no se insertaron duplicados' })
  skipped: true;
}

export type SeedResponseDto = SeedCreatedResponseDto | SeedSkippedResponseDto;
