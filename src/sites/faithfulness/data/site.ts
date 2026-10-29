/**
 * Stable business facts for faithfulnesshomecare.com, captured from the live site (see docs/TEST-PLAN.md).
 * Tests assert against these so a content regression (wrong phone number, missing service) fails loudly.
 */

export const contactInfo = {
  phoneDisplay: '(978) 868-5754',
  phoneHref: 'tel:+19788685754',
  email: 'care@faithfulnesshomecare.com',
  address: '205 School St, Gardner, MA 01440',
} as const;

export interface NavTarget {
  readonly label: string;
  readonly path: string;
  readonly h1: string;
}

export const mainNav: readonly NavTarget[] = [
  { label: 'For Families', path: '/for-families', h1: "You Don't Have to Figure This Out Alone" },
  {
    label: 'For Professionals',
    path: '/for-professionals',
    h1: 'A Dependable Non-Medical Partner at Discharge',
  },
  { label: 'Refer a Client', path: '/refer', h1: 'Refer a client' },
  { label: 'About', path: '/about', h1: 'Care That Keeps Its Word' },
];

/** The six headline services, as linked from the header menu and footer. */
export const coreServices: readonly NavTarget[] = [
  { label: 'Personal Care & Companionship', path: '/services/personal-care', h1: 'Personal Care' },
  {
    label: "Alzheimer's & Dementia Home Support",
    path: '/services/dementia-care',
    h1: "Alzheimer's & Dementia Home Support",
  },
  {
    label: 'Post-Hospital & Home Support',
    path: '/services/post-hospital-support',
    h1: 'Post-Hospital & Post-Surgical Home Support',
  },
  { label: 'Respite Care', path: '/services/respite-care', h1: 'Respite Care' },
  { label: 'Homemaking & Meal Preparation', path: '/services/homemaking', h1: 'Homemaking' },
  { label: 'Overnight & 24-Hour Care', path: '/services/overnight-care', h1: 'Overnight Care' },
];

export interface ServiceArea {
  readonly town: string;
  readonly slug: string;
  readonly h1: string;
}

const area = (town: string, prefix = 'In-Home Care in'): ServiceArea => ({
  town,
  slug: `${town.toLowerCase()}-ma`,
  h1: `${prefix} ${town}, Massachusetts`,
});

export const serviceAreas: readonly ServiceArea[] = [
  area('Leominster'),
  area('Fitchburg'),
  area('Gardner'),
  area('Westminster'),
  area('Lunenburg'),
  area('Lancaster'),
  area('Sterling'),
  area('Clinton'),
  area('Princeton'),
  area('Worcester'),
  area('Shrewsbury'),
  area('Templeton'),
  area('Winchendon'),
  area('Athol'),
  area('Lowell', 'Non-Medical Home Care in'),
];

/** ZIP codes whose routing was verified against the live availability checker. */
export const inAreaZips = [
  { zip: '01440', town: 'Gardner', slug: 'gardner-ma' },
  { zip: '01608', town: 'Worcester', slug: 'worcester-ma' },
] as const;

export const outOfAreaZip = {
  zip: '90210',
  message: 'This ZIP is outside our current core coverage map',
} as const;

export const pricing = {
  heading: 'Home care starting at $39/hour',
} as const;

export const home = {
  title: /In-Home Care in Worcester County, MA/,
  h1: /In-Home Care Across\s*Worcester County\s*—\s*Right at Home\./,
} as const;

/** Pages that carry the most business value; used by console, a11y and API sweeps. */
export const keyPages = [
  '/',
  '/contact',
  '/services',
  '/request-assessment',
  '/refer',
  '/careers',
  '/paying-for-care',
] as const;
