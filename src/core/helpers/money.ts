import { expect } from '@playwright/test';

/** Parses "$1,210", "$246.00", "450 $" into a number. Throws on anything else. */
export function parsePrice(text: string): number {
  const match = /(\d{1,3}(?:[,\s]\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)/.exec(text.replace(/\u00a0/g, ' '));
  if (!match?.[1]) throw new Error(`No price found in "${text}"`);
  return Number(match[1].replace(/[,\s]/g, ''));
}

export function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

export function expectSorted(values: readonly number[], direction: 'asc' | 'desc', label = 'prices'): void {
  expect(values.length, `expected at least two ${label} to compare`).toBeGreaterThan(1);
  const sorted = [...values].sort((a, b) => (direction === 'asc' ? a - b : b - a));
  expect(values, `${label} should be sorted ${direction}`).toEqual(sorted);
}
