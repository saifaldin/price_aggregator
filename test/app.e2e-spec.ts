jest.mock('../src/prisma/prisma.service', () => ({
  PrismaService: class {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AggregationService } from '../src/aggregation/aggregation.service.js';

const mockPrisma = {
  provider: {
    findMany: () => Promise.resolve([]),
    upsert: () => Promise.resolve({}),
  },
  product: {
    findMany: () => Promise.resolve([]),
    findUnique: () => Promise.resolve(null),
    create: () => Promise.resolve({}),
    update: () => Promise.resolve({}),
    updateMany: () => Promise.resolve({ count: 0 }),
    count: () => Promise.resolve(0),
  },
  priceHistory: {
    groupBy: () => Promise.resolve([]),
    findMany: () => Promise.resolve([]),
  },
  $transaction: (promises: Promise<unknown>[]) => Promise.all(promises),
};

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideProvider(AggregationService)
      .useValue({
        onModuleInit: () => Promise.resolve(),
        scheduledAggregate: () => Promise.resolve(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();
  });

  it('/ (GET) serves the dashboard HTML', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Content-Type', /html/);
  });
});
