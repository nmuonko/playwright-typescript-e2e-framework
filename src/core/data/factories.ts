import { faker } from '@faker-js/faker';

export interface Person {
  readonly firstName: string;
  readonly lastName: string;
  readonly fullName: string;
  readonly email: string;
  /** US number in the 555-01xx range, which is reserved for fiction and never routes. */
  readonly phone: string;
}

/**
 * Seed per test (e.g. from testInfo) to make generated data reproducible in a failure report.
 * Emails use example.com (RFC 2606), so even a leaked submission could never reach a real inbox.
 */
export function createPerson(overrides: Partial<Person> = {}): Person {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const suffix = faker.string.numeric(2);
  return {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    email: faker.internet.email({ firstName, lastName, provider: 'example.com' }).toLowerCase(),
    phone: `(978) 555-01${suffix}`,
    ...overrides,
  };
}

export function seedFaker(seed: number): void {
  faker.seed(seed);
}

export { faker };
