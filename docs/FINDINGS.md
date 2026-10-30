# Findings

Defects and observations found while building and running this suite against the live sites (October 2026).

**How to read this document**

- **Classification.** A _verified defect_ is reproducible and deviates from a stated requirement, a standard (WCAG,
  HTTP) or the site's own behaviour elsewhere. An _observation_ is reproducible, but whether it is a defect, or what
  it affects, needs the owner's judgement. _Environment-related_ failures come from conditions outside the
  application under test (network, DNS, upstream services) and are listed separately below.
- Severity is a _proposed_ triage level for the site owner, not a confirmed business impact.
- Where an automated test exists it is named. Tests for open defects are marked `test.fail()` (they appear as
  "expected to fail" in the report and flip to "unexpected pass" once fixed) or annotate the report with a
  `known-issue` entry; nothing is hidden behind a skip.
- No exploitation was attempted. Security-relevant items are shared with the site owner and are not part of this
  public document, which is why some IDs are missing.
- All tests ran with a network guard that blocks every write to production, so none of the behaviours below were
  triggered for real (no leads, accounts or orders were created).

| ID                  | Site         | Summary                                                               | Classification             | Proposed severity    | Evidence                |
| ------------------- | ------------ | --------------------------------------------------------------------- | -------------------------- | -------------------- | ----------------------- |
| [F-FH-01](#f-fh-01) | Faithfulness | Google Ads tag referenced on every page but blocked by the site’s CSP | Verified defect            | Medium               | Automated (`test.fail`) |
| [F-FH-02](#f-fh-02) | Faithfulness | Services menu cannot be opened reliably with the keyboard             | Verified defect            | Medium               | Automated (`test.fail`) |
| [F-FH-03](#f-fh-03) | Faithfulness | `/refer` renders without the site header, footer and `<main>`         | Verified defect            | Medium               | Automated (`test.fail`) |
| [F-FH-04](#f-fh-04) | Faithfulness | Invalid list markup on most pages (axe, serious)                      | Verified defect            | Low                  | Automated (annotated)   |
| [F-FH-05](#f-fh-05) | Faithfulness | Low-contrast step numerals on `/paying-for-care`                      | Verified defect            | Low                  | Automated (annotated)   |
| [F-AS-02](#f-as-02) | AfriShop     | Raw "Edge Function" error shown to shoppers                           | Verified defect            | Medium               | Automated (`test.fail`) |
| [F-AS-04](#f-as-04) | AfriShop     | Soft 404s: unknown routes and products return HTTP 200                | Verified defect            | Low–Medium           | Automated (`test.fail`) |
| [F-AS-05](#f-as-05) | AfriShop     | Icon-only buttons and cart checkboxes have no accessible name         | Verified defect            | High (accessibility) | Automated (`test.fail`) |
| [F-AS-06](#f-as-06) | AfriShop     | Internal provider name and English strings in the French store        | Observation                | Low                  | Manual                  |
| [F-AS-07](#f-as-07) | AfriShop     | `settings` request returns HTTP 406 on every page load                | Observation                | Low                  | Automated (annotated)   |
| [F-AS-08](#f-as-08) | AfriShop     | The site’s CSP blocks resources it requests (Google Fonts, TikTok)    | Verified defect            | Low                  | Automated (annotated)   |
| [F-AS-09](#f-as-09) | AfriShop     | "Télécharger l'app" footer link lands on the popular-products page    | Observation                | Low                  | Manual                  |
| [F-AS-11](#f-as-11) | AfriShop     | Search results sorted "Prix: croissant" are not in price order        | Verified defect            | High (functional)    | Automated (`test.fail`) |
| [F-AS-12](#f-as-12) | AfriShop     | Catalogue endpoints return empty successes under sustained traffic    | Observation (load-related) | High (availability)  | Automated (diagnostics) |
| [F-AS-13](#f-as-13) | AfriShop     | Prices and helper text fail WCAG AA contrast                          | Verified defect            | Medium               | Automated (annotated)   |
| [F-AS-14](#f-as-14) | AfriShop     | Small touch targets; visible labels differ from accessible names      | Verified defect            | Low                  | Automated (annotated)   |
| [F-AS-15](#f-as-15) | AfriShop     | Firefox rejects two tracking cookies for an invalid domain            | Observation                | Low                  | Automated (annotated)   |
| [F-AS-16](#f-as-16) | AfriShop     | Search shows "0 produits affichés" while results are still loading    | Verified defect            | Low                  | Automated (diagnostics) |

`F-AS-10` (an empty `/category/electronics`) was raised during exploration and **withdrawn**: it was caused by the
exploration script blocking `HEAD` requests, not by the site.

## Environment-related failures

| Date (UTC) | Site     | What happened                                                                                                                                                         | How the suite reports it                                                                                            |
| ---------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 2026-10-30 | AfriShop | The storefront's backend API hostname stopped resolving (NXDOMAIN from public DNS resolvers), so catalogue, search and cart-pricing requests failed for every visitor | Failed tests carry an `environment` annotation ("backend unreachable") and are counted as _env._ in the run summary |

These are not counted as application regressions, but they are not hidden either: the run stays red until the
environment recovers, because shoppers are affected.

---

## Faithfulness Home Care

### F-FH-01

**Google Ads tag is referenced on every page but blocked by the site’s own Content Security Policy**

- **Steps:** Open any page with DevTools open, or run `every external script on the page is permitted by the page’s
own CSP` (`tests/faithfulness/api/http.spec.ts`).
- **Expected:** Every script the page includes is allowed by its CSP.
- **Actual:** The server-rendered HTML includes `https://www.googletagmanager.com/gtag/js?id=AW-…`, but the CSP
  `script-src` only allows `'self'`, `'unsafe-inline'` and `https://js.stripe.com`. Chromium, Firefox and WebKit all
  block the script and log a CSP error on every page.
- **What is not proven:** that conversions are being lost. If the business relies on Google Ads conversion tracking
  it is very likely not firing from this site, but that should be confirmed in the Ads console.
- **Suggested fix:** either add the Google tag origins to `script-src`/`connect-src`, or remove the tag.

### F-FH-02

**Header "Services" menu cannot be opened reliably with the keyboard**

- **Steps:** Tab to "Services" in the main navigation, press Enter. Test: `header Services menu opens with the
keyboard and keeps its links reachable`.
- **Expected:** Enter/Space toggles the menu open (`aria-expanded="true"`), and its links can be reached.
- **Actual:** The menu opens on focus or hover; pressing Enter (or clicking) _closes_ it. ArrowDown does not move into
  the menu. Mouse users who click "Services" see the menu they just hovered disappear.
- **Reference:** WCAG 2.1.1 Keyboard; WAI-ARIA disclosure pattern.

### F-FH-03

**`/refer` renders without the site header, footer and `<main>` landmark**

- **Steps:** Open `/refer` (linked from the main navigation). Tests: `/refer keeps the shared header and footer`,
  `/refer exposes a main landmark for assistive technology`.
- **Expected:** Same layout as every other page: header with navigation, footer with contact details, a `<main>`
  landmark that the skip link targets.
- **Actual:** None of these are rendered, so visitors lose site navigation and the phone number, and screen-reader
  users lose landmark navigation.

### F-FH-04

**Invalid list markup (axe `definition-list`, `list`, `listitem`, impact "serious")**

- A `<dl>` in a shared component contains children other than `<dt>`/`<dd>` on almost every page, and on the home page
  a `<ul>`/`<ol>` contains non-`<li>` children. Screen readers may announce the wrong item counts.
- Reported as `known-issue` annotations by the axe scans in `tests/faithfulness/a11y/accessibility.spec.ts`.

### F-FH-05

**Step numerals on `/paying-for-care` fail colour contrast (axe `color-contrast`)**

- The large "01, 02…" numerals use `text-accent/70`. They are `aria-hidden`, so impact is low, but they are visible
  text below the 4.5:1 ratio.

---

## AfriShop

### F-AS-02

**Raw technical error shown when the checkout backend is unreachable**

- **Steps:** Test `an unreachable backend produces a shopper-friendly error` makes the auth call fail at the network
  level.
- **Expected:** A friendly, French message ("Erreur de connexion, réessayez…").
- **Actual:** "Failed to send a request to the Edge Function" (the Supabase client’s internal error) is displayed.

### F-AS-04

**Soft 404s**

- **Steps:** Tests `unknown routes return HTTP 404` and `an unknown product shows a clear not-found message`.
- **Actual:** Any unknown URL returns HTTP 200 with a client-rendered "404" view. An unknown product ID shows "This
  category is not available on AfriShop", which is the wrong message, in English, on a French store.
- **Impact:** search engines may index error pages; shoppers following a stale product link get a confusing message.

### F-AS-05

**Icon-only controls have no accessible name (axe `button-name`, impact "critical")**

- Header cart and menu buttons, the mobile search button, cart quantity −/+ and remove buttons, the cart item
  selection checkbox, and the icon buttons on product cards (639 unnamed buttons on one search page).
- Screen-reader users hear "button" with no purpose. Test: `header icon buttons have accessible names`; axe scans
  annotate the rest.
- Side effect for this suite: these controls can only be located by their icon (documented in the page objects).

### F-AS-06

**Internal provider name and untranslated strings** _(manual observation)_

- The cart shows "From Rainforest" (the name of a data provider, not the store) under each item.
- English strings in the default French UI: "Back to Shop", "View on Amazon", "Product Not Found" (page title),
  "No products found", "Account created successfully!".

### F-AS-07

**`GET …/rest/v1/settings?select=shipping_rate_per_kg` returns HTTP 406 on every page load**

- A 406 from PostgREST usually means a single-row request matched no row. The column or row the app expects
  appears to be missing; whether shipping estimates are affected was not verified.

### F-AS-08

**The site’s own CSP blocks resources it requests**

- The Google Fonts stylesheets (Inter, Lora, Space Mono) are blocked by `style-src`, so the intended fonts never
  load; the TikTok pixel’s IPv6 endpoint is blocked by `connect-src`. Annotated by the console sweep, together with
  a browser console notice the `<meta>`-delivered policy triggers on every page.

### F-AS-09

**"Télécharger l'app" footer link lands on the popular-products page** _(manual observation)_

- `/download` redirects to `/hot-products`; shoppers looking for the app do not find it.

### F-AS-11

**Search results labelled "Prix: croissant" are not in ascending price order**

- **Steps:** Search "samsung". Test: `results honour the selected price sort`.
- **Expected:** Prices ascend.
- **Actual:** Two provider result lists appear to be interleaved, each sorted on its own. Reproducible across runs and
  queries: "samsung" had 95 out-of-order neighbours in 485 results, "laptop" 13, "iphone" 6. The home-page grid sort
  is correct.

### F-AS-12

**Catalogue endpoints return fast, empty HTTP 200 responses under sustained traffic**

- **Observed:** During multi-browser runs (sustained traffic from one IP), every `catalog-search` call in a test
  returned **HTTP 200 with zero items in ~300–500 ms**, while the same queries normally return hundreds of items in
  2–6 s; the home grid then showed "Aucun téléphone trouvé." Spaced requests (one every 20 s) were always healthy.
- **Why it matters:** the failure is silent. Shoppers see "Aucun produit trouvé" for popular products, and monitoring
  that watches for HTTP errors would not notice.
- **What is not proven:** the cause. The pattern is consistent with upstream rate limiting that is converted into an
  empty success. It should be confirmed from the edge-function logs.
- **In the suite:** the AfriShop fixture records every catalogue response and, when a test fails while a catalogue
  endpoint returned zero items, annotates the failure with F-AS-12 and attaches `catalog-responses.json`.

### F-AS-13

**Colour contrast below WCAG AA** — prices (orange on dark), footer copyright, "N sélectionné(s)" helper text and the
checkout sign-in prompt (axe `color-contrast`, serious).

### F-AS-14

**Touch targets and label mismatches** — the hero carousel dots are smaller than 24×24 px (`target-size`), and the
"Acheter par pays" buttons’ accessible names differ from their visible text (`label-content-name-mismatch`).

### F-AS-15

**Firefox rejects the `_fbp` and `_tt_enable_cookie` tracking cookies for an invalid domain.** Seen with and without
the test network guard. Analytics attribution in Firefox may be affected.

### F-AS-16

**Search briefly reports "0 produits affichés" while results load.** On a slow search (2–6 s) the counter reads zero
before the results arrive, which looks like "no results" to a shopper.
