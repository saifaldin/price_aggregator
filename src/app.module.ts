import 'dotenv/config';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AggregationModule } from './aggregation/aggregation.module.js';
import { AppController } from './app.controller.js';
import { ProductsModule } from './products/products.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    PrismaModule,
    ScheduleModule.forRoot(),
    AggregationModule,
    ProductsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
