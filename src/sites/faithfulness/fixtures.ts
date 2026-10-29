import { test as base } from '@core/fixtures';
import { faithfulnessPolicy } from './network-policy';
import { AuthPage } from './pages/auth.page';
import { CareersPage } from './pages/careers.page';
import { ContactPage } from './pages/contact.page';
import { HomePage } from './pages/home.page';
import { ReferPage } from './pages/refer.page';
import { RequestAssessmentPage } from './pages/request-assessment.page';
import { PayingForCarePage, ServiceAreasPage, ServicesPage } from './pages/services.page';

interface FaithfulnessFixtures {
  homePage: HomePage;
  contactPage: ContactPage;
  servicesPage: ServicesPage;
  serviceAreasPage: ServiceAreasPage;
  payingForCarePage: PayingForCarePage;
  requestAssessmentPage: RequestAssessmentPage;
  referPage: ReferPage;
  careersPage: CareersPage;
  authPage: AuthPage;
}

export const test = base.extend<FaithfulnessFixtures>({
  networkPolicy: faithfulnessPolicy,
  homePage: async ({ page }, use) => use(new HomePage(page)),
  contactPage: async ({ page }, use) => use(new ContactPage(page)),
  servicesPage: async ({ page }, use) => use(new ServicesPage(page)),
  serviceAreasPage: async ({ page }, use) => use(new ServiceAreasPage(page)),
  payingForCarePage: async ({ page }, use) => use(new PayingForCarePage(page)),
  requestAssessmentPage: async ({ page }, use) => use(new RequestAssessmentPage(page)),
  referPage: async ({ page }, use) => use(new ReferPage(page)),
  careersPage: async ({ page }, use) => use(new CareersPage(page)),
  authPage: async ({ page }, use) => use(new AuthPage(page)),
});

export { expect } from '@core/fixtures';
