import { Controller, Get, Param, Query, Sse } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Observable, map } from 'rxjs';
import { ProductStreamService } from '../product-stream/product-stream.service.js';
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
  constructor(
    private readonly productsService: ProductsService,
    private readonly productStream: ProductStreamService,
  ) {}

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
      'Server-Sent Events stream of product updates (new or changed price/availability).',
  })
  @Sse('stream')
  stream(): Observable<{ data: string }> {
    return this.productStream.getStream().pipe(
      map((product) => ({
        data: JSON.stringify(product),
      })),
    );
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
