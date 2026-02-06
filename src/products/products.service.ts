import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  ProductChangesQueryDto,
  ProductsQueryDto,
} from './dto/products.dto.js';
import { PaginationMeta } from '../common/dto/pagination.dto.js';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async getProducts(query: ProductsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.name) {
      where.name = {
        contains: query.name,
        mode: 'insensitive',
      };
    }

    if (query.availability !== undefined) {
      where.availability = query.availability;
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.currentPrice = {};
      if (query.minPrice !== undefined) {
        where.currentPrice.gte = query.minPrice;
      }
      if (query.maxPrice !== undefined) {
        where.currentPrice.lte = query.maxPrice;
      }
    }

    if (query.provider) {
      where.provider = {
        name: query.provider,
      };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: {
          provider: true,
        },
        orderBy: {
          lastUpdated: 'desc',
        },
        skip,
        take: +limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    const meta: PaginationMeta = {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };

    return { data: items, meta };
  }

  async getProductById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        provider: true,
        priceHistory: {
          orderBy: {
            changedAt: 'desc',
          },
          take: 10,
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with id "${id}" not found`);
    }

    return product;
  }

  async getProductChanges(query: ProductChangesQueryDto) {
    const sinceDate = new Date(query.since);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [allGroups, distinctProductIdsPage] = await this.prisma.$transaction([
      this.prisma.priceHistory.groupBy({
        by: ['productId'],
        where: {
          changedAt: {
            gt: sinceDate,
          },
        },
        orderBy: {
          productId: 'asc',
        },
      }),
      this.prisma.priceHistory.findMany({
        where: {
          changedAt: {
            gt: sinceDate,
          },
        },
        select: {
          productId: true,
        },
        distinct: ['productId'],
        orderBy: {
          productId: 'asc',
        },
        skip,
        take: limit,
      }),
    ]);

    const total = allGroups.length;
    const productIds = distinctProductIdsPage.map((p) => p.productId);

    if (!productIds.length) {
      const meta: PaginationMeta = {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      };
      return { data: [], meta };
    }

    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
      },
      include: {
        provider: true,
        priceHistory: {
          where: {
            changedAt: {
              gt: sinceDate,
            },
          },
          orderBy: {
            changedAt: 'desc',
          },
        },
      },
    });

    const meta: PaginationMeta = {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };

    return { data: products, meta };
  }
}
