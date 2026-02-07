# Product Price Aggregator

A NestJS API that aggregates digital product pricing from multiple simulated external providers, normalizes their data, stores it in PostgreSQL, and exposes a REST API with optional Server-Sent Events (SSE) for real-time updates.


## Prerequisites

- **Node.js** 20+
- **npm** (or compatible package manager)
- **PostgreSQL** 16+ (for local development)
- **Docker** and **Docker Compose** (optional, for full stack including simulated providers)

## Architecture Overview

```mermaid
flowchart TB
    subgraph Providers [Simulated External Providers]
        P1[Provider A - EBooks]
        P2[Provider B - Software]
        P3[Provider C - Courses]
    end

    subgraph AggregationService [Aggregation Layer]
        Scheduler[Scheduled Task]
        Fetcher[Concurrent Fetcher]
        Normalizer[Data Normalizer]
    end

    subgraph DataLayer [Data Layer]
        Prisma[Prisma ORM]
        PG[(PostgreSQL)]
    end

    subgraph API [REST API]
        Products["/products"]
        ProductDetail["/products/:id"]
        Changes["/products/changes"]
        SSE["/products/stream SSE"]
    end

    Scheduler --> Fetcher
    Fetcher --> P1
    Fetcher --> P2
    Fetcher --> P3
    P1 --> Normalizer
    P2 --> Normalizer
    P3 --> Normalizer
    Normalizer --> Prisma
    Prisma --> PG
    PG --> Products
```

- **Provider simulation**:
    - Three services (Provider A, B, C) are simulated with a seed json data and a simple json server.
    - Providers expose different payload shapes (e.g. `price` vs `cost`, `availability` vs `inStock`, nested structures).
    - Service *fluctuator* periodically updates their data to simulate live changes.

- **Aggregation layer**: 
    - A scheduled task runs at a configurable interval. 
    - It fetches from all active providers concurrently, normalizes responses to a unified schema, upserts products and appends price history when prices change.
    - It marks products as stale when they haven’t been updated within a threshold.

- **Data layer**: Prisma ORM with PostgreSQL. Models: `Provider`, `Product` (unique per `externalId` + `providerId`), and `PriceHistory` for price change tracking.
- **REST API**: Paginated product list, product by ID (with history), changes since a timestamp, and an SSE stream for real-time product updates. See Swagger documentation after launching the project at: http://localhost:3000/api/docs

## Project structure

```
simulated-external-providers/  # Provider mock data and services
public/                       # Static assets (e.g. index.html for SSE demo)
prisma/
├── schema.prisma           # Provider, Product, PriceHistory
└── migrations/
src/
├── main.ts                 # Bootstrap, validation, Swagger
├── app.module.ts
├── prisma/                 # Prisma module and service
├── products/               # Products API (controller, service, DTOs)
├── aggregation/            # Scheduled fetch, normalizer, upsert, stale marking
├── product-stream/         # SSE stream for product updates
├── common/                 # Shared DTOs (e.g. pagination)
└── types/
```

## Setup (Docker vs Manual) 

### Run everything with Docker __(Recommended)__

This starts the API, PostgreSQL, the three simulated providers, and the price fluctuator:

```bash
docker compose up --build
```

- **API**: http://localhost:3000  
- **Swagger**: http://localhost:3000/api/docs  
- **Live SSE demo**: http://localhost:3000 (serves `public/index.html`)  
- **Provider A**: http://localhost:3001  
- **Provider B**: http://localhost:3002  
- **Provider C**: http://localhost:3003  

Migrations run automatically on app startup via the Dockerfile entrypoint.

### Setup and run manually

Note that: Running manually would strip you from any external provider since every provider runs in a dockerized json-server

#### 1. Clone and install

```bash
git clone <repository-url>
cd price_aggregator
npm install
```

#### 2. Environment configuration

Create a `.env` file in the project root (or copy from `.env.example` if present):

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/price_aggregator
FETCH_INTERVAL_MS=10000
STALE_THRESHOLD_MS=60000
PORT=3000
```

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `FETCH_INTERVAL_MS` | Aggregation job interval (ms) | `10000` |
| `STALE_THRESHOLD_MS` | Products not updated within this (ms) are marked stale | `60000` |
| `PORT` | API server port | `3000` |

#### 3. Database

Ensure PostgreSQL is running and the database exists. Then run migrations and generate the Prisma client:

```bash
npm run prisma:generate
npm run prisma:migrate
```

For a quick schema sync without migration history (e.g. dev only):

```bash
npm run prisma:push
```

#### 4. Run the API (local, without Docker)

Start the app (provider URLs must point to running simulated providers if you want aggregated data):

```bash
npm run start:dev
```

The API will be available at `http://localhost:3000` (or the port set in `PORT`). Swagger docs: **http://localhost:3000/api/docs**.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/products` | Paginated product list. Query: `name`, `minPrice`, `maxPrice`, `availability`, `provider`, `page`, `limit` |
| `GET` | `/products/changes` | Products with price/availability changes since a timestamp. Query: `since` (ISO), `page`, `limit` |
| `GET` | `/products/stream` | Server-Sent Events stream of product updates (new or changed price/availability) |
| `GET` | `/products/:id` | Single product with provider and price history. 404 if not found |

Interactive documentation is available at **/api/docs** (Swagger).

## Simulated External Providers

Three providers are implemented with different field names and structures:

| Provider   | Role      | Base URL Port | Endpoint (relative) | Payload differences |
|-----------|------------|---------|----------------------|----------------------|
| Provider A | EBooks    | 3001 |`/api/providers/a/products` (or similar) | Standard: `id`, `price`, `availability`, `lastUpdated` |
| Provider B | Software  | 3002 |`/api/providers/b/products`              | Uses `productId`, `cost`, `inStock` instead of `id`/`price`/`availability` |
| Provider C | Courses   | 3003 | `/api/providers/c/products`              | Nested structure, different date format, `identifier` as ID |

Seed data is stored in JSON files under `simulated-external-providers/` and served by small services. The *fluctuator* container periodically updates prices/availability to simulate real-world changes.


## Scripts

| Script | Description |
|--------|-------------|
| `npm run start` | Start app (single run) |
| `npm run start:dev` | Start in watch mode |
| `npm run start:prod` | Run built app (e.g. `node dist/main`) |
| `npm run build` | Build for production |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run migrations (interactive) |
| `npm run prisma:push` | Push schema to DB (no migration files) |
| `npm run prisma:studio` | Open Prisma Studio for the database |
| `npm run test` | Unit tests |
| `npm run test:e2e` | E2E tests |
| `npm run test:cov` | Test coverage |
| `npm run lint` | Run ESLint |

## Testing

The project uses **Jest** for unit and end-to-end tests.

### Unit tests

Unit tests live next to the code they test (e.g. `src/aggregation/aggregation.service.spec.ts`). They mock external dependencies (Prisma, HTTP, etc.) and focus on service and normalizer logic.

```bash
npm run test
```

Generate a coverage report:

```bash
npm run test:cov
```

- **Aggregation service** – scheduled fetch, concurrent provider calls, upsert and stale marking
- **Normalizer** – mapping provider-specific payloads (A, B, C) to the unified product schema
- **Products service** – pagination, filtering, and product-by-id with history

### E2E tests

End-to-end tests live in `test/` and hit the HTTP API using `supertest`. They use a mocked Prisma layer, so **no real database is required**.

```bash
npm run test:e2e
```

They cover the main API surface: `GET /products`, `GET /products/:id`, `GET /products/changes`, and error handling (e.g. 404 for unknown product).

## Design notes

- **Upsert**: Products are upserted by `(externalId, providerId)` to avoid duplicates across fetches.
- **Price history**: A new `PriceHistory` row is created only when the stored price for a product actually changes.
- **Resilience**: Provider requests use `Promise.allSettled` and retries (e.g. axios-retry); one failing provider does not block others.
- **Staleness**: A background step marks products as stale when they have not been updated within `STALE_THRESHOLD_MS`; the API can filter or flag these.
