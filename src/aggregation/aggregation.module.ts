import { Module } from '@nestjs/common';
import { ProductStreamModule } from '../product-stream/product-stream.module.js';
import { AggregationService } from './aggregation.service.js';
import { NormalizerService } from './normalizer.service.js';

@Module({
  imports: [ProductStreamModule],
  providers: [AggregationService, NormalizerService],
  exports: [AggregationService],
})
export class AggregationModule {}
