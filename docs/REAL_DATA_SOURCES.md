# Real Turkish grocery price source evaluation

Research date: 2026-09-19

## Decision

**Open Prices by Open Food Facts is `APPROVED_FOR_POC`.** It publishes a documented read API and bulk exports under
the Open Database License (ODbL). Its records can include barcode, product metadata, observed and regular price,
discount state, observation date, proof, and an OpenStreetMap location. A live API check found 27 TRY records; the
latest records included Turkish supermarket locations. The dataset is sparse, crowdsourced, and is not an
authoritative retailer feed. It is suitable for proving the connector and provenance path, not for production
coverage or guaranteed current offers.

No retailer site, Market Fiyatı site, private application endpoint, or browser traffic was scraped or reverse
engineered. The first connector uses only the documented Open Prices API.

## Classification criteria

- `APPROVED_FOR_POC`: owner-published programmatic access and reuse terms are clear enough for this limited POC.
- `NEEDS_PERMISSION`: useful data exists, but a contract, written permission, partner access, or credentials are required.
- `UNSUITABLE`: legitimate source, but its data does not meet the retail product-price use case.
- `UNKNOWN`: evidence is insufficient to establish programmatic access or reuse rights.

## Comparison

| Candidate | Owner | Available data | Frequency and geography | Access, authentication, limits | Reuse and commercial status | Stability / integration | Classification |
|---|---|---|---|---|---|---|---|
| [Open Prices](https://openfoodfacts.github.io/open-prices/guides/data/) | Open Food Facts association and contributors | Barcode or category product, price, regular price, discount marker, date, proof, OSM store/location; product name, brand, package and taxonomy through linked Open Food Facts data. No reliable stock. | Contributor driven, irregular, global and store level. Live check: 27 TRY records and Turkish OSM locations; newest was 2026-09-05. | Public documented REST API and exports. Reads need no account; writes require authentication. Documentation does not publish a numeric Open Prices read limit. The connector uses identification, timeouts, bounded retries, pagination and `Retry-After`. | ODbL permits reuse, including commercial reuse, subject to attribution, notice, and share-alike obligations for derived databases. Product images have separate CC BY-SA and possible embedded rights; this connector does not ingest images. | Public API and exports are technically straightforward. Data completeness, contributor accuracy, and OSM location selection are the main risks. | **APPROVED_FOR_POC** |
| [Market Fiyatı](https://tubitak.gov.tr/tr/haber/zincir-market-fiyatlarina-aninda-erisimin-onu-acildi) | TÜBİTAK BİLGEM; data supplied by seven chains | Nearly 50,000 products and branch prices across A101, BİM, CarrefourSA, Hakmar, Migros, Tarım Kredi and ŞOK. Public announcement does not establish stock coverage. | Described as current/instant comparison with branch data; national scope. | Consumer website/app. No owner-published public API, authentication scheme, pagination, rates, or developer agreement found. Data is shared with named partners CimriMarkette and MarketTamam. | [Site terms](https://marketfiyati.org.tr/kullanim-kosullari) reserve rights and state that public access is not a license; copying, source extraction, modification, and derivatives are restricted. Commercial data reuse is not authorized by public access. | High value and likely operationally stable, but an official partner agreement and API specification are required. | **NEEDS_PERMISSION** |
| [TÜFİS](https://antalya.tarimorman.gov.tr/Menu/51/Koordinasyon-Ve-Tarimsal-Veriler) | Ministry of Agriculture and Forestry | Daily producer, intermediary, wholesale and market prices for selected agricultural products and variants. No packaged SKU/EAN, promotion, stock, or retailer listing contract documented. | Daily district entry into Tarım Bilgi Sistemi. | Operational government system; no public developer API or reuse license found. | Public pages describe the collection, not a right to reuse the underlying records commercially. Written data access terms are needed. | Useful for agricultural reference prices, difficult fit for canonical packaged products. | **NEEDS_PERMISSION** |
| [TÜİK CPI microdata / retail scanner collection](https://cdniys.tarimorman.gov.tr/api/File/GetFile/422/Sayfa/659/952/DosyaGaleri/4_1_rip_20222026.pdf) | Turkish Statistical Institute with retailer submissions | Daily barcode sales/price data supplied directly by chains for official statistics; public CPI outputs are aggregates. | Daily collection, branch and barcode inputs; published output is aggregate periodic statistics. | Item-level scanner data is a restricted statistical input. No public product-price feed found. | Statistical confidentiality and data agreements apply. Public aggregate indexes do not authorize reuse of the microdata. | Authoritative for statistics but unavailable for this product workflow. | **NEEDS_PERMISSION** |
| [Hal Kayıt Sistemi price bulletin](https://www.hal.gov.tr/Sayfalar/HalKay%C4%B1tSistemi.aspx) | Ministry of Trade | Produce type, variety, production type, average wholesale price, volume and unit; wholesale-market registry also holds transaction parties and quantities. | Daily national wholesale produce data, with market/location concepts. | Public human-facing queries exist. Registered notification services exist, but no public price reuse API/license was found for this POC. | No clear owner-published license for bulk commercial reuse was found. | Structured and official, but wholesale produce averages do not represent retailer SKU prices, promotions, stock, or branches. | **UNSUITABLE** |
| Retailer consumer sites and apps: Migros, CarrefourSA, A101, ŞOK, BİM | Each retailer | Public product pages/campaigns may show products and prices; availability and pricing can depend on address/branch. Stock may be exposed to customers. | Frequently changing, store/address specific. | No official public developer API or reusable product feed documentation was found. Public web access is not feed authorization. Migros has a [B2B platform](https://b2b.migros.com.tr/Home/Bilgilendirme) for commercial partners, not a public consumer price API. | No public license authorizing bulk commercial price reuse was found. A direct retailer contract is required. | Potentially best production quality with authorization; high legal and operational dependency. | **NEEDS_PERMISSION** |
| Market Fiyatı partners / comparison services: CimriMarkette, MarketTamam | Respective companies; upstream data named by TÜBİTAK | Comparison products/prices derived through a named data-sharing relationship. Public evidence does not show a downstream feed for third parties. | Appears current and Turkey focused. | No public developer feed, authentication, rates, or downstream license found. | Named partner access does not grant this project reuse rights. | Technically promising if a data distribution contract is offered. | **NEEDS_PERMISSION** |
| Authorized affiliate/product feeds | Retailer or affiliate network under contract | Often product ID, title, URL, image, price and campaign fields; branch/stock coverage depends on the merchant. | Merchant-specific. | No owner-published grocery feed available to this project was identified. Publisher approval and feed credentials are normally required. | Rights depend on the signed publisher/merchant terms; none are currently in place. | Good connector fit after account approval, but status cannot be established without a named feed contract. | **UNKNOWN** |
| [Open Food Facts product database](https://openfoodfacts.github.io/openfoodfacts-server/api/) | Open Food Facts association and contributors | EAN, name, brand, package, category, ingredients, nutrition and images. It is product master data, not a current Turkey retailer-price feed. | Contributor driven, global. | Documented API; search is limited to 10 requests/minute/IP and bulk users are directed to exports. | ODbL product database; images use separate terms. Reusable with license compliance. | Useful enrichment and identity source. Alone it cannot meet price, promotion, branch or stock requirements. | **UNSUITABLE** as a price source |
| [Verified by GS1](https://support.gs1.org/support/solutions/articles/43000734119-what-information-is-available-in-verified-by-gs1-) / GS1 Türkiye | GS1 and GS1 Türkiye | Company and basic GTIN product identity: brand, description, category, image URL, net content and country of sale. Barcode generally does not contain price. | Product master data; not a price observation feed. | Public lookup is limited to 30 queries/day; advanced API access is through membership/local GS1 organization. GS1 Türkiye documents paid/API partner services. | Contract/membership terms apply to advanced use. No retail price or promotion grant. | Strong identity verification, but does not solve current retail price ingestion. | **UNSUITABLE** as a price source |
| [TürKomp](https://turkomp.tarimorman.gov.tr/useofdata) | Ministry of Agriculture and Forestry | Turkish food composition and nutrition data. No retailer, branch, promotion, stock, or current price records. | Reference dataset. | Public site with separate data-use rules. | Commercial website/software use requires the stated license/payment route. | Technically usable for nutrition enrichment only. | **UNSUITABLE** |

## Selected source and safeguards

The POC connector selects Open Prices because both programmatic access and reuse terms are published by the owner,
and the API payload fits `PriceSourceConnector` without discovering private endpoints. It maps only records that:

1. use TRY;
2. have an OSM location with country code `TR`;
3. identify one of the store chains already supported by the application;
4. contain a valid-length EAN, product name, brand, supported package unit, integer normalized package quantity,
   a mapped category, price, and observation date.

The connector preserves the API price record URL, source name/type, source checksum, retrieval time, external EAN,
branch name/city/coordinates, observation date, regular price where supplied, and ingestion run. It does not import
proof images. The observations remain `SUPPLIED_UNVERIFIED`; proof presence does not convert a community record into
retailer-authoritative data.

Network behavior is bounded: a 10-second request timeout, three attempts by default, exponential backoff for network
errors and HTTP 408/429/5xx, a five-second cap on `Retry-After`, a maximum import limit of 500 records, and API
pagination. A non-retryable response raises a structured error. Individual validation or match failures remain
auditable ingestion rows while other records continue.

## Setup and execution

No credentials are required for documented read access. Configure identification and an optional alternate endpoint:

```sh
OPEN_PRICES_BASE_URL="https://prices.openfoodfacts.org"
OPEN_PRICES_USER_AGENT="market-tasarruf-asistani/0.1 (contact@example.com)"
```

Use a real project contact in the user agent before shared or production execution.

```sh
pnpm db:migrate
pnpm ingest:open-prices --limit 25
```

## Live POC validation

The local validation on 2026-09-20 fetched 25 live TRY records through the documented API:

- 4 records passed the Turkey, retailer, product identity, category and package mapping requirements;
- the first run created 4 canonical products, 4 retailer listings, 4 branch-linked `PriceObservation` rows and
  corresponding daily history rows;
- the observations came from Migros, BİM and A101 and retained direct API record URLs and
  `SUPPLIED_UNVERIFIED` status;
- 21 records could not be safely mapped because one or more required fields or supported mappings were absent;
  they were retained as failed `IngestionRow` records on the partial run;
- a replay created no observations and marked all 4 valid records as duplicates;
- `unmatchedCount` was 0 because every record that passed connector mapping was catalog-synced by EAN before
  deterministic matching; records that could not meet the input contract were failures rather than match guesses.

The newest imported observation was dated 2026-09-05. With the existing 72-hour freshness rule, the live API
correctly returned no current offer for an Algida need on 2026-09-20. A BullMQ evaluation run completed without
failure and created no deal, alert, or notification for that stale observation. The imported records remain
visible in database provenance and history, while fictional seed data remains identifiable as `DEMO_SEED`.

## Production decision

Open Prices should remain a supplemental community source. Production coverage needs one of:

- a written TÜBİTAK BİLGEM / Market Fiyatı partner agreement with API documentation, permitted purposes,
  commercial and redistribution rights, caching/retention rules, geographic fields, limits, SLA, and credentials;
- a direct retailer product/price/stock feed contract with the same points defined; or
- an approved affiliate publisher account whose merchant feed explicitly permits grocery price comparison and
  downstream display.

ODbL attribution and share-alike implications should be reviewed before combining Open Prices into a proprietary
production database. This report is a technical source assessment, not legal advice.

## Phase 16 onboarding gate

As of 2026-09-25, no Market Fiyatı/TÜBİTAK, direct retailer, or affiliate-network credentials and written commercial
usage rights are configured. The platform must therefore not implement scraping, private endpoint discovery, or
automatic production ingestion for those sources.

Before the first authoritative Turkish grocery-price source can be connected, collect the items listed in
`docs/PHASE16_OPERATIONAL_READINESS.md`: owner/contact, written authorization, commercial display rights, retention
rules, documented feed/API specification, credentials, rate limits, geographic coverage and expected record counts.

The adapter contract for that future connector is prepared in `packages/ingestion/src/authorized-feed.ts`.
