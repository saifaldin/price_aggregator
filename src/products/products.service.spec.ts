/* eslint-disable @typescript-eslint/unbound-method -- Jest expect(mock).toHaveBeenCalledWith is safe on jest.Mock */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: jest.fn(),
}));

// --- Mock providers ---
const providerA = {
  id: 'prov-a',
  name: 'provider-a',
  baseUrl: 'http://localhost:3001',
};
const providerB = {
  id: 'prov-b',
  name: 'provider-b',
  baseUrl: 'http://localhost:3002',
};
const providerC = {
  id: 'prov-c',
  name: 'provider-c',
  baseUrl: 'http://localhost:3003',
};

// --- Mock products with varied attributes for query-param tests ---
const reactCourse = {
  id: 'prod-react',
  externalId: 'ext-1',
  name: 'React Course',
  description: 'Learn React from scratch',
  currentPrice: { toString: () => '49.99' },
  currency: 'USD',
  availability: true,
  lastUpdated: new Date('2026-02-07T10:00:00.000Z'),
  isStale: false,
  providerId: providerA.id,
  provider: providerA,
};

const nodeGuide = {
  id: 'prod-node',
  externalId: 'ext-2',
  name: 'Node.js Guide',
  description: 'Backend with Node',
  currentPrice: { toString: () => '29.99' },
  currency: 'USD',
  availability: false,
  lastUpdated: new Date('2026-02-06T09:00:00.000Z'),
  isStale: false,
  providerId: providerA.id,
  provider: providerA,
};

const softwareLicense = {
  id: 'prod-software',
  externalId: 'ext-3',
  name: 'Software License',
  description: 'Annual license',
  currentPrice: { toString: () => '199.99' },
  currency: 'USD',
  availability: true,
  lastUpdated: new Date('2026-02-07T11:00:00.000Z'),
  isStale: false,
  providerId: providerB.id,
  provider: providerB,
};

const ebook = {
  id: 'prod-ebook',
  externalId: 'ext-4',
  name: 'E-Book Basics',
  description: 'Digital reading',
  currentPrice: { toString: () => '9.99' },
  currency: 'USD',
  availability: true,
  lastUpdated: new Date('2026-02-05T08:00:00.000Z'),
  isStale: false,
  providerId: providerC.id,
  provider: providerC,
};

const angularCourse = {
  id: 'prod-angular',
  externalId: 'ext-5',
  name: 'Angular Course',
  description: 'Enterprise frontend',
  currentPrice: { toString: () => '79.99' },
  currency: 'EUR',
  availability: false,
  lastUpdated: new Date('2026-02-06T14:00:00.000Z'),
  isStale: false,
  providerId: providerB.id,
  provider: providerB,
};

const vueIntro = {
  id: 'prod-vue',
  externalId: 'ext-6',
  name: 'Vue Intro',
  description: 'Vue 3 introduction',
  currentPrice: { toString: () => '19.99' },
  currency: 'USD',
  availability: true,
  lastUpdated: new Date('2026-02-07T09:00:00.000Z'),
  isStale: false,
  providerId: providerC.id,
  provider: providerC,
};

const allProducts = [
  reactCourse,
  nodeGuide,
  softwareLicense,
  ebook,
  angularCourse,
  vueIntro,
];

// Products that have price/availability changes after this timestamp (for /changes tests)
const RECENT_SINCE = '2026-02-07T00:00:00.000Z';
const recentChangeProductIds = [
  reactCourse.id,
  softwareLicense.id,
  vueIntro.id,
];
const recentChangeProducts = [reactCourse, softwareLicense, vueIntro];

const priceHistoryEntry = (productId: string, changedAt: Date) => ({
  id: `ph-${productId}`,
  price: { toString: () => '0' },
  currency: 'USD',
  changedAt,
  productId,
});

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrisma = {
      product: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      priceHistory: {
        groupBy: jest.fn().mockResolvedValue([]),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest
        .fn()
        .mockImplementation((promises: Promise<unknown>[]) =>
          Promise.all(promises),
        ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(ProductsService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProducts (GET /products)', () => {
    it('returns paginated products with default page and limit', async () => {
      (prisma.product.findMany as jest.Mock).mockResolvedValue(allProducts);
      (prisma.product.count as jest.Mock).mockResolvedValue(allProducts.length);

      const result = await service.getProducts({});

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result.data).toHaveLength(6);
      expect(result.meta).toEqual({
        total: 6,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('filters by name (case-insensitive contains)', async () => {
      (prisma.product.findMany as jest.Mock).mockResolvedValue([reactCourse]);
      (prisma.product.count as jest.Mock).mockResolvedValue(1);

      await service.getProducts({ name: 'React' });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            name: { contains: 'React', mode: 'insensitive' },
          },
        }),
      );
    });

    it('filters by availability true', async () => {
      const available = allProducts.filter((p) => p.availability);
      (prisma.product.findMany as jest.Mock).mockResolvedValue(available);
      (prisma.product.count as jest.Mock).mockResolvedValue(available.length);

      await service.getProducts({ availability: true });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ availability: true }),
        }),
      );
    });

    it('filters by availability false', async () => {
      const unavailable = allProducts.filter((p) => !p.availability);
      (prisma.product.findMany as jest.Mock).mockResolvedValue(unavailable);
      (prisma.product.count as jest.Mock).mockResolvedValue(unavailable.length);

      await service.getProducts({ availability: false });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ availability: false }),
        }),
      );
    });

    it('filters by minPrice and maxPrice', async () => {
      const inRange = [nodeGuide, ebook, vueIntro]; // 29.99, 9.99, 19.99
      (prisma.product.findMany as jest.Mock).mockResolvedValue(inRange);
      (prisma.product.count as jest.Mock).mockResolvedValue(3);

      await service.getProducts({ minPrice: 5, maxPrice: 50 });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            currentPrice: { gte: 5, lte: 50 },
          }),
        }),
      );
    });

    it('filters by provider name', async () => {
      const fromB = allProducts.filter((p) => p.providerId === providerB.id);
      (prisma.product.findMany as jest.Mock).mockResolvedValue(fromB);
      (prisma.product.count as jest.Mock).mockResolvedValue(fromB.length);

      await service.getProducts({ provider: 'provider-b' });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            provider: { name: 'provider-b' },
          }),
        }),
      );
    });

    it('combines name and price filters', async () => {
      (prisma.product.findMany as jest.Mock).mockResolvedValue([reactCourse]);
      (prisma.product.count as jest.Mock).mockResolvedValue(1);

      await service.getProducts({
        name: 'Course',
        minPrice: 40,
        maxPrice: 60,
      });

      const call = (prisma.product.findMany as jest.Mock).mock.calls[0][0];
      expect(call.where.name).toEqual({
        contains: 'Course',
        mode: 'insensitive',
      });
      expect(call.where.currentPrice).toEqual({ gte: 40, lte: 60 });
    });

    it('applies pagination (page and limit)', async () => {
      (prisma.product.findMany as jest.Mock).mockResolvedValue([
        softwareLicense,
        ebook,
      ]);
      (prisma.product.count as jest.Mock).mockResolvedValue(6);

      const result = await service.getProducts({ page: 2, limit: 2 });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 2,
          take: 2,
        }),
      );
      expect(result.meta).toEqual({
        total: 6,
        page: 2,
        limit: 2,
        totalPages: 3,
      });
    });
  });

  describe('getProductById (GET /products/:id)', () => {
    it('returns product with provider and price history when found', async () => {
      const withHistory = {
        ...reactCourse,
        priceHistory: [
          priceHistoryEntry(
            reactCourse.id,
            new Date('2026-02-07T10:00:00.000Z'),
          ),
        ],
      };
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(withHistory);

      const result = await service.getProductById(reactCourse.id);

      expect(prisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: reactCourse.id },
        include: {
          provider: true,
          priceHistory: {
            orderBy: { changedAt: 'desc' },
            take: 10,
          },
        },
      });
      expect(result).toEqual(withHistory);
    });

    it('throws NotFoundException when product does not exist', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getProductById('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getProductById('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(
        'Product with id "00000000-0000-0000-0000-000000000000" not found',
      );
    });
  });

  describe('getProductChanges (GET /products/changes)', () => {
    it('returns only products that have changes since the given timestamp', async () => {
      (prisma.priceHistory.groupBy as jest.Mock).mockResolvedValue(
        recentChangeProductIds.map((productId) => ({ productId })),
      );
      (prisma.priceHistory.findMany as jest.Mock).mockResolvedValue(
        recentChangeProductIds.map((productId) => ({ productId })),
      );
      (prisma.product.findMany as jest.Mock).mockResolvedValue(
        recentChangeProducts.map((p) => ({
          ...p,
          priceHistory: [
            priceHistoryEntry(p.id, new Date('2026-02-07T09:00:00.000Z')),
          ],
        })),
      );

      const result = await service.getProductChanges({
        since: RECENT_SINCE,
      });

      expect(prisma.$transaction).toHaveBeenCalled();
      const txCalls = (prisma.$transaction as jest.Mock).mock.calls[0][0];
      const groupByCall = txCalls[0];
      expect(groupByCall).toBeDefined();
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: recentChangeProductIds } },
          include: expect.objectContaining({
            provider: true,
            priceHistory: expect.objectContaining({
              where: { changedAt: { gt: new Date(RECENT_SINCE) } },
            }),
          }),
        }),
      );
      expect(result.data).toHaveLength(3);
      expect(result.meta.total).toBe(3);
    });

    it('returns empty data when no products have changes since timestamp', async () => {
      (prisma.priceHistory.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.priceHistory.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getProductChanges({
        since: '2026-02-08T00:00:00.000Z',
      });

      expect(result.data).toEqual([]);
      expect(result.meta).toEqual({
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
      expect(prisma.product.findMany).not.toHaveBeenCalled();
    });

    it('paginates changes (page and limit)', async () => {
      const twoIds = [reactCourse.id, softwareLicense.id];
      (prisma.priceHistory.groupBy as jest.Mock).mockResolvedValue(
        recentChangeProductIds.map((productId) => ({ productId })),
      );
      (prisma.priceHistory.findMany as jest.Mock).mockResolvedValue(
        twoIds.map((productId) => ({ productId })),
      );
      (prisma.product.findMany as jest.Mock).mockResolvedValue([
        reactCourse,
        softwareLicense,
      ]);

      await service.getProductChanges({
        since: RECENT_SINCE,
        page: 1,
        limit: 2,
      });

      expect(prisma.priceHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 2,
          where: { changedAt: { gt: new Date(RECENT_SINCE) } },
        }),
      );
    });

    it('includes only price history entries after since in returned products', async () => {
      (prisma.priceHistory.groupBy as jest.Mock).mockResolvedValue([
        { productId: reactCourse.id },
      ]);
      (prisma.priceHistory.findMany as jest.Mock).mockResolvedValue([
        { productId: reactCourse.id },
      ]);
      const recentHistory = [
        priceHistoryEntry(reactCourse.id, new Date('2026-02-07T10:00:00.000Z')),
      ];
      (prisma.product.findMany as jest.Mock).mockResolvedValue([
        { ...reactCourse, priceHistory: recentHistory },
      ]);

      const result = await service.getProductChanges({ since: RECENT_SINCE });

      expect(result.data[0].priceHistory).toEqual(recentHistory);
    });
  });
});
