import { Injectable } from '@nestjs/common';

export type ProviderKey = 'provider-a' | 'provider-b' | 'provider-c';

export type NormalizedProduct = {
  externalId: string;
  name: string;
  description?: string | null;
  currentPrice: number;
  currency: string;
  availability: boolean;
  lastUpdated: Date;
};

type ProviderAProduct = {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  availability: boolean;
  lastUpdated: string;
};

type ProviderBProduct = {
  productId: string;
  title: string;
  details?: string;
  cost: number;
  currencyCode: string;
  inStock: boolean;
  updatedAt: string;
};

type ProviderCProduct = {
  identifier: string;
  info: { title: string; summary?: string };
  pricing: { amount: number; currency: string };
  stock: { available: boolean };
  metadata: { lastModified: number };
};

@Injectable()
export class NormalizerService {
  normalize(providerKey: ProviderKey, payload: unknown): NormalizedProduct[] {
    switch (providerKey) {
      case 'provider-a':
        return (payload as ProviderAProduct[]).map((p) => ({
          externalId: p.id,
          name: p.name,
          description: p.description ?? null,
          currentPrice: p.price,
          currency: p.currency,
          availability: p.availability,
          lastUpdated: new Date(p.lastUpdated),
        }));

      case 'provider-b':
        return (payload as ProviderBProduct[]).map((p) => ({
          externalId: p.productId,
          name: p.title,
          description: p.details ?? null,
          currentPrice: p.cost,
          currency: p.currencyCode,
          availability: p.inStock,
          lastUpdated: new Date(p.updatedAt),
        }));

      case 'provider-c':
        return (payload as ProviderCProduct[]).map((p) => ({
          externalId: p.identifier,
          name: p.info?.title,
          description: p.info?.summary ?? null,
          currentPrice: p.pricing?.amount,
          currency: p.pricing?.currency,
          availability: p.stock?.available,
          lastUpdated: new Date(p.metadata?.lastModified),
        }));
    }
  }
}
