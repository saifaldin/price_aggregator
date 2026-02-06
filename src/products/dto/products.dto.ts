import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';

export class ProductsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by product name (case-insensitive, substring match)',
    example: 'React course',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Minimum current price filter',
    minimum: 0,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({
    description: 'Maximum current price filter',
    minimum: 0,
    example: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({
    description:
      'Filter by availability; accepts "true"/"false" or boolean values',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    if (typeof value === 'boolean') {
      return value;
    }
    return value === 'true';
  })
  @IsBoolean()
  availability?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by provider name',
    example: 'Provider A',
  })
  @IsOptional()
  @IsString()
  provider?: string;
}

export class ProductChangesQueryDto extends PaginationQueryDto {
  @ApiProperty({
    description:
      'Return products with price/availability changes since this timestamp (ISO 8601)',
    example: '2026-02-06T09:00:00.000Z',
  })
  @IsDateString()
  since!: string;
}

export class ProviderDto {
  @ApiProperty({ description: 'Provider ID', example: 'prov_123' })
  id!: string;

  @ApiProperty({ description: 'Provider name', example: 'Provider A' })
  name!: string;

  @ApiProperty({
    description: 'Base URL of the provider API',
    example: 'https://provider-a.example.com',
  })
  baseUrl!: string;

  @ApiProperty({
    description: 'Whether the provider is active',
    example: true,
  })
  isActive!: boolean;
}

export class ProductDto {
  @ApiProperty({ description: 'Product ID', example: 'prod_123' })
  id!: string;

  @ApiProperty({
    description: 'External product identifier from the provider',
    example: 'EXT-001',
  })
  externalId!: string;

  @ApiProperty({ description: 'Product name', example: 'React Course' })
  name!: string;

  @ApiPropertyOptional({
    description: 'Product description',
    example: 'A complete React course for beginners.',
  })
  description?: string | null;

  @ApiProperty({
    description: 'Current product price',
    example: 49.99,
    type: Number,
  })
  currentPrice!: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'USD',
  })
  currency!: string;

  @ApiProperty({
    description: 'Whether the product is currently available',
    example: true,
  })
  availability!: boolean;

  @ApiProperty({
    description: 'Timestamp of the last successful update',
    example: '2026-02-06T09:30:00.000Z',
    format: 'date-time',
  })
  lastUpdated!: string;

  @ApiProperty({
    description: 'Whether the product data is considered stale',
    example: false,
  })
  isStale!: boolean;

  @ApiProperty({
    description: 'Provider that this product belongs to',
    type: () => ProviderDto,
  })
  provider!: ProviderDto;
}

export class PriceHistoryDto {
  @ApiProperty({ description: 'Price history ID', example: 'ph_123' })
  id!: string;

  @ApiProperty({
    description: 'Price at this point in history',
    example: 39.99,
    type: Number,
  })
  price!: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'USD',
  })
  currency!: string;

  @ApiProperty({
    description: 'When this price became effective',
    example: '2026-02-06T08:00:00.000Z',
    format: 'date-time',
  })
  changedAt!: string;
}

export class ProductWithHistoryDto extends ProductDto {
  @ApiProperty({
    description: 'Recent price history for the product',
    type: () => [PriceHistoryDto],
  })
  priceHistory!: PriceHistoryDto[];
}

export class PaginationMetaDto {
  @ApiProperty({ description: 'Total number of matching items', example: 42 })
  total!: number;

  @ApiProperty({ description: 'Current page number (1-based)', example: 1 })
  page!: number;

  @ApiProperty({ description: 'Items per page', example: 20 })
  limit!: number;

  @ApiProperty({ description: 'Total number of pages', example: 3 })
  totalPages!: number;
}

export class PaginatedProductsResponseDto {
  @ApiProperty({
    description: 'Current page of products',
    type: () => [ProductDto],
  })
  data!: ProductDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: () => PaginationMetaDto,
  })
  meta!: PaginationMetaDto;
}

export class PaginatedProductChangesResponseDto {
  @ApiProperty({
    description:
      'Products that have price or availability changes since the given timestamp',
    type: () => [ProductWithHistoryDto],
  })
  data!: ProductWithHistoryDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: () => PaginationMetaDto,
  })
  meta!: PaginationMetaDto;
}
