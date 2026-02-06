import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service.js';
import {
  PaginatedProductChangesResponseDto,
  PaginatedProductsResponseDto,
  ProductChangesQueryDto,
  ProductWithHistoryDto,
  ProductsQueryDto,
} from './dto/products.dto.js';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @ApiOkResponse({
    description: 'Returns a paginated list of products with provider data.',
    type: PaginatedProductsResponseDto,
  })
  @Get()
  async findAll(@Query() query: ProductsQueryDto) {
    return this.productsService.getProducts(query);
  }

  @ApiOkResponse({
    description:
      'Returns products that have price or availability changes since the given timestamp.',
    type: PaginatedProductChangesResponseDto,
  })
  @Get('changes')
  async findChanges(@Query() query: ProductChangesQueryDto) {
    return this.productsService.getProductChanges(query);
  }

  @ApiOkResponse({
    description:
      'Returns a single product with its provider and price history.',
    type: ProductWithHistoryDto,
  })
  @ApiNotFoundResponse({
    description: 'Product with the given id was not found.',
  })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.productsService.getProductById(id);
  }
}
