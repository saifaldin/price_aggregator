jest.mock('../src/prisma/prisma.service', () => ({
  PrismaService: class {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AggregationService } from '../src/aggregation/aggregation.service.js';

const mockProvider = {
  id: 'provider-e2e-1',
  name: 'provider-a',
  baseUrl: 'http://localhost:3001',
};

const mockProduct = {
  id: 'product-e2e-1',
  externalId: 'ext-e2e',
  name: 'E2E Test Product',
  description: 'For integration tests',
  currentPrice: { toString: () => '29.99' },
  currency: 'USD',
  availability: true,
  lastUpdated: new Date('2026-02-06T10:00:00.000Z'),
  isStale: false,
  providerId: mockProvider.id,
  provider: mockProvider,
};

const mockPriceHistory = [
  {
    id: 'ph-1',
    price: { toString: () => '29.99' },
    currency: 'USD',
    changedAt: new Date('2026-02-06T10:00:00.000Z'),
    productId: mockProduct.id,
  },
];

function createMockPrisma() {
  const products = [mockProduct];
  return {
    provider: {
      findMany: () => Promise.resolve([mockProvider]),
      upsert: () => Promise.resolve(mockProvider),
    },
    product: {
      findMany: () => Promise.resolve(products),
      findUnique: (args: { where: { id: string } }) =>
        args.where.id === mockProduct.id
          ? Promise.resolve({ ...mockProduct, priceHistory: mockPriceHistory })
          : Promise.resolve(null),
      create: () => Promise.resolve(mockProduct),
      update: () => Promise.resolve(mockProduct),
      updateMany: () => Promise.resolve({ count: 0 }),
      count: () => Promise.resolve(products.length),
    },
    priceHistory: {
      groupBy: () => Promise.resolve([{ productId: mockProduct.id }]),
      findMany: () => Promise.resolve(mockPriceHistory),
    },
    $transaction: (promises: Promise<unknown>[]) => Promise.all(promises),
  };
}

describe('Products API (e2e)', () => {
  let app: INestApplication;
  const mockPrisma = createMockPrisma();

  beforeAll(async () => {
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

  afterAll(async () => {
    await app.close();
  });

  describe('GET /products', () => {
    it('should return 200 and paginated products with meta', () => {
      return request(app.getHttpServer())
        .get('/products')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('meta');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.meta).toMatchObject({
            total: expect.any(Number),
            page: expect.any(Number),
            limit: expect.any(Number),
            totalPages: expect.any(Number),
          });
        });
    });

    it('should accept query params name, minPrice, maxPrice, availability, provider, page, limit', () => {
      return request(app.getHttpServer())
        .get('/products')
        .query({ name: 'E2E', page: 1, limit: 10 })
        .expect(200)
        .expect((res) => {
          expect(res.body.meta.limit).toBe(10);
          expect(res.body.meta.page).toBe(1);
        });
    });
  });

  describe('GET /products/changes', () => {
    it('should return 200 and require since query param', () => {
      return request(app.getHttpServer())
        .get('/products/changes')
        .query({ since: '2026-02-06T09:00:00.000Z' })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('meta');
        });
    });

    it('should return 400 when since is missing', () => {
      return request(app.getHttpServer()).get('/products/changes').expect(400);
    });
  });

  describe('GET /products/:id', () => {
    it('should return 200 and product with provider and price history when found', () => {
      return request(app.getHttpServer())
        .get(`/products/${mockProduct.id}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toMatchObject({
            id: mockProduct.id,
            name: mockProduct.name,
            externalId: mockProduct.externalId,
          });
          expect(res.body).toHaveProperty('provider');
          expect(res.body).toHaveProperty('priceHistory');
        });
    });

    it('should return 404 when product does not exist', () => {
      return request(app.getHttpServer())
        .get('/products/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });
});
