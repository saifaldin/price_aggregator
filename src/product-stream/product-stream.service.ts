import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

export interface ProductWithProvider {
  id: string;
  name: string;
  description: string | null;
  currentPrice: { toString(): string };
  currency: string;
  availability: boolean;
  lastUpdated: Date;
  provider: { id: string; name: string; baseUrl: string };
  [key: string]: unknown;
}

@Injectable()
export class ProductStreamService {
  private readonly stream = new Subject<ProductWithProvider>();

  emit(product: ProductWithProvider): void {
    this.stream.next(product);
  }

  getStream(): Subject<ProductWithProvider> {
    return this.stream;
  }
}
