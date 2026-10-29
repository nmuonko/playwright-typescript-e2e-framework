import { faker } from '@core/data/factories';

/** Shape the site persists in localStorage under `afrishop_cart_v1` (captured from a real add-to-cart). */
export interface CartEntry {
  readonly id: string;
  readonly productId: string;
  readonly provider: 'rainforest' | 'ebay';
  readonly title: string;
  readonly imageUrl: string;
  readonly priceUsd: number;
  readonly quantity: number;
  readonly productUrl: string;
}

export const CART_STORAGE_KEY = 'afrishop_cart_v1';

const catalogue = [
  {
    productId: 'amazon_B088NHSZV6',
    title: 'Apple iPhone SE (2nd Generation), US Version, 64GB, Black for GSM (Renewed)',
    imageUrl: 'https://m.media-amazon.com/images/I/21Fa3eLzEBL._SL1500_.jpg',
    productUrl: 'https://www.amazon.com/dp/B088NHSZV6',
  },
  {
    productId: 'amazon_B0C7LPN1CH',
    title: 'Google Pixel 7, 128GB for Verizon, Obsidian (Renewed)',
    imageUrl: 'https://m.media-amazon.com/images/I/51tqo9URyHL._SL1500_.jpg',
    productUrl: 'https://www.amazon.com/dp/B0C7LPN1CH',
  },
  {
    productId: 'amazon_B08PNBVYZS',
    title: 'Apple iPhone 12 Mini, US Version, 128GB, Green - Unlocked (Renewed)',
    imageUrl: 'https://m.media-amazon.com/images/I/41tyr8TGJ5L._SL1500_.jpg',
    productUrl: 'https://www.amazon.com/dp/B08PNBVYZS',
  },
] as const;

/**
 * Builds a deterministic cart. Prices are generated with cents so totals math is genuinely exercised
 * (a sum of whole numbers would hide rounding bugs).
 */
export function createCart(lines: ReadonlyArray<{ quantity: number; priceUsd?: number }>): CartEntry[] {
  return lines.map((line, index) => {
    const product = catalogue[index % catalogue.length];
    if (!product) throw new Error('catalogue is empty');
    return {
      ...product,
      id: `local_test_${index}`,
      provider: 'rainforest',
      priceUsd: line.priceUsd ?? faker.number.float({ min: 50, max: 900, fractionDigits: 2 }),
      quantity: line.quantity,
    };
  });
}

/** Checked index access (the tsconfig enables noUncheckedIndexedAccess). */
export function lineAt(cart: readonly CartEntry[], index: number): CartEntry {
  const line = cart[index];
  if (!line) throw new Error(`Cart has no line ${index}`);
  return line;
}

export function cartTotal(cart: readonly CartEntry[]): number {
  return Math.round(cart.reduce((sum, line) => sum + line.priceUsd * line.quantity, 0) * 100) / 100;
}
