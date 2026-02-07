import { Test, TestingModule } from '@nestjs/testing';
import { NormalizerService, ProviderKey } from './normalizer.service.js';

describe('NormalizerService', () => {
  let service: NormalizerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NormalizerService],
    }).compile();

    service = module.get<NormalizerService>(NormalizerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('provider-a', () => {
    const payload = [
      {
        id: 'ext-1',
        name: 'React Course',
        description: 'Learn React',
        price: 49.99,
        currency: 'USD',
        availability: true,
        lastUpdated: '2026-02-06T10:00:00.000Z',
      },
      {
        id: 'ext-2',
        name: 'Node.js Guide',
        price: 29.99,
        currency: 'EUR',
        availability: false,
        lastUpdated: '2026-02-06T09:00:00.000Z',
      },
    ];

    it('should normalize provider-a payload to NormalizedProduct[]', () => {
      const result = service.normalize(
        'provider-a' as ProviderKey,
        payload as unknown,
      );
      expect(result).toHaveLength(2);

      expect(result[0]).toMatchObject({
        externalId: 'ext-1',
        name: 'React Course',
        description: 'Learn React',
        currentPrice: 49.99,
        currency: 'USD',
        availability: true,
      });
      expect(result[0].lastUpdated).toEqual(
        new Date('2026-02-06T10:00:00.000Z'),
      );

      expect(result[1]).toMatchObject({
        externalId: 'ext-2',
        name: 'Node.js Guide',
        currentPrice: 29.99,
        currency: 'EUR',
        availability: false,
      });
      expect(result[1].description).toBeNull();
      expect(result[1].lastUpdated).toEqual(
        new Date('2026-02-06T09:00:00.000Z'),
      );
    });

    it('should handle empty array', () => {
      const result = service.normalize('provider-a' as ProviderKey, []);
      expect(result).toEqual([]);
    });
  });

  describe('provider-b', () => {
    const payload = [
      {
        productId: 'b-001',
        title: 'Software License',
        details: 'Annual license',
        cost: 199.99,
        currencyCode: 'USD',
        inStock: true,
        updatedAt: '2026-02-06T11:00:00.000Z',
      },
      {
        productId: 'b-002',
        title: 'Toolkit',
        cost: 0,
        currencyCode: 'GBP',
        inStock: false,
        updatedAt: '2026-02-05T12:00:00.000Z',
      },
    ];

    it('should normalize provider-b payload (cost, inStock, title)', () => {
      const result = service.normalize(
        'provider-b' as ProviderKey,
        payload as unknown,
      );
      expect(result).toHaveLength(2);

      expect(result[0]).toMatchObject({
        externalId: 'b-001',
        name: 'Software License',
        description: 'Annual license',
        currentPrice: 199.99,
        currency: 'USD',
        availability: true,
      });
      expect(result[0].lastUpdated).toEqual(
        new Date('2026-02-06T11:00:00.000Z'),
      );

      expect(result[1]).toMatchObject({
        externalId: 'b-002',
        name: 'Toolkit',
        currentPrice: 0,
        currency: 'GBP',
        availability: false,
      });
      expect(result[1].description).toBeNull();
    });
  });

  describe('provider-c', () => {
    const payload = [
      {
        identifier: 'c-id-1',
        info: { title: 'E-Book', summary: 'A great read' },
        pricing: { amount: 9.99, currency: 'USD' },
        stock: { available: true },
        metadata: { lastModified: 1738832400000 },
      },
      {
        identifier: 'c-id-2',
        info: { title: 'Course Only' },
        pricing: { amount: 59.99, currency: 'CAD' },
        stock: { available: false },
        metadata: { lastModified: 1738746000000 },
      },
    ];

    it('should normalize provider-c nested payload', () => {
      const result = service.normalize(
        'provider-c' as ProviderKey,
        payload as unknown,
      );
      expect(result).toHaveLength(2);

      expect(result[0]).toMatchObject({
        externalId: 'c-id-1',
        name: 'E-Book',
        description: 'A great read',
        currentPrice: 9.99,
        currency: 'USD',
        availability: true,
      });
      expect(result[0].lastUpdated).toEqual(new Date(1738832400000));

      expect(result[1]).toMatchObject({
        externalId: 'c-id-2',
        name: 'Course Only',
        currentPrice: 59.99,
        currency: 'CAD',
        availability: false,
      });
      expect(result[1].description).toBeNull();
      expect(result[1].lastUpdated).toEqual(new Date(1738746000000));
    });
  });

  describe('output shape', () => {
    it('should return objects with only NormalizedProduct fields', () => {
      const payload = [
        {
          id: 'x',
          name: 'N',
          price: 1,
          currency: 'USD',
          availability: true,
          lastUpdated: '2026-02-06T00:00:00.000Z',
        },
      ];
      const result = service.normalize(
        'provider-a' as ProviderKey,
        payload as unknown,
      );
      const keys = Object.keys(result[0]).sort();
      expect(keys).toEqual([
        'availability',
        'currency',
        'currentPrice',
        'description',
        'externalId',
        'lastUpdated',
        'name',
      ]);
    });
  });
});
