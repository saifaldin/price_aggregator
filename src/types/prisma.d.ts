declare module '@prisma/client' {
  export class PrismaClient {
    $connect(): Promise<void>;
    $disconnect(): Promise<void>;

    provider: {
      findMany(
        args?: unknown,
      ): Promise<Array<{ id: string; name: string; baseUrl: string }>>;
      upsert(args: unknown): Promise<{
        id: string;
        name: string;
        baseUrl: string;
        isActive: boolean;
      }>;
    };

    product: {
      findUnique(args: unknown): Promise<{
        id: string;
        currentPrice: { toString(): string };
        currency: string;
        availability: boolean;
      } | null>;
      upsert(args: unknown): Promise<unknown>;
      updateMany(args: unknown): Promise<unknown>;
    };
  }
}
