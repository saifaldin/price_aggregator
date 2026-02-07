import { Module } from '@nestjs/common';
import { ProductStreamService } from './product-stream.service.js';

@Module({
  providers: [ProductStreamService],
  exports: [ProductStreamService],
})
export class ProductStreamModule {}
