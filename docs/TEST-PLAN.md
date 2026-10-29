# Test Plan

> Status: **Approved and implemented.** This plan was the Phase 1 specification. Every page, selector and
> behaviour below was observed on the live sites on 2026-10-28 using read-only exploration scripts (all non-GET
> requests aborted). Section 9 records how the implementation refined the plan; current findings live in
> [FINDINGS.md](FINDINGS.md) and design rationale in [DECISIONS.md](DECISIONS.md).

## 1. Scope and ground rules

| Rule                                                                   | How the framework enforces it                                                                                                                                                                                               |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No real submissions (leads, accounts, orders, referrals, applications) | A **network guard fixture** aborts every non-GET request that is not explicitly mocked or allow-listed as read-only. If an unmocked write is attempted, the test fails, so a missing mock can never leak a real submission. |
| Submit paths are still tested                                          | `page.route()` intercepts the submit call, asserts the payload, and fulfils it with a mock success or failure response.                                                                                                     |
| Don't pollute business analytics                                       | Third-party trackers (Google Ads/GTM, TikTok pixel, Facebook, Stripe telemetry) and Lovable's `/__l5e/trackevents` are aborted in every test, so automated runs never skew ad or analytics data.                            |
| No load or stress testing                                              | Low worker count against production, link checks with bounded concurrency, and performance checks that run once, on Chromium only, against a handful of pages.                                                              |
| Content is dynamic (Afrishop catalogue)                                | Assertions target **invariants**, such as sort order, totals math, and query relevance, never specific products or prices. Cart tests seed `localStorage` so they are deterministic.                                        |

Out of scope: payment (Stripe), authenticated areas (Faithfulness client portal, Afrishop
account and orders), admin routes, and real login attempts.

## 2. Site profiles

### 2.1 Faithfulness Home Care: `https://faithfulnesshomecare.com`

- **Business:** non-medical in-home care agency, Worcester County, MA. Revenue depends
  on **leads**: consultation, assessment and referral forms, plus phone calls.
- **Platform:** custom React app built with **Lovable** on **TanStack Start** (SSR,
  `/_serverFn/<hash>` server functions), backed by Supabase and fronted by Cloudflare.
  Real HTTP 404s for unknown routes. English.
- **Security headers:** strong (HSTS, CSP, `X-Frame-Options: DENY`, nosniff,
  Referrer-Policy, Permissions-Policy). HTML served `no-cache`.
- **Accessibility baseline:** good. Skip link, labelled landmarks (`navigation "Main"`,
  `"Services"`, `"Company"`), and every form field has a label, inline error text and
  `aria-invalid`.

**Page inventory (54 URLs in `sitemap.xml`, all 200):**

| Area          | Pages                                                                                                                                                                                                                   |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core          | `/`, `/about`, `/for-families`, `/for-professionals`, `/paying-for-care`, `/careers`, `/contact`                                                                                                                        |
| Services      | `/services` hub + 25 detail pages (6 core: `personal-care`, `dementia-care`, `post-hospital-support`, `respite-care`, `homemaking`, `overnight-care`; 19 sub-services such as `companion-care`, `medication-reminders`) |
| Service areas | `/service-areas` + 15 town pages (`gardner-ma`, `worcester-ma`, `lowell-ma`, …)                                                                                                                                         |
| Lead capture  | `/contact`, `/request-assessment` (two steps), `/refer`, `/careers` (with resume upload)                                                                                                                                |
| Other         | `/auth` (invitation-only client/caregiver login), `/privacy`, `/terms`, `/accessibility`, `/robots.txt`, `/sitemap.xml`                                                                                                 |

**Interactive elements found:**

- Header: logo, Main nav (Services ▾ menu, For Families, For Professionals, Refer a
  Client, About, More ▾), `tel:` link, "Free Care Consultation" CTA. On mobile, an
  "Open menu" button reveals a Mobile nav.
- **ZIP availability checker** (home, `/service-areas`):
  - In-area ZIPs route to the town page (`01440` → `/service-areas/gardner-ma`,
    `01608` → `/service-areas/worcester-ma`).
  - `90210` shows "This ZIP is outside our current core coverage map…".
  - Empty or non-numeric input does nothing.
- **"What Kind of Help Does Your Loved One Need?"** toggle buttons (`aria-pressed`) show
  a Recommended service plus "Also helpful" services.
- **FAQ accordion:** seven questions, rendered as headings with buttons.
- **Contact form:** 10 labelled fields plus a honeypot (`hp_field`).
  - Empty submit shows nine specific errors, for example "Please enter a ZIP code" and
    "Please choose at least one type of care".
  - Invalid values show messages such as "Enter a valid ZIP code" and "Enter a valid
    email".
  - An in-area ZIP shows inline feedback: "Good news, we serve Gardner."
  - Submit sends `POST /_serverFn/<hash>` with a seroval-serialised payload
    (`full_name`, `relationship`, `email`, `phone`, `zip`, `service_interests`,
    `urgency`, `preferred_contact`, `payment_method`, `message`, `source`, `utm_*`).
    On failure the page shows `role=alert` "Something went wrong. Please try again or
    give us a call."
  - The same form is embedded on the homepage and on every town page.
- **Assessment form:** step 1 has name, email, phone, ZIP, who needs care, and care
  types. Continue leads to step 2: schedule, start, contact method, best time,
  preferred date, private pay and notes. There are Back and "Request in-home
  assessment" buttons.
- **Refer form:** fieldsets "About you" and "About the client", submitted with "Send
  referral".
- **Careers form:** name, phone, email, ZIP, position, availability, certifications,
  experience, resume upload (PDF, Word, text or photo, ≤ 5 MB) and notes, submitted
  with "Submit My Application".

### 2.2 AfriShop: `https://afrishop-usa.com`

- **Business:** cross-border e-commerce that resells Amazon, eBay, Turkish and Chinese
  products to customers in the DR Congo, with all-inclusive pricing. Revenue depends on
  **product discovery → cart → checkout**.
- **Platform:** client-side React SPA built with **Lovable**, on a **Supabase** backend
  (PostgREST `/rest/v1/*`, Edge Functions `/functions/v1/*`). Cloudflare, Stripe and the
  TikTok pixel are also present. The UI is in French by default, with a language
  switcher on `/account`.
- **Engineering constraints for tests:**
  - The page **never reaches `networkidle`** (continuous polling and trackers), so
    tests wait on web-first assertions only.
  - The cart is stored entirely in `localStorage` (`afrishop_cart_v1`), so cart and
    checkout tests seed state with `addInitScript`.
  - Some reads use POST (`rpc/compute_display_prices_titled`,
    `rpc/get_active_providers`, `functions/v1/search-intent`,
    `functions/v1/catalog-service?action=tabs`). The network guard allow-lists these
    by name.
- **Security headers:** HSTS, nosniff and Referrer-Policy.

**Page inventory:**

| Area              | Pages                                                                                                                                                    |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Discovery         | `/` (hero, country tabs, sortable paginated grid), `/search?q=`, `/category/:slug`, `/hot-products`, `/turkey` (and other country stores), `/paste-link` |
| Product           | `/product/amazon/:asin`, `/product/ebay/:id`                                                                                                             |
| Purchase          | `/cart`, `/checkout`                                                                                                                                     |
| Account           | `/account` (language, referral programme), `/saved`, `/my-orders` → redirects to `/shop-auth?redirect=/my-orders`, `/shop-auth`                          |
| Support / content | `/track-order`, `/how-it-works`, `/about`, `/coverage`, `/refunds`, `/payments-compliance`, `/payouts-beneficiaries`, `/terms`, `/privacy`               |
| Sitemap (15 URLs) | also lists `/contact`, `/cars`, `/get`, `/knowledge-base`, `/payouts`                                                                                    |

**Interactive elements found:**

- **Header:** logo button, search textbox "Rechercher des millions de produits..." with a
  "Rechercher" button, a cart button with count badge, and an account button. The cart
  and account buttons are icon-only and have **no accessible name**.
- **Home:** hero carousel buttons; "Acheter par pays" buttons (USA, Turquie, Chine,
  Produits Vedettes), where Turquie goes to `/turkey`.
  - Sort combobox options: "Moins cher d'abord" (default, verified ascending),
    "Nouveautés", "Plus cher d'abord" (verified descending).
  - Pagination: Previous is disabled on page 1, and there is Next plus numbered pages.
- **Search:** shows the heading `Résultats pour "<q>"`, "N produits affichés", a store
  filter ("Toutes") and a sort control ("Prix: croissant").
  - Example: `iphone 13` returns 385 results.
  - An unknown term shows "Aucun produit trouvé" and "Effacer la recherche".
- **Category:** `/category/phones` shows "199 / 118,361 produits".
- **Product page:** gallery, title (h1), rating, price breakdown ("Article", "Frais de
  marge Inclus", "Frais de livraison Inclus", "Total"), quantity − / +, "Ajouter au
  panier" and "View on Amazon".
  - Quantity 2 shows "Article (×2) $492.00 … Total $492.00".
- **Cart:** line items with a selection checkbox, quantity controls and remove;
  "Vider le panier"; "Tout désélectionner"; an order summary; and "Procéder au paiement
  (n)". There is also an empty state.
- **Checkout:** an order summary plus a form (Nom complet, Email, Téléphone, Adresse,
  Ville, Pays defaulting to DR Congo).
  - "Continuer vers le paiement" sends `POST functions/v1/auth-service`, which the
    suite always mocks.
  - The email field uses native `type=email` validation.
- **Track order:** confirmation number textbox. An unknown number shows "Commande non
  trouvée".
- **Paste-link:** URL textbox, "Coller", "Calculer", and store logo links.

## 3. Key user journeys and risk-based priority

Risk = business impact × likelihood of breaking. **P1** tests run in `@smoke`; P1 and P2
run in `@regression`.

### Faithfulness

| #   | Journey                                                                                       | Impact if broken                                        | Priority |
| --- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------- | -------- |
| FJ1 | Family requests a free consultation (`/contact`, or the form embedded on home and town pages) | Lost leads, which is the core revenue funnel            | **P1**   |
| FJ2 | Family checks coverage by ZIP, lands on a town page, then converts                            | Lost local leads and SEO landing pages                  | **P1**   |
| FJ3 | Family requests an in-home assessment (two-step form)                                         | Lost high-intent leads                                  | **P1**   |
| FJ4 | Professional refers a client (`/refer`)                                                       | Lost B2B referral channel (hospitals, rehab)            | P2       |
| FJ5 | Caregiver applies (`/careers`, resume upload)                                                 | Can't hire, so supply is constrained                    | P2       |
| FJ6 | Visitor browses services and service detail pages                                             | Trust and SEO; people can't learn what is offered       | P2       |
| FJ7 | Visitor checks pricing (`/paying-for-care`, "starting at $39/hour")                           | Wrong or missing pricing is a trust and compliance risk | P2       |
| FJ8 | Visitor calls (`tel:` links in header, footer and CTAs)                                       | Lost phone leads                                        | **P1**   |
| FJ9 | Keyboard or screen-reader user completes FJ1                                                  | ADA/WCAG exposure for a care provider                   | P2       |

### AfriShop

| #   | Journey                                                       | Impact if broken                           | Priority |
| --- | ------------------------------------------------------------- | ------------------------------------------ | -------- |
| AJ1 | Shopper searches for a product and opens it                   | No discovery, no sales                     | **P1**   |
| AJ2 | Shopper browses the home grid, sorts by price and paginates   | Discovery degraded                         | P2       |
| AJ3 | Shopper browses by category or country store                  | Discovery degraded                         | P2       |
| AJ4 | Shopper sets quantity and adds to cart                        | No sales                                   | **P1**   |
| AJ5 | Shopper manages the cart (quantity, remove, select, totals)   | Wrong totals mean money and trust are lost | **P1**   |
| AJ6 | Shopper checks out (details → payment hand-off), mocked       | No revenue                                 | **P1**   |
| AJ7 | Shopper tracks an order                                       | Support load                               | P2       |
| AJ8 | Shopper prices an external product via paste-link             | Secondary funnel                           | P2       |
| AJ9 | Mobile shopper (majority audience) completes AJ1, AJ4 and AJ6 | Most traffic is mobile, so sales are lost  | **P1**   |

## 4. Proposed test cases

Tags: `@smoke` is a fast P1 subset run on every PR. `@regression` is the full suite,
which includes everything tagged `@smoke`. Secondary tags (`@a11y`, `@visual`, `@api`,
`@perf`, `@mobile`) drive the npm scripts. **Exp. fail** means the test is expected to
fail against the current production site because of a candidate finding (section 5). It
will be marked `test.fail()` with an annotation linking to `docs/FINDINGS.md`.

### 4.1 Faithfulness

**Smoke**

| ID       | Test                                                                                                 | Tags        | Notes                                               |
| -------- | ---------------------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------- |
| FH-SM-01 | Home renders the H1 "In-Home Care Across Worcester County…", and the primary CTA leads to `/contact` | @smoke      |                                                     |
| FH-SM-02 | Each Main-nav link opens a page with the expected H1 (data-driven)                                   | @smoke      |                                                     |
| FH-SM-03 | Key pages log no console errors                                                                      | @smoke      | **Exp. fail**: CSP blocks the gtag script (F-FH-01) |
| FH-SM-04 | Every `sitemap.xml` URL returns 200                                                                  | @smoke @api | 54 URLs, bounded concurrency                        |
| FH-SM-05 | Internal links on home, services and contact return < 400                                            | @smoke @api |                                                     |
| FH-SM-06 | Unknown route returns 404 with "Page not found"                                                      | @smoke @api |                                                     |
| FH-SM-07 | Header and footer phone links are `tel:+19788685754`, and the email is `care@…`                      | @smoke      | Phone leads                                         |

**Functional (regression)**

| ID       | Test                                                                                                     | Tags        |
| -------- | -------------------------------------------------------------------------------------------------------- | ----------- |
| FH-UI-01 | `/services` lists the 6 core services, and each link opens the page with the matching H1                 | @regression |
| FH-UI-02 | ZIP checker: in-area ZIP routes to the right town page (`01440` → Gardner, `01608` → Worcester)          | @regression |
| FH-UI-03 | ZIP checker: out-of-area ZIP shows the coverage message                                                  | @regression |
| FH-UI-04 | ZIP checker: empty or non-numeric input does not navigate                                                | @regression |
| FH-UI-05 | Help selector: choosing a need sets `aria-pressed` and shows the Recommended service                     | @regression |
| FH-UI-06 | FAQ accordion: expands and collapses, `aria-expanded` toggles, answer text visible                       | @regression |
| FH-UI-07 | Contact: empty submit shows all 9 field-specific errors, with fields marked `aria-invalid`               | @smoke      |
| FH-UI-08 | Contact: invalid ZIP and invalid email show specific messages (data-driven)                              | @regression |
| FH-UI-09 | Contact: in-area ZIP shows "Good news, we serve <town>"                                                  | @regression |
| FH-UI-10 | Contact: **mocked success**. The payload contains the faker-generated values; the success state is shown | @smoke      |
| FH-UI-11 | Contact: **mocked 500** shows the `role=alert` error, and entered data is retained                       | @regression |
| FH-UI-12 | Contact: honeypot field is hidden from users and assistive technology                                    | @regression |
| FH-UI-13 | Assessment: step 1 validation, Continue to step 2, Back keeps values, **mocked submit** payload          | @regression |
| FH-UI-14 | Refer: required-field validation and a **mocked "Send referral"** payload                                | @regression |
| FH-UI-15 | Careers: validation, resume upload of an allowed file type, and a **mocked submit** payload              | @regression |
| FH-UI-16 | `/paying-for-care` shows "Home care starting at $39/hour" (value from the data file)                     | @regression |
| FH-UI-17 | `/service-areas` lists 15 communities, and each opens the town page with a matching H1                   | @regression |
| FH-UI-18 | `/auth`: empty Sign In shows validation and sends no network request                                     | @regression |

**Accessibility**

| ID         | Test                                                                                                                          | Tags              |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| FH-A11Y-01 | axe scan with no serious or critical violations: home, contact, services, request-assessment, refer, careers, paying-for-care | @a11y @regression |
| FH-A11Y-02 | Skip link moves focus to `#main-content`                                                                                      | @a11y             |
| FH-A11Y-03 | Services menu can be opened and closed with the keyboard, and its items are reachable. **Exp. fail** (F-FH-02)                | @a11y             |
| FH-A11Y-04 | Contact form can be completed by keyboard alone, and errors are linked to inputs (`aria-describedby`)                         | @a11y             |
| FH-A11Y-05 | `/refer` exposes a `main` landmark. **Exp. fail** (F-FH-03)                                                                   | @a11y             |

**Visual** (Chromium only; dynamic regions masked)

| ID        | Test                               |
| --------- | ---------------------------------- |
| FH-VIS-01 | Header and footer components       |
| FH-VIS-02 | Home hero section                  |
| FH-VIS-03 | `/paying-for-care` pricing section |
| FH-VIS-04 | Contact form in its error state    |

**API and network**

| ID         | Test                                                                                                                | Tags  |
| ---------- | ------------------------------------------------------------------------------------------------------------------- | ----- |
| FH-API-01  | Key pages return 200 and `text/html`, and respond within budget                                                     | @api  |
| FH-API-02  | Security headers: HSTS ≥ 1 year with includeSubDomains, CSP, XFO DENY, nosniff, Referrer-Policy, Permissions-Policy | @api  |
| FH-API-03  | Caching: HTML is `no-cache`; hashed static assets are long-lived cacheable                                          | @api  |
| FH-API-04  | `robots.txt` references the sitemap, and the sitemap is valid XML                                                   | @api  |
| FH-API-05  | `http://` redirects to `https://`                                                                                   | @api  |
| FH-PERF-01 | Navigation timing and LCP on home and contact are under budget (single run, Chromium)                               | @perf |

**Responsive** (iPhone 13 project)

| ID        | Test                                                   |
| --------- | ------------------------------------------------------ |
| FH-MOB-01 | "Open menu" reveals the Mobile nav, and links navigate |
| FH-MOB-02 | Contact form validation and mocked submit on mobile    |

### 4.2 AfriShop

**Smoke**

| ID       | Test                                                                                        | Tags        | Notes                                                                |
| -------- | ------------------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------- |
| AS-SM-01 | Home renders a product grid with ≥ 1 priced card                                            | @smoke      |                                                                      |
| AS-SM-02 | Primary nav (Parcourir, Coller, Panier, Favoris, Commandes, Compte) reaches each page       | @smoke      |                                                                      |
| AS-SM-03 | Key pages log no console errors                                                             | @smoke      | **Exp. fail**: 406 on `settings`, CSP font blocks (F-AS-07, F-AS-08) |
| AS-SM-04 | Sitemap and footer URLs return 200 **and** don't render the SPA "404 / Page not found" view | @smoke @api | Soft-404 aware                                                       |
| AS-SM-05 | Search for "iphone" returns results                                                         | @smoke      |                                                                      |

**Functional (regression)**

| ID       | Test                                                                                                                                                                      | Tags        |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| AS-UI-01 | Search relevance: the result count is > 0, the "N produits affichés" count matches, and the top results contain the query term                                            | @regression |
| AS-UI-02 | Search with no results shows the empty state, and "Effacer la recherche" clears it                                                                                        | @regression |
| AS-UI-03 | Search sort: price ascending, then descending, checked as numeric order of the displayed prices                                                                           | @regression |
| AS-UI-04 | Home sort: "Moins cher d'abord" is ascending and "Plus cher d'abord" is descending                                                                                        | @smoke      |
| AS-UI-05 | Pagination: Previous is disabled on page 1, and Next shows a different set of products                                                                                    | @regression |
| AS-UI-06 | Country store buttons route to the store page (for example Turquie → `/turkey`) with products                                                                             | @regression |
| AS-UI-07 | Category page shows the "X / Y produits" count and the matching number of cards                                                                                           | @regression |
| AS-UI-08 | `/hot-products`: brand filter `aria-pressed` and price sort, with ordering asserted                                                                                       | @regression |
| AS-UI-09 | Product page: clicking a card opens a product with the same title; Article equals Total; quantity × unit price math holds; quantity can't go below 1                      | @smoke      |
| AS-UI-10 | Add to cart: the header badge count updates, and the cart contains the item with the chosen quantity                                                                      | @smoke      |
| AS-UI-11 | Cart (seeded): line total = price × quantity; incrementing and decrementing recompute the summary                                                                         | @smoke      |
| AS-UI-12 | Cart: deselecting an item excludes it from the total and from the "Procéder au paiement (n)" count                                                                        | @regression |
| AS-UI-13 | Cart: remove a line, "Vider le panier", empty state                                                                                                                       | @regression |
| AS-UI-14 | Cart persists across a reload                                                                                                                                             | @regression |
| AS-UI-15 | Checkout summary matches the cart (items, quantities, total)                                                                                                              | @regression |
| AS-UI-16 | Checkout validation: required fields and native email validation; no request is sent while invalid                                                                        | @regression |
| AS-UI-17 | Checkout **mocked submit**: intercept `auth-service`, assert the payload (name, email, phone, address, city, country "DR Congo"), fulfil with a mock, assert the hand-off | @smoke      |
| AS-UI-18 | Checkout **mocked failure** shows a user-friendly error. **Exp. fail**: the raw "Edge Function" message is shown (F-AS-02)                                                | @regression |
| AS-UI-19 | Track order: an unknown confirmation number shows "Commande non trouvée"                                                                                                  | @regression |
| AS-UI-20 | Paste-link: invalid input is rejected; a valid Amazon URL with a mocked price calculation shows the result                                                                | @regression |
| AS-UI-21 | Unknown product ID shows a not-found state with correct copy. **Exp. fail** (F-AS-04)                                                                                     | @regression |
| AS-UI-22 | `/my-orders` while logged out redirects to `/shop-auth?redirect=%2Fmy-orders`                                                                                             | @regression |
| AS-UI-23 | Favourite toggle on a card adds the item to `/saved`                                                                                                                      | @regression |
| AS-UI-24 | Language switch on `/account` changes UI strings (FR ↔ EN)                                                                                                                | @regression |

**Accessibility**

| ID         | Test                                                                                                                                 | Tags  |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----- |
| AS-A11Y-01 | axe scan with no serious or critical violations: home, search, product page, cart (seeded), checkout, track-order                    | @a11y |
| AS-A11Y-02 | All icon-only buttons (header cart and account, cart quantity and remove, favourites) have accessible names. **Exp. fail** (F-AS-05) | @a11y |
| AS-A11Y-03 | Search and sort can be operated by keyboard alone                                                                                    | @a11y |
| AS-A11Y-04 | Checkout form can be completed by keyboard, and all inputs have labels                                                               | @a11y |

**Visual** (Chromium only; prices, images and product grids masked)

| ID        | Test                                    |
| --------- | --------------------------------------- |
| AS-VIS-01 | Empty cart page                         |
| AS-VIS-02 | Track-order page                        |
| AS-VIS-03 | Checkout form (seeded single-item cart) |
| AS-VIS-04 | Footer                                  |
| AS-VIS-05 | `/how-it-works`                         |

**API and network**

| ID         | Test                                                                                                                                              | Tags  |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| AS-API-01  | Key pages return 200 within budget                                                                                                                | @api  |
| AS-API-02  | Security headers: HSTS, nosniff and Referrer-Policy                                                                                               | @api  |
| AS-API-03  | Unknown URL returns HTTP 404. **Exp. fail**: soft 404 (F-AS-04)                                                                                   | @api  |
| AS-API-04  | `robots.txt` disallows `/checkout`, `/shop-auth` and `/admin`; the sitemap is valid                                                               | @api  |
| AS-API-05  | Network contract: the `catalog-search` response the app receives has the expected shape (`items[]`, numeric `priceUsd`) and arrives within budget | @api  |
| AS-PERF-01 | Navigation timing and LCP on home and a product page (single run, Chromium)                                                                       | @perf |

**Responsive** (iPhone 13 project)

| ID        | Test                                                        |
| --------- | ----------------------------------------------------------- |
| AS-MOB-01 | Mobile home grid and search                                 |
| AS-MOB-02 | Mobile: product page → add to cart → cart → mocked checkout |

**Totals:** about 37 Faithfulness and 41 AfriShop test cases, which expand through data
and browser projects. Fewer, meaningful tests were chosen over raw count.

## 5. Candidate findings at planning time

> Superseded by [FINDINGS.md](FINDINGS.md), which records what was reproduced (F-AS-10 was withdrawn; F-FH-04/05
> and F-AS-11…16 were found during implementation).

| ID      | Site | Observation                                                                                                                                                                                         | Proposed severity            |
| ------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| F-FH-01 | FH   | The site's own CSP (`script-src`) blocks `googletagmanager.com/gtag/js?id=AW-…` on **every page**. Google Ads conversion tracking is likely not firing, and there is a console error on every page. | High (marketing attribution) |
| F-FH-02 | FH   | Services menu: hover or focus opens it, but click or Enter _closes_ it, and ArrowDown doesn't move into the menu. Confusing for mouse users and fails keyboard expectations.                        | Medium (a11y)                |
| F-FH-03 | FH   | `/refer` has no `<main>` landmark, unlike every other page.                                                                                                                                         | Low                          |
| F-AS-02 | AS   | When the backend call fails, shoppers see the raw technical message "Failed to send a request to the Edge Function".                                                                                | Medium (UX)                  |
| F-AS-04 | AS   | Soft 404s: unknown routes and missing products return HTTP 200. A missing product shows "This category is not available on AfriShop".                                                               | Low–Medium (SEO/UX)          |
| F-AS-05 | AS   | Icon-only buttons with no accessible name (header cart and account, cart quantity and remove, favourites).                                                                                          | Medium (a11y)                |
| F-AS-06 | AS   | Internal data-provider name leaks to shoppers ("from rainforest" in the cart). The French store also shows English strings ("Back to Shop", "View on Amazon", "No products found").                 | Low                          |
| F-AS-07 | AS   | `GET /rest/v1/settings?select=shipping_rate_per_kg` returns **406** on page load (console error).                                                                                                   | Low                          |
| F-AS-08 | AS   | The meta CSP blocks the Google Fonts stylesheets (Inter, Lora, Space Mono), so intended fonts never load.                                                                                           | Low                          |
| F-AS-09 | AS   | Footer "Télécharger l'app" links to `/download`, which redirects to `/hot-products`.                                                                                                                | Low                          |
| F-AS-10 | AS   | `/category/electronics` showed only its heading and no products after 10 s. **Unconfirmed**: may be slow loading.                                                                                   | TBD                          |

Nothing is filed until a Phase 3 test reproduces it deterministically.

## 6. Test design notes

- **Waiting strategy:** no `waitForTimeout` and no `networkidle` (AfriShop never
  reaches it). Use web-first `expect` assertions, plus `waitForResponse` where a
  specific API response is the trigger.
- **Locators:**
  - Role- and label-based throughout. Both sites label well, apart from the AfriShop
    icon-only buttons, which are a finding.
  - Where an accessible name is ambiguous (the homepage has "ZIP Code" and "ZIP code
    where care is needed *"), scope to the section or landmark, or use `exact: true`.
- **Mock matching:**
  - Faithfulness server-function hashes change with each deploy, so mocks match
    `**/_serverFn/**` with method POST and identify the call by its payload keys.
  - AfriShop mocks match the Edge Function name.
- **Test data:** faker generates names and emails, and phone numbers come from the
  reserved 555-01xx range. Typed data files hold the stable facts: nav items, services,
  towns, ZIP-to-town mapping, pricing copy and contact details.
- **Locale:** AfriShop runs with `locale: 'fr-FR'`. User-facing French strings live in
  the site data file, not inline in tests.
- **Visual baselines** are generated in CI (Linux, pinned Playwright image) for Chromium
  only, to avoid cross-OS font noise.

## 7. Folder structure

The implemented layout is documented in the [README](../README.md#project-structure). Relative to the proposal it
adds `src/core/network/` (guard and read-only request proxy), `tests/*/mobile` and `tests/*/perf` folders, a
`tests/framework` self-test project, and `docker-compose.yml` for rendering visual baselines in the CI image.

## 8. Decisions (resolved)

1. **Read-only POST allow-list:** approved for the four AfriShop endpoints, after verifying their request and
   response bodies (ADR-004). Matched against the full URL; everything else fails closed.
2. **Checkout depth:** approved. The journey covers discovery → product → cart → checkout validation → mocked
   registration (success, existing account, rejection, outage). No real registration, payment or order is possible.
3. **Findings:** documented as observations first, with evidence, without claiming impact or root cause that wasn't
   verified (ADR-007).

## 9. How implementation refined the plan

- **Tagging:** every test is `@regression`, and P1 tests are also `@smoke`, so regression genuinely includes smoke.
  `@mocked` marks tests whose action is answered by a mock (ADR-010).
- **Faithfulness forms:** server functions use the seroval wire format with a `{ ok, error }` contract. Mocks
  reproduce it, and tests decode the real payload (ADR-005). A conditional rule was found and tested: email becomes
  required when it is the preferred contact method.
- **Hydration:** SSR headings appear before React is interactive, so page objects wait for TanStack hydration, plus
  per-control hydration for the ZIP widget on WebKit (ADR-008).
- **AfriShop search:** shows a zero counter while loading and degrades under bursts (F-AS-12, F-AS-16). Waits and
  diagnostics were designed around both, and the number of live searches was kept small.
- **Soft 404s:** status-only link checks would always pass on the SPA, so AfriShop's sitemap sweep runs in a browser
  and detects the 404 view.
- **Cross-browser:** console and keyboard checks were made engine-neutral (each engine words CSP errors
  differently; WebKit on macOS reaches links with Option+Tab).
