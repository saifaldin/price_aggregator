/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/unbound-method -- test file: private methods and jest expect(mock) usage */
import { Test, TestingModule } from '@nestjs/testing';
import { AggregationService } from './aggregation.service.js';
import { NormalizerService } from './normalizer.service.js';
import { NormalizedProduct } from './normalizer.service.js';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: jest.fn(),
}));

jest.mock('../product-stream/product-stream.service', () => ({
  ProductStreamService: jest.fn(),
}));

import { PrismaService } from '../prisma/prisma.service.js';
import { ProductStreamService } from '../product-stream/product-stream.service.js';

const mockProviderId = 'provider-uuid-1';
const mockProvider = {
  id: mockProviderId,
  name: 'provider-a',
  baseUrl: 'http://localhost:3001',
};

const normalizedProduct: NormalizedProduct = {
  externalId: 'ext-1',
  name: 'Test Product',
  description: 'Desc',
  currentPrice: 49.99,
  currency: 'USD',
  availability: true,
  lastUpdated: new Date('2026-02-06T10:00:00.000Z'),
};

describe('AggregationService', () => {
  let service;
  let prisma: jest.Mocked<PrismaService>;
  let normalizer: jest.Mocked<NormalizerService>;
  let productStream: { emit: jest.Mock };

  beforeEach(async () => {
    const mockPrisma = {
      provider: {
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
      product: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    productStream = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AggregationService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: NormalizerService,
          useValue: {
            normalize: jest.fn().mockReturnValue([normalizedProduct]),
          },
        },
        {
          provide: ProductStreamService,
          useValue: productStream,
        },
      ],
    }).compile();

    service = module.get(AggregationService);
    prisma = module.get(PrismaService);
    normalizer = module.get(NormalizerService);

    (prisma.provider.findMany as jest.Mock).mockResolvedValue([mockProvider]);
    (prisma.provider.upsert as jest.Mock).mockResolvedValue({});
    (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.product.create as jest.Mock).mockResolvedValue({
      id: 'product-1',
      ...normalizedProduct,
      provider: mockProvider,
    });
    (prisma.product.update as jest.Mock).mockResolvedValue({
      id: 'product-1',
      provider: mockProvider,
    });
    (prisma.product.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

    const mockHttp = {
      get: jest.fn().mockResolvedValue({
        data: [
          {
            id: 'ext-1',
            name: 'Test Product',
            price: 49.99,
            currency: 'USD',
            availability: true,
            lastUpdated: '2026-02-06T10:00:00.000Z',
          },
        ],
      }),
    };
    service.http = mockHttp;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('aggregateOnce', () => {
    it('should fetch from active providers, normalize, upsert, and mark stale', async () => {
      await service.aggregateOnce('interval');

      expect(prisma.provider.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        select: { id: true, name: true, baseUrl: true },
      });
      expect(service.http.get).toHaveBeenCalledWith(
        'http://localhost:3001/products',
      );
      expect(normalizer.normalize).toHaveBeenCalledWith(
        'provider-a',
        expect.any(Array),
      );
      expect(prisma.product.findUnique).toHaveBeenCalled();
      expect(prisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            externalId: normalizedProduct.externalId,
            name: normalizedProduct.name,
            currentPrice: normalizedProduct.currentPrice,
            availability: normalizedProduct.availability,
            providerId: mockProviderId,
          }),
        }),
      );
      expect(prisma.product.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { lastUpdated: expect.any(Object) },
          data: { isStale: true },
        }),
      );
      expect(productStream.emit).toHaveBeenCalled();
    });

    it('should create product and emit when product does not exist', async () => {
      await service.aggregateOnce('interval');

      expect(prisma.product.create).toHaveBeenCalled();
      expect(productStream.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'product-1',
          provider: mockProvider,
        }),
      );
    });

    it('should update product and add price history when price changes', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue({
        id: 'product-1',
        currentPrice: { toString: () => '29.99' },
        currency: 'USD',
        availability: true,
      });

      await service.aggregateOnce('interval');

      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currentPrice: 49.99,
            priceHistory: {
              create: {
                price: 49.99,
                currency: 'USD',
                changedAt: normalizedProduct.lastUpdated,
              },
            },
          }),
        }),
      );
      expect(productStream.emit).toHaveBeenCalled();
    });

    it('should update product without price history when price unchanged', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue({
        id: 'product-1',
        currentPrice: { toString: () => '49.99' },
        currency: 'USD',
        availability: true,
      });

      await service.aggregateOnce('interval');

      const updateMock = prisma.product.update as jest.Mock;
      const updateCall = updateMock.mock.calls[0][0];
      expect(updateCall.data).not.toHaveProperty('priceHistory');
      expect(productStream.emit).not.toHaveBeenCalled();
    });

    it('should continue with other providers when one fetch fails', async () => {
      service.http.get = jest
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          data: [
            {
              id: 'ext-2',
              name: 'P2',
              price: 10,
              currency: 'USD',
              availability: true,
              lastUpdated: '2026-02-06T10:00:00.000Z',
            },
          ],
        });

      (prisma.provider.findMany as jest.Mock).mockResolvedValue([
        mockProvider,
        {
          id: 'provider-2',
          name: 'provider-a',
          baseUrl: 'http://localhost:3002',
        },
      ]);
      normalizer.normalize.mockReturnValue([normalizedProduct]);

      await service.aggregateOnce('interval');

      expect(prisma.product.create).toHaveBeenCalled();
      expect(prisma.product.updateMany).toHaveBeenCalled();
    });

    it('should call markStaleProducts even when no providers return data', async () => {
      (prisma.provider.findMany as jest.Mock).mockResolvedValue([]);

      await service.aggregateOnce('interval');

      expect(prisma.product.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.any(Object),
          data: { isStale: true },
        }),
      );
    });
  });

  describe('seedDatabaseWithProviderData', () => {
    it('should upsert all providers on init', async () => {
      await service.seedDatabaseWithProviderData();

      expect(prisma.provider.upsert).toHaveBeenCalledTimes(3);
      expect(prisma.provider.upsert).toHaveBeenCalledWith({
        where: { name: 'provider-a' },
        create: expect.objectContaining({ name: 'provider-a', isActive: true }),
        update: expect.objectContaining({ baseUrl: expect.any(String) }),
      });
    });
  });
});
