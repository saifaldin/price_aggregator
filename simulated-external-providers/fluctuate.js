/**
 * Price Fluctuation Script
 *
 * Simulates real-world price and availability changes by periodically
 * updating provider data via their REST APIs (json-server).
 */
const PROVIDER_A_URL = process.env.PROVIDER_A_URL || 'http://localhost:3001';
const PROVIDER_B_URL = process.env.PROVIDER_B_URL || 'http://localhost:3002';
const PROVIDER_C_URL = process.env.PROVIDER_C_URL || 'http://localhost:3003';
const INTERVAL_MS = +process.env.FLUCTUATION_INTERVAL_MS || 5000;
const FLUCTUATION_FACTOR = +process.env.FLUCTUATION_FACTOR || 0.15;

// Generate a random price fluctuation around a base price
function fluctuatePrice(currentPrice, fluctuation = FLUCTUATION_FACTOR) {
  const change = (Math.random() * 2 - 1) * fluctuation;
  const newPrice = currentPrice * (1 + change);
  return Math.round(newPrice * 100) / 100;
}

// Randomly determine availability (50% chance of being available)
function randomAvailability() {
  return Math.random() > 0.5;
}

// Fetch JSON from a URL using the ID field
async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

// PATCH a resource via REST API
async function patchJson(url, data) {
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

// Update Provider A - Standard structure
async function updateProviderA() {
  try {
    const products = await fetchJson(`${PROVIDER_A_URL}/products`);
    const now = new Date().toISOString();

    for (const product of products) {
      await patchJson(`${PROVIDER_A_URL}/products/${product.id}`, {
        price: fluctuatePrice(product.price),
        availability: randomAvailability(),
        lastUpdated: now,
      });
    }

    console.log(`[${now}] Updated Provider A: ${products.length} products`);
  } catch (error) {
    console.error('Error updating Provider A:', error.message);
  }
}

// Update Provider B - Alternative field names
async function updateProviderB() {
  try {
    const products = await fetchJson(`${PROVIDER_B_URL}/products`);
    const now = new Date().toISOString();

    for (const product of products) {
      await patchJson(`${PROVIDER_B_URL}/products/${product.productId}`, {
        cost: fluctuatePrice(product.cost),
        inStock: randomAvailability(),
        updatedAt: now,
      });
    }

    console.log(`[${now}] Updated Provider B: ${products.length} products`);
  } catch (error) {
    console.error('Error updating Provider B:', error.message);
  }
}

// Update Provider C - Nested structure
async function updateProviderC() {
  try {
    const products = await fetchJson(`${PROVIDER_C_URL}/products`);
    const now = Date.now();

    for (const product of products) {
      await patchJson(`${PROVIDER_C_URL}/products/${product.identifier}`, {
        pricing: {
          ...product.pricing,
          amount: fluctuatePrice(product.pricing.amount),
        },
        stock: {
          ...product.stock,
          available: randomAvailability(),
        },
        metadata: {
          ...product.metadata,
          lastModified: now,
        },
      });
    }

    console.log(`[${new Date(now).toISOString()}] Updated Provider C: ${products.length} products`);
  } catch (error) {
    console.error('Error updating Provider C:', error.message);
  }
}

// Update all providers concurrently
async function updateAllProviders() {
  await Promise.all([updateProviderA(), updateProviderB(), updateProviderC()]);
  console.log('---');
}

// Startup
console.log('Price Fluctuation Script Started (HTTP Mode)');
console.log(`Providers: ${PROVIDER_A_URL}, ${PROVIDER_B_URL}, ${PROVIDER_C_URL}`);
console.log(`Interval: ${INTERVAL_MS}ms, Price Fluctuation: ±${FLUCTUATION_FACTOR * 100}%`);
console.log('---');

// Wait for providers to be ready, then start updates
setTimeout(() => {
  updateAllProviders();
  setInterval(updateAllProviders, INTERVAL_MS);
}, 3000);
