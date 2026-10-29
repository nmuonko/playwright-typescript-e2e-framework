import { createPerson, faker, type Person } from '@core/data/factories';

/** Option labels exactly as rendered by the live consultation form. */
export const consultationOptions = {
  relationship: ['Self', 'Parent', 'Spouse', 'Other family member', 'Friend', 'Other'],
  urgency: ['As soon as possible', 'Within 1 week', 'Within 2 weeks', 'Within 30 days', 'Planning ahead'],
  schedule: ['One or more 4-hour visits each week', '4 to 8 hours per day', 'More than 8 hours per day'],
  payment: ['Yes', "I'm not sure"],
  preferredContact: ['Phone call', 'Text message', 'Email'],
  careTypes: [
    'Personal Care and Companionship',
    "Alzheimer's and Dementia Home Support",
    'Post-Hospital and Home Support',
    'Respite Care',
    'Homemaking and Meal Preparation',
    'Overnight Care',
  ],
} as const;

type Option<K extends keyof typeof consultationOptions> = (typeof consultationOptions)[K][number];

export interface ConsultationRequest {
  readonly zip: string;
  readonly relationship: Option<'relationship'>;
  readonly urgency: Option<'urgency'>;
  readonly careTypes: readonly Option<'careTypes'>[];
  readonly schedule: Option<'schedule'>;
  readonly payment: Option<'payment'>;
  readonly person: Person;
  readonly preferredContact: Option<'preferredContact'>;
  readonly message: string;
}

export function createConsultationRequest(overrides: Partial<ConsultationRequest> = {}): ConsultationRequest {
  return {
    zip: '01440',
    relationship: faker.helpers.arrayElement(consultationOptions.relationship),
    urgency: faker.helpers.arrayElement(consultationOptions.urgency),
    careTypes: faker.helpers.arrayElements(consultationOptions.careTypes, { min: 1, max: 3 }),
    schedule: faker.helpers.arrayElement(consultationOptions.schedule),
    payment: faker.helpers.arrayElement(consultationOptions.payment),
    person: createPerson(),
    preferredContact: faker.helpers.arrayElement(consultationOptions.preferredContact),
    message: `[automated test] ${faker.lorem.sentence()}`,
    ...overrides,
  };
}

/** Error copy rendered by the consultation form for an empty submit. */
export const consultationRequiredErrors = [
  'Please enter a ZIP code',
  'Please choose an option',
  'Please choose a timeframe',
  'Please choose at least one type of care',
  'Please choose a schedule',
  'Please choose a payment option',
  'Please enter a name',
  'Please enter a phone number',
  'Please choose a contact method',
] as const;

export interface AssessmentRequest {
  readonly person: Person;
  readonly zip: string;
  readonly relationship: 'Myself' | 'Parent' | 'Spouse or Partner' | 'Grandparent';
  readonly careTypes: readonly Option<'careTypes'>[];
  readonly notes: string;
}

export function createAssessmentRequest(overrides: Partial<AssessmentRequest> = {}): AssessmentRequest {
  return {
    person: createPerson(),
    zip: '01608',
    relationship: faker.helpers.arrayElement([
      'Myself',
      'Parent',
      'Spouse or Partner',
      'Grandparent',
    ] as const),
    careTypes: faker.helpers.arrayElements(consultationOptions.careTypes, { min: 1, max: 2 }),
    notes: `[automated test] ${faker.lorem.sentence()}`,
    ...overrides,
  };
}

export interface Referral {
  readonly referrer: Person;
  readonly organisation: string;
  readonly client: Person;
  readonly zip: string;
  readonly town: string;
}

export function createReferral(overrides: Partial<Referral> = {}): Referral {
  return {
    referrer: createPerson(),
    organisation: `${faker.company.name()} Rehabilitation`,
    client: createPerson(),
    zip: '01420',
    town: 'Fitchburg',
    ...overrides,
  };
}

export interface CareerApplication {
  readonly person: Person;
  readonly zip: string;
  readonly position:
    'Caregiver or Home Care Aide' | 'Certified Nursing Assistant (CNA)' | 'Companion Caregiver';
  readonly availability: string;
  readonly experience: string;
}

export function createCareerApplication(overrides: Partial<CareerApplication> = {}): CareerApplication {
  return {
    person: createPerson(),
    zip: '01453',
    position: faker.helpers.arrayElement([
      'Caregiver or Home Care Aide',
      'Certified Nursing Assistant (CNA)',
      'Companion Caregiver',
    ] as const),
    availability: 'Weekday mornings',
    experience: `[automated test] ${faker.number.int({ min: 1, max: 10 })} years caring for family`,
    ...overrides,
  };
}
