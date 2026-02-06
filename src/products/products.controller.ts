import { Controller, Get, Param, Query } from '@nestjs/common';
import { ProductsService } from './products.service.js';
import {
  ProductChangesQueryDto,
  ProductsQueryDto,
} from './dto/products.dto.js';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async findAll(@Query() query: ProductsQueryDto) {
    return this.productsService.getProducts(query);
  }

  @Get('changes')
  async findChanges(@Query() query: ProductChangesQueryDto) {
    return this.productsService.getProductChanges(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.productsService.getProductById(id);
  }
}
