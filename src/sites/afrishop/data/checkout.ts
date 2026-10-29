import { createPerson, faker, type Person } from '@core/data/factories';

export interface ShippingDetails {
  readonly person: Person;
  /** DRC mobile format; 099x prefixes are unallocated test-style numbers. */
  readonly phone: string;
  readonly address: string;
  readonly city: 'Kinshasa' | 'Lubumbashi' | 'Goma';
}

export function createShippingDetails(overrides: Partial<ShippingDetails> = {}): ShippingDetails {
  return {
    person: createPerson(),
    phone: `+243 990 ${faker.string.numeric(3)} ${faker.string.numeric(3)}`,
    address: `Avenue ${faker.location.street()} ${faker.number.int({ min: 1, max: 300 })}`,
    city: faker.helpers.arrayElement(['Kinshasa', 'Lubumbashi', 'Goma'] as const),
    ...overrides,
  };
}
