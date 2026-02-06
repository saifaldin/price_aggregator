import { Module } from '@nestjs/common';
import { AggregationService } from './aggregation.service.js';
import { NormalizerService } from './normalizer.service.js';

@Module({
  providers: [AggregationService, NormalizerService],
  exports: [AggregationService],
})
export class AggregationModule {}
