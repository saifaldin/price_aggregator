import { Module } from '@nestjs/common';
import { ProductStreamModule } from '../product-stream/product-stream.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';

@Module({
  imports: [PrismaModule, ProductStreamModule],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
