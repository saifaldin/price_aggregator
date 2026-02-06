import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import moment from 'moment';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  NormalizedProduct,
  NormalizerService,
  ProviderKey,
} from './normalizer.service.js';

const FETCH_INTERVAL_MS = Number(process.env.FETCH_INTERVAL_MS ?? 10000);

type ProviderSeed = {
  name: ProviderKey;
  baseUrl: string;
};

@Injectable()
export class AggregationService implements OnModuleInit {
  private readonly logger = new Logger(AggregationService.name);
  private readonly http: AxiosInstance;
  private readonly staleThresholdMs = Number(
    process.env.STALE_THRESHOLD_MS ?? 60000,
  );

  private readonly providers: ProviderSeed[] = [
    {
      name: 'provider-a',
      baseUrl: process.env.PROVIDER_A_URL ?? 'http://localhost:3001',
    },
    {
      name: 'provider-b',
      baseUrl: process.env.PROVIDER_B_URL ?? 'http://localhost:3002',
    },
    {
      name: 'provider-c',
      baseUrl: process.env.PROVIDER_C_URL ?? 'http://localhost:3003',
    },
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly normalizer: NormalizerService,
  ) {
    this.http = axios.create({
      timeout: Number(process.env.PROVIDER_TIMEOUT_MS ?? 5000),
    });

    axiosRetry(this.http, {
      retries: 3,
      retryDelay: axiosRetry.linearDelay(1000),
    });
  }

  async onModuleInit() {
    await this.seedDatabaseWithProviderData();
    await this.aggregateOnce('startup');
  }

  @Interval(FETCH_INTERVAL_MS)
  async scheduledAggregate() {
    await this.aggregateOnce('interval');
  }

  private async aggregateOnce(trigger: 'startup' | 'interval') {
    const startedAt = Date.now();

    try {
      const activeProviders = await this.prisma.provider.findMany({
        where: { isActive: true },
        select: { id: true, name: true, baseUrl: true },
      });

      const results = await Promise.allSettled(
        activeProviders.map(async (p) => {
          const providerKey = p.name as ProviderKey;
          const items = await this.fetchProviderProducts(p.baseUrl);
          const normalized = this.normalizer.normalize(providerKey, items);
          return { providerId: p.id, providerKey, normalized };
        }),
      );

      for (const r of results) {
        if (r.status === 'rejected') {
          this.logger.error('Provider fetch failed', r.reason);
          continue;
        }

        await this.upsertProducts(r.value.providerId, r.value.normalized);
      }

      await this.markStaleProducts();

      this.logger.log(
        `Aggregation done (${trigger}) in ${Date.now() - startedAt}ms`,
      );
    } catch (err) {
      this.logger.error('Aggregation run failed', err);
    }
  }

  private async seedDatabaseWithProviderData() {
    try {
      await Promise.all(
        this.providers.map((p) =>
          this.prisma.provider.upsert({
            where: { name: p.name },
            create: { name: p.name, baseUrl: p.baseUrl, isActive: true },
            update: { baseUrl: p.baseUrl },
          }),
        ),
      );
    } catch (err) {
      this.logger.error('Seed database with provider data failed', err);
    }
  }

  private async fetchProviderProducts(baseUrl: string): Promise<unknown> {
    const url = `${baseUrl.replace(/\/$/, '')}/products`;

    const res = await this.http.get(url);
    return res.data as unknown;
  }

  private async upsertProducts(
    providerId: string,
    products: NormalizedProduct[],
  ) {
    for (const p of products) {
      const existing = await this.prisma.product.findUnique({
        where: {
          externalId_providerId: {
            externalId: p.externalId,
            providerId,
          },
        },
        select: {
          id: true,
          currentPrice: true,
          currency: true,
          availability: true,
        },
      });

      if (!existing) {
        const createData = {
          externalId: p.externalId,
          name: p.name,
          description: p.description ?? null,
          currentPrice: p.currentPrice,
          currency: p.currency,
          availability: p.availability,
          lastUpdated: p.lastUpdated,
          isStale: false,
          providerId,
          priceHistory: {
            create: {
              price: p.currentPrice,
              currency: p.currency,
              changedAt: p.lastUpdated,
            },
          },
        };
        await this.prisma.product.create({
          data: createData,
        });
      } else {
        const priceChanged =
          existing.currentPrice.toString() !== p.currentPrice.toString();
        const availabilityChanged = existing.availability !== p.availability;
        const shouldWriteHistory = priceChanged || availabilityChanged;

        const updateData = {
          name: p.name,
          description: p.description ?? null,
          currentPrice: p.currentPrice,
          currency: p.currency,
          availability: p.availability,
          lastUpdated: p.lastUpdated,
          isStale: false,
          ...(shouldWriteHistory
            ? {
                priceHistory: {
                  create: {
                    price: p.currentPrice,
                    currency: p.currency,
                    changedAt: p.lastUpdated,
                  },
                },
              }
            : {}),
        };
        await this.prisma.product.update({
          where: {
            externalId_providerId: {
              externalId: p.externalId,
              providerId,
            },
          },
          data: updateData,
        });
      }
    }
  }

  private async markStaleProducts() {
    const cutoff = moment().subtract(this.staleThresholdMs, 'ms').toDate();

    await this.prisma.product.updateMany({
      where: { lastUpdated: { lt: cutoff } },
      data: { isStale: true },
    });
  }
}
