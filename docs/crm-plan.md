# Plan — Agentic CRM (HubSpot replacement)

A lightweight, opinionated CRM for our sales team. Companies are the top-level
object; Contacts and Deals hang off them; everything that happens is an
**Activity** on a timeline. Company knowledge is filled in by an agent using
[Context.dev](https://docs.context.dev) rather than typed by a human.

This is the build plan: decisions, data model, contracts, conventions and
phased delivery. Read it with [`AGENTS.md`](../AGENTS.md),
[`design.md`](./design.md) and [`api.md`](./api.md).

---

## 1. The decisions that stop this becoming a nightmare

Five choices carry the whole design. Everything else follows from them.

1. **Core fields are real columns. Custom fields are one JSONB column.** Not
   EAV. A table showing eight custom columns must not become eight joins. §5.
2. **One property registry drives columns, filters, forms and the detail
   sheet.** System fields and custom fields are described by the *same*
   metadata, so adding a column to the CRM is a data change, not four code
   changes. §5.
3. **Permissions are enforced in the tRPC middleware and again in the service.**
   The UI hides buttons; it never guards anything. Row-level ownership is a
   service concern because no statement grammar can express it. §6.
4. **Sheets, not inner pages.** A row click opens a sheet keyed by a URL param.
   Back button closes it, links are shareable, and we never build a
   `/companies/[id]/contacts/[id]/edit` route tree. §10.
5. **Everything that lists data is the same `DataTable`.** Ported verbatim from
   `mvp`, driven by nuqs, paginated server-side. §10.

### Choice table

| Decision | Choice | Why |
| --- | --- | --- |
| Tenancy | Single tenant, no organizations | Repo is already built this way (`20260731160000_remove_organizations`); internal tool, Google-only sign-in. |
| Hosting | Both apps on Vercel | §2 — with the serverless consequences handled explicitly, not discovered later. |
| Data fetching | tRPC end to end, prefetched in RSC | Type-safe Prisma→cell; first paint is already filtered. |
| Table state | nuqs, server-side page/sort/filter | Shareable URLs; 100k rows stay fast. |
| Data table | mvp's `DataTable` into `packages/ui` | `design.md` makes `/packages/ui` the source of truth; `simple-table` and `card-table` already live there. |
| Custom fields | JSONB + `PropertyDefinition` registry | §5. |
| Associations | Many-to-many, three typed join tables, labels + primary flags | HubSpot parity; a contact really can sit on two accounts. §4. |
| Lifecycle / lead status | First-class enum columns on Company and Contact | They drive filters and reporting; HubSpot parity. §4. |
| Last activity date | Denormalised `lastActivityAt` column, written with the activity | It's a sortable column on every list; a subquery per row would be the slowest thing here. §4. |
| Saved views | `SavedView` row storing a serialised query string | Falls out of URL-as-state for almost nothing. §11. |
| RBAC | Better Auth `admin` plugin + `createAccessControl` | §6. No orgs, so the org plugin's role model doesn't apply. |
| Attachments | Vercel Blob, client uploads, presigned reads | §7. |
| Speed | Redis for sessions, property defs and aggregates + RSC prefetch | §8. |
| Forms | `react-hook-form` + `zodResolver` + `@crm/ui` Field primitives | §11 — matches mvp exactly. |
| Effects | Banned, lint-enforced, `useMountEffect` escape hatch | §12. |
| Comments | None in new code | §12. |

### Judgment calls worth your veto

- **`UNQUALIFIED_TO_BUY` is terminal, not linear.** You listed it between two
  active stages, but it's a disqualification. Treated like `CLOSED_LOST`:
  excluded from pipeline value and forecast, shown under a Closed tab. Say the
  word if you want it mid-funnel.
- **Reps read everything, write only what they own.** Sales teams need
  visibility; letting anyone edit anyone's deal is how data rots. Activities are
  the exception — anyone can log an activity against any record.
- **`Company.domain` and `Contact.email` are unique.** Duplicates are the #1
  way a CRM rots, and it makes the HubSpot import idempotent. Cost: two people
  behind one `info@` need separate records.
- **Not everything is a custom property.** The sales-critical fields are real
  columns with real constraints. Custom properties exist for the team's own
  additions. Making everything dynamic is the Salesforce trap.
- **Many-to-many associations everywhere, with labels and primary flags.** Your
  call, over my earlier suggestion to flatten them. It costs a join on every
  company column and turns the company timeline into a union (§4) — both
  handled, neither free. In exchange the model matches how you actually sell,
  and we never hit the wall where a contact genuinely sits on two accounts.
- **No Tickets, Quotes, Subscriptions, Payments, Orders or Payment links.** The
  record sidebars in your screenshots are mostly empty `(0)` cards. Rebuilding
  those is rebuilding HubSpot. §15.

### Repo issues found while surveying

- **`docs/review.md` does not exist** but `AGENTS.md` says "Always review" it.
  Every agent session currently starts by failing to read a required file.
- **`docs/api.md` describes a multi-tenant world this repo doesn't have.** The
  org-context and per-org cache-generation sections came from the MVP; there are
  no organizations here. The logging rules apply verbatim and must stay. Trim
  the rest in Phase 0.
- `apps/app/make-session.tmp.ts` is a stray scratch file.
- The existing codebase is heavily commented. The no-comments rule applies to
  new code; existing comments are left alone rather than churned.

---

## 2. Hosting on Vercel, and what it costs us

Vercel is a serverless platform. Three things about this stack break there if
we don't design for them, and all three are cheap to handle now and expensive
to retrofit.

**The API runtime changes from Bun to Node.** `apps/api` currently builds with
`bun build --target=bun` and runs `bun src/main.ts`. Vercel has no Bun runtime.
NestJS deploys as a single Node serverless function via `@vercel/node`, with a
cached bootstrap so warm invocations reuse the Nest app:

```ts
let cached: Promise<INestApplication> | null = null;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  cached ??= bootstrap();
  const app = await cached;
  app.getHttpAdapter().getInstance()(req, res);
}
```

Keep the Bun scripts for local dev; add Node build/start scripts for Vercel.
`bun test` stays as-is for local test runs.

**Fire-and-forget dies on serverless.** The function freezes once the response
is sent, so `void this.enrichment.enqueue(id)` silently never finishes. Use
`waitUntil` from `@vercel/functions` — the same primitive mvp already relies on
per `docs/api.md`. Enrichment is a ~7–18s Context.dev call, comfortably inside
the function budget. When volume outgrows it, move to a durable queue; the
`EnrichmentService` interface stays the same either way, which is the point of
putting it behind a service in the first place.

**Postgres connections exhaust.** Every concurrent invocation is a new client.
Use a pooled connection string for the app and a direct one for migrations:

```
DATABASE_URL="postgres://...pooler...?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgres://...direct..."
```

with `directUrl` in the Prisma datasource. Neon or Supabase both give you this;
so does Prisma Accelerate. Getting this wrong produces "too many connections"
under load and nothing before it.

**Redis must be serverless-friendly.** Provision Upstash through the Vercel
Marketplace. `@keyv/redis` (already a dependency) speaks the Redis protocol,
which Upstash supports over TLS; Fluid Compute keeps the connection alive
across invocations.

### Deployment shape

Two Vercel projects from one repo: `crm-app` (root `apps/app`) and `crm-api`
(root `apps/api`). Turborepo remote caching on. `apps/app` rewrites `/api/*` to
the API deployment, so the browser stays same-origin and the session cookie
just works.

---

## 3. Architecture

```
browser
  │  same-origin /api/trpc
  ▼
apps/app  (Next.js 16, RSC)                        Vercel project crm-app
  ├─ app/api/[...path]/route.ts ──proxy──▶ crm-api
  ├─ server components: getServerTrpc() → prefetch → HydrationBoundary
  └─ client: useTRPC() + TanStack Query, nuqs for all table + sheet state
                                              │
apps/api  (NestJS, Node function)              ▼    Vercel project crm-api
  ├─ /api/trpc          routers: companies contacts deals activities
  │                              properties attachments users dashboard
  ├─ /api/auth/*        Better Auth (Google) + admin plugin (RBAC)
  ├─ /api/blob/upload   client-upload token handshake
  ├─ services           Prisma, property validation, ownership guards
  └─ enrichment         Context.dev via waitUntil
        │                       │                   │
   Postgres (pooled)         Redis (Upstash)    Vercel Blob
   packages/db              sessions, defs,     attachments
                            aggregates
```

### Dependencies to add

| Package | Where | Version |
| --- | --- | --- |
| `@trpc/server`, `zod` | `apps/api` | `^11.18.0`, `^4.4.3` |
| `@trpc/client`, `@trpc/server`, `@trpc/tanstack-react-query` | `apps/app` | `^11.18.0` |
| `@tanstack/react-query`, `@tanstack/react-query-devtools` | `apps/app` | `^5.101.2` |
| `nuqs` | `apps/app`, `packages/ui` | `^2.8.9` |
| `zod`, `@hookform/resolvers` | `apps/app` | `^4.4.3`, latest |
| `@vercel/blob`, `@vercel/functions` | `apps/api`, `apps/app` | latest |
| `keyv`, `@keyv/redis` | `packages/auth` | matching `apps/api` |
| `context.dev` | `apps/api` | latest |

`nestjs-trpc@^2.13.0`, `@keyv/redis`, `cache-manager`, `react-hook-form` and
`better-auth@^1.6.25` are already present.

---

## 4. Core data model

Auth models are owned by Better Auth and regenerated by `bun run auth:generate`
— never hand-edited. `User` gains only back-relations (`CompanyOwner`,
`ContactOwner`, `DealOwner`, `ActivityAuthor`, `AttachmentUploader`,
`SavedViewAuthor`) plus the `admin` plugin's fields (§6).

`SavedView` below references `PropertyEntity`, which is declared in §5 — Prisma
schemas are order-independent, so the split across sections is presentational
only. It is all one `schema.prisma`.

```prisma
enum DealStage {
  DEMO_BOOKED
  QUALIFIED_TO_BUY
  UNQUALIFIED_TO_BUY
  DECISION_MAKER_BOUGHT_IN
  CONTRACT_SENT
  CLOSED_WON
  CLOSED_LOST
}

enum LifecycleStage {
  SUBSCRIBER
  LEAD
  MARKETING_QUALIFIED_LEAD
  SALES_QUALIFIED_LEAD
  OPPORTUNITY
  CUSTOMER
  EVANGELIST
  OTHER
}

enum LeadStatus {
  NEW
  OPEN
  IN_PROGRESS
  OPEN_DEAL
  UNQUALIFIED
  ATTEMPTED_TO_CONTACT
  CONNECTED
  BAD_TIMING
}

enum ForecastCategory {
  PIPELINE
  BEST_CASE
  COMMIT
  CLOSED
  OMITTED
}

enum RecordSource {
  MANUAL
  IMPORT
  ENRICHMENT
  API
}

enum ActivityType {
  NOTE
  CALL
  EMAIL
  MEETING
  TASK
  STAGE_CHANGE
  LIFECYCLE_CHANGE
  ENRICHMENT
}

enum EnrichmentStatus { PENDING RUNNING COMPLETE FAILED SKIPPED }

model Company {
  id          String  @id @default(cuid())
  name        String
  domain      String? @unique
  website     String?
  description String?

  logoUrl     String?
  logoDarkUrl String?
  iconUrl     String?
  brandColor  String?

  industry       String?
  subIndustry    String?
  streetAddress  String?
  streetAddress2 String?
  city           String?
  stateCode      String?
  postalCode     String?
  country        String?
  countryCode    String?

  phone       String?
  email       String?
  linkedinUrl String?
  twitterUrl  String?
  githubUrl   String?
  pricingUrl  String?
  careersUrl  String?

  lifecycleStage          LifecycleStage @default(LEAD)
  lifecycleStageChangedAt DateTime       @default(now())
  leadStatus              LeadStatus?
  recordSource            RecordSource   @default(MANUAL)
  lastActivityAt          DateTime?

  ownerId String?
  owner   User?   @relation("CompanyOwner", fields: [ownerId], references: [id], onDelete: SetNull)

  enrichmentStatus EnrichmentStatus @default(PENDING)
  enrichedAt       DateTime?
  enrichmentError  String?
  enrichment       CompanyEnrichment?

  customFields Json @default("{}")

  contacts    CompanyContact[]
  deals       CompanyDeal[]
  activities  Activity[]
  attachments Attachment[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([ownerId])
  @@index([name])
  @@index([lifecycleStage])
  @@index([lastActivityAt])
  @@index([createdAt])
  @@index([customFields], type: Gin)
  @@map("company")
}

model CompanyEnrichment {
  companyId String   @id
  company   Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  source    String   @default("context.dev")
  raw       Json
  fetchedAt DateTime @default(now())

  @@map("companyEnrichment")
}

model Contact {
  id          String  @id @default(cuid())
  firstName   String
  lastName    String?
  email       String? @unique
  phone       String?
  title       String?
  linkedinUrl String?

  lifecycleStage          LifecycleStage @default(LEAD)
  lifecycleStageChangedAt DateTime       @default(now())
  leadStatus              LeadStatus?
  buyingRole              String?
  recordSource            RecordSource   @default(MANUAL)
  lastActivityAt          DateTime?

  ownerId String?
  owner   User?   @relation("ContactOwner", fields: [ownerId], references: [id], onDelete: SetNull)

  customFields Json @default("{}")

  companies   CompanyContact[]
  deals       DealContact[]
  activities  Activity[]
  attachments Attachment[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([ownerId])
  @@index([lifecycleStage])
  @@index([leadStatus])
  @@index([lastActivityAt])
  @@index([createdAt])
  @@index([customFields], type: Gin)
  @@map("contact")
}

model Deal {
  id      String @id @default(cuid())
  name    String
  ownerId String
  owner   User   @relation("DealOwner", fields: [ownerId], references: [id])

  stage             DealStage        @default(DEMO_BOOKED)
  stageChangedAt    DateTime         @default(now())
  forecastCategory  ForecastCategory @default(PIPELINE)
  amount            Decimal?         @db.Decimal(14, 2)
  currency          String           @default("USD")
  expectedCloseDate DateTime?
  closedAt          DateTime?
  closedReason      String?
  recordSource      RecordSource     @default(MANUAL)
  lastActivityAt    DateTime?

  customFields Json @default("{}")

  companies   CompanyDeal[]
  contacts    DealContact[]
  activities  Activity[]
  attachments Attachment[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([ownerId])
  @@index([stage])
  @@index([expectedCloseDate])
  @@index([lastActivityAt])
  @@index([createdAt])
  @@index([customFields], type: Gin)
  @@map("deal")
}

enum AssociationPairing {
  COMPANY_CONTACT
  COMPANY_DEAL
  DEAL_CONTACT
}

model CompanyContact {
  companyId String
  company   Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  contactId String
  contact   Contact @relation(fields: [contactId], references: [id], onDelete: Cascade)

  isPrimaryCompany Boolean @default(false)
  isPrimaryContact Boolean @default(false)
  label            String?

  createdAt DateTime @default(now())

  @@id([companyId, contactId])
  @@index([contactId])
  @@map("companyContact")
}

model CompanyDeal {
  companyId String
  company   Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  dealId    String
  deal      Deal    @relation(fields: [dealId], references: [id], onDelete: Cascade)

  isPrimaryCompany Boolean @default(false)
  label            String?

  createdAt DateTime @default(now())

  @@id([companyId, dealId])
  @@index([dealId])
  @@map("companyDeal")
}

model DealContact {
  dealId    String
  deal      Deal    @relation(fields: [dealId], references: [id], onDelete: Cascade)
  contactId String
  contact   Contact @relation(fields: [contactId], references: [id], onDelete: Cascade)

  isPrimaryContact Boolean @default(false)
  label            String?

  createdAt DateTime @default(now())

  @@id([dealId, contactId])
  @@index([contactId])
  @@map("dealContact")
}

model AssociationLabel {
  id      String             @id @default(cuid())
  pairing AssociationPairing
  value   String
  label   String
  order   Int                @default(0)

  @@unique([pairing, value])
  @@map("associationLabel")
}

model Activity {
  id      String       @id @default(cuid())
  type    ActivityType
  subject String?
  body    String?

  occurredAt  DateTime?
  dueAt       DateTime?
  completedAt DateTime?

  companyId String?
  company   Company? @relation(fields: [companyId], references: [id], onDelete: Cascade)
  contactId String?
  contact   Contact? @relation(fields: [contactId], references: [id], onDelete: Cascade)
  dealId    String?
  deal      Deal?    @relation(fields: [dealId], references: [id], onDelete: Cascade)

  createdById String
  createdBy   User   @relation("ActivityAuthor", fields: [createdById], references: [id])
  meta        Json?

  attachments Attachment[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([companyId, createdAt])
  @@index([dealId, createdAt])
  @@index([contactId, createdAt])
  @@index([dueAt])
  @@map("activity")
}

model SavedView {
  id     String         @id @default(cuid())
  entity PropertyEntity
  name   String
  search String
  shared Boolean        @default(false)
  order  Int            @default(0)

  createdById String
  createdBy   User   @relation("SavedViewAuthor", fields: [createdById], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([entity, createdById])
  @@map("savedView")
}
```

**`Activity.companyId` is denormalised, and many-to-many complicates it.** It is
stamped with the *primary* company of whatever the activity hangs off, so the
common case — one company, one timeline — stays a single indexed range scan.

But under M2M an activity on a deal shared by two companies belongs on both
timelines, and one stamped column cannot say that. The company timeline is
therefore a union:

```sql
WHERE "companyId" = $1
   OR "dealId"    IN (SELECT "dealId"    FROM "companyDeal"    WHERE "companyId" = $1)
   OR "contactId" IN (SELECT "contactId" FROM "companyContact" WHERE "companyId" = $1)
```

Every branch is indexed, and a company with a few hundred associated records
resolves in single-digit milliseconds. The denormalised column still earns its
place: it keeps the overwhelmingly common single-company read on one index, and
it is what `lastActivityAt` propagation walks.

If a company ever accumulates thousands of associated records, the fix is an
`ActivityCompany` fan-out table written alongside the activity. Do not build it
now — measure first. Noting it here so the upgrade path is deliberate rather
than a rewrite.

**`lastActivityAt` is denormalised too, and this one is not optional.** Your
HubSpot screenshots show *Last activity date* as a visible, sortable column on
every list and in every record's Data highlights. Computed as a correlated
`MAX(activity.createdAt)` subquery it would run once per row per page — the
single easiest way to make this CRM feel slow. It is a real indexed column,
written by the same service method that writes the activity, and backfilled by
the seed. Same argument for the `createdAt` indexes: *Create date* is the
default sort on the companies list.

**Lifecycle stage and lead status are first-class, not custom.** Both objects
carry `lifecycleStage`; contacts and companies carry `leadStatus`. They drive
filters, pipeline reporting and the Data highlights strip, so they get enum
columns with indexes rather than JSONB. Changing either writes a
`LIFECYCLE_CHANGE` activity and stamps `lifecycleStageChangedAt`, which is what
lets the record header say "Customer for 21 hours" and offer history — the
timeline *is* the history, so there is no second audit table to keep in sync.

**Associations are many-to-many by default**, matching HubSpot — a contact can
sit on several companies, a deal can span several, and a deal has as many
contacts as it has humans in the room. This was your call over my earlier
recommendation, and it is the right one for a company selling to groups and
subsidiaries; the rest of this section is what it takes to do it without
paying for it later.

**Three typed join tables, not one polymorphic edge table.** A generic
`Association { fromType, fromId, toType, toId }` looks tempting and is the same
mistake as EAV, one level up: no foreign keys, no cascade deletes, no Prisma
relations, and every query hand-written. There are exactly three pairings, that
number is bounded, so `CompanyContact`, `CompanyDeal` and `DealContact` each get
real columns and real integrity.

**There are two independent notions of "primary", and conflating them is a
bug.** HubSpot only models the first:

- `isPrimaryCompany` — *this contact's* (or *this deal's*) main company. Drives
  the Primary badge and the "Company" column on list views.
- `isPrimaryContact` — *this company's* main point of contact, which you asked
  for in the original brief. Same for a deal's lead contact.

They point in opposite directions across the same row, so `CompanyContact`
carries both flags.

**Postgres enforces one primary per side; the application does not.** Prisma
cannot express partial unique indexes, so these go in a hand-written migration
and are not optional — "two primary companies" is exactly the corruption that
makes a CRM untrustworthy:

```sql
CREATE UNIQUE INDEX company_contact_one_primary_company
  ON "companyContact" ("contactId") WHERE "isPrimaryCompany";
CREATE UNIQUE INDEX company_contact_one_primary_contact
  ON "companyContact" ("companyId") WHERE "isPrimaryContact";
CREATE UNIQUE INDEX company_deal_one_primary_company
  ON "companyDeal" ("dealId") WHERE "isPrimaryCompany";
CREATE UNIQUE INDEX deal_contact_one_primary_contact
  ON "dealContact" ("dealId") WHERE "isPrimaryContact";
```

Promoting a new primary is a two-statement transaction: demote the old, promote
the new. The index turns a race into a failed write rather than silent
duplication.

**`Deal.companyId` was required and is now gone**, so the "every deal belongs to
a company" invariant moves into the service: creating a deal requires at least
one company association, and removing the last one is rejected. A schema-level
`NOT NULL` was doing real work here; losing it means the service has to.

**Association labels are a managed vocabulary**, not free text. `AssociationLabel`
holds the options per pairing — Decision maker, Champion, Billing contact,
Parent company — editable in Settings next to custom properties, validated
server-side on write. Free text would give us four spellings of "champion"
inside a month.

**What this costs, honestly.** Every list that shows a company column now reads
through a join filtered to `isPrimaryCompany`, and every per-company count is a
join count rather than a foreign-key scan. Both are indexed and fine at this
scale. The real cost is the timeline, below.

**Timeline semantics.** Past = `occurredAt` set, or `completedAt` set, or a
`NOTE`/`STAGE_CHANGE`/`ENRICHMENT` row using `createdAt`. Upcoming =
`dueAt > now()` and `completedAt IS NULL`. Overdue = `dueAt < now()` and
`completedAt IS NULL`.

**Pipeline math.** Open stages are `DEMO_BOOKED`, `QUALIFIED_TO_BUY`,
`DECISION_MAKER_BOUGHT_IN`, `CONTRACT_SENT`. Closed are `CLOSED_WON`,
`CLOSED_LOST`, `UNQUALIFIED_TO_BUY`. Pipeline value sums `amount` over open
stages only. Moving to a closed stage stamps `closedAt` and requires
`closedReason` on the two losing outcomes.

---

## 5. Custom properties

The part that decides whether this is maintainable in two years.

### Why JSONB and not EAV

An entity-attribute-value table is the textbook answer and the wrong one here.
Rendering a table with eight custom columns means eight joins or a pivot, on
every page of every list. Values live in one `customFields` JSONB column on the
row we already selected: zero extra queries, atomic writes, and a GIN index
that makes containment filters fast.

The trade — no referential integrity on values — is bought back by validating
every write against the definition registry server-side.

### The registry

```prisma
enum PropertyEntity { COMPANY CONTACT DEAL }
enum PropertySource { SYSTEM CUSTOM }

enum PropertyType {
  TEXT
  LONG_TEXT
  NUMBER
  CURRENCY
  DATE
  BOOLEAN
  SELECT
  MULTI_SELECT
  URL
  EMAIL
  PHONE
  USER
}

model PropertyDefinition {
  id     String         @id @default(cuid())
  entity PropertyEntity
  source PropertySource @default(CUSTOM)
  key    String
  label  String
  type   PropertyType

  description String?
  options     Json?
  required    Boolean @default(false)
  showInTable Boolean @default(false)
  filterable  Boolean @default(true)
  sortable    Boolean @default(false)
  order       Int     @default(0)

  archivedAt DateTime?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  @@unique([entity, key])
  @@index([entity, archivedAt])
  @@map("propertyDefinition")
}
```

`SYSTEM` rows describe the real columns from §4 — `name`, `domain`, `stage`,
`amount`, `owner`. They are seeded from a versioned TypeScript constant and
upserted on boot, never hand-edited, and their `key`/`type` are immutable. Only
`label`, `showInTable`, `order` are editable on a system row.

`CUSTOM` rows describe keys inside `customFields`.

### Your existing HubSpot custom fields validate the design

The deal record in your screenshots carries *Deal Type*, *Term*, *Deal
Segment*, *Forecast Context*, *Forecast Context (manual)*, *Competitors
Mentioned*, *Compliance Frameworks* and *Compliance Timeline*; the company
carries *VAT ID*, *Record source* and *Frameworks*; the contact carries
*Buying Role*, *Assessment*, *assessment-source* and the *Original Traffic
Source* drill-downs. Every one of these is a `CUSTOM` definition in the
registry — no schema migration, no code change.

Two are worth calling out. *Compliance Frameworks* renders as removable tag
chips, which is the `MULTI_SELECT` type. And `assesment-source` is misspelled
in HubSpot today: the import maps it to a correctly-spelled `key` with the old
name preserved as an alias, so we carry the data across without carrying the
typo forward forever.

Seed these as part of the migration so day one in the new CRM has the same
fields the team already uses.

### One registry, four consumers

`properties.list({ entity })` returns both kinds in one array. From it:

| Consumer | Function | Produces |
| --- | --- | --- |
| Table | `buildColumns(defs, renderers)` | `DataTableColumn<Row>[]` |
| Filters | `buildFacets(defs)` | `DataTableFacet[]` for every `SELECT` with `filterable` |
| Forms | `buildFormSchema(defs)` | the Zod object for the custom section |
| Detail sheet | `buildProperties(defs, row)` | `DetailSheetProperty` rows |

Adding a property becomes a row in one table. No code change touches four
files, which is the entire point.

### Rules that keep it safe

- **`key` is immutable after creation.** Renaming the label is free; renaming
  the key orphans every stored value. The API rejects key changes outright.
- **Delete is archive.** `archivedAt` hides the property everywhere and leaves
  the JSONB untouched, so an accidental delete is a one-click restore. Hard
  purge is a separate, explicit, owner-only action that strips the key from
  every row in a transaction.
- **Every write is validated server-side** against a Zod schema compiled from
  the definitions and cached in Redis, invalidated when a definition changes.
  Unknown keys are rejected, not silently stored — silent acceptance is how you
  end up with four spellings of the same field.
- **Type changes are restricted to safe widenings** (`TEXT`→`LONG_TEXT`,
  `NUMBER`→`CURRENCY`). Anything else requires archive-and-recreate, so no
  write can land against a type that no longer matches the stored data.
- **`USER` type values store a user id** and are resolved through the same
  owner-picker component as system owner fields.

### Filtering and sorting

Filtering uses Prisma's JSON path filters against the GIN index:

```ts
where: { customFields: { path: [def.key], equals: value } }
```

Sorting is the sharp edge: Prisma cannot `orderBy` into a JSON column. The list
service takes a raw `ORDER BY "customFields" #>> ARRAY[$1]` escape hatch, with
the key validated against the definition registry before it reaches SQL — an
allowlist derived from data we control, never the raw query string. Only
properties flagged `sortable` are offered in the sort menu.

Free-text `q` searches system text columns in v1. Extending it across custom
text properties wants `pg_trgm`; that is a later, measured change.

---

## 6. Role-based access control

Better Auth's **`admin` plugin** with `createAccessControl`, imported from the
dedicated paths for tree-shaking. The org plugin's role model does not apply —
there are no organizations. Roles live on `user.role`.

```ts
// packages/auth/src/permissions.ts
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";

export const statement = {
  ...defaultStatements,
  company:    ["read", "create", "update", "delete"],
  contact:    ["read", "create", "update", "delete"],
  deal:       ["read", "create", "update", "delete", "reassign"],
  activity:   ["read", "create", "update", "delete"],
  attachment: ["read", "create", "delete"],
  property:   ["read", "manage"],
  member:     ["read", "manage"],
} as const;

export const ac = createAccessControl(statement);
```

| Role | Intent |
| --- | --- |
| `owner` | Everything, including user management and hard-purging properties. |
| `manager` | All records, reassign deals, manage the property schema. No user management. |
| `rep` | Read everything; create anything; update and delete only records they own. |
| `readonly` | Read everything. No writes except nothing at all. |

### Three layers, and why each exists

1. **tRPC middleware.** `PermissionsMiddleware` reads
   `meta: { permissions: { deal: ["update"] } }` off the procedure and checks it
   against the role — mvp's pattern, minus the org lookup. Coarse-grained, and
   it catches an entire router that someone forgot to guard.
2. **Service-level ownership.** No statement grammar expresses "only rows where
   `ownerId = me`". A shared `assertCanMutate(record, user)` runs inside the
   service, before the write. This is the layer that actually protects a rep's
   deal from another rep.
3. **UI.** `roleCan()` hides buttons a user cannot use. Presentation only.
   Anything enforced solely here is not enforced.

### Two operational details that bite later

- **Role changes lag the cookie cache.** `session.cookieCache` is on with a
  5-minute `maxAge`, and the cached user object carries the role. Revoke the
  user's sessions when their role changes so the next request re-reads from the
  database. Otherwise a demotion takes up to five minutes to bite.
- **Re-run `bun run auth:generate` after adding the plugin.** It adds `role`,
  `banned`, `banReason`, `banExpires` to `User` and `impersonatedBy` to
  `Session`. Skipping this produces runtime adapter errors, not type errors.

First Google sign-in bootstraps as `owner` if no users exist; everyone after
defaults to `rep`, promoted from Settings → Members.

---

## 7. Attachments on Vercel Blob

`vercel blob create-store crm-attachments` writes `BLOB_READ_WRITE_TOKEN` into
the project. **Not yet created** — see §14.

```prisma
model Attachment {
  id          String @id @default(cuid())
  pathname    String @unique
  filename    String
  contentType String
  size        Int

  companyId  String?
  company    Company?  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  contactId  String?
  contact    Contact?  @relation(fields: [contactId], references: [id], onDelete: Cascade)
  dealId     String?
  deal       Deal?     @relation(fields: [dealId], references: [id], onDelete: Cascade)
  activityId String?
  activity   Activity? @relation(fields: [activityId], references: [id], onDelete: Cascade)

  uploadedById String
  uploadedBy   User   @relation("AttachmentUploader", fields: [uploadedById], references: [id])
  createdAt    DateTime @default(now())

  @@index([companyId])
  @@index([dealId])
  @@map("attachment")
}
```

**Client uploads, not server uploads.** Vercel caps a serverless request body
at 4.5 MB; a signed contract PDF blows straight through that. Use
`upload()` from `@vercel/blob/client` against a `handleUpload` route that
authenticates the session, checks `attachment: ["create"]`, and only then issues
a token. Server-side `put()` is reserved for small files we generate ourselves.

**Store the pathname, not the URL.** Blob URLs carry an unguessable random
suffix, which is obscurity, not authorisation — and a CRM holds customer
contracts. Downloads go through an API route that checks RBAC and then issues a
presigned URL (the CLI exposes `blob presign` and `blob signed-token`; confirm
the SDK flag names when implementing). Row payloads never contain a directly
fetchable URL.

**Deletes are two-phase.** Delete the row, then delete the blob in `waitUntil`.
A dangling blob costs pennies; a dangling row is a broken download.

The `@crm/ui` `attachment.tsx` component already models the
idle/uploading/processing/error/done states the upload flow needs.

---

## 8. Speed: Redis and rendering

Three distinct uses of Redis. Conflating them is how caches go stale.

1. **Better Auth secondary storage.** Port mvp's
   `packages/auth/src/secondary-storage.ts` verbatim. Every RSC render validates
   a session; on Vercel that is a Postgres round trip per render unless sessions
   live in Redis. Biggest single win available.
2. **Application cache** via the existing `AppCacheModule`. Cache the things
   that are hot and rarely change: property definitions, the user list, and
   dashboard aggregates. Keys are namespaced `crm:v{gen}:{entity}:{hash}`; a
   write bumps that entity's generation counter rather than deleting keys.
3. **Enrichment dedupe.** A short-lived `enrich:lock:{domain}` key stops two
   concurrent creates of the same domain from both burning 10 credits.

Do **not** cache per-record reads behind Redis in v1. TanStack Query already
dedupes and caches client-side, and record freshness after a write matters more
than shaving a query. Cache aggregates and registries; leave records live.

**Rendering.** Every list page prefetches on the server through
`getServerTrpc()` and hydrates:

```tsx
const queryClient = getServerQueryClient();
await queryClient.prefetchQuery(trpc.companies.list.queryOptions(params));
return (
  <HydrationBoundary state={dehydrate(queryClient)}>
    <CompaniesPanel />
  </HydrationBoundary>
);
```

Parsed nuqs values feed the prefetch, so the first paint is already filtered and
sorted — no loading flash on a shared link. Subsequent filter changes stay
shallow and are served by TanStack Query.

---

## 9. The agentic layer

`apps/api/src/enrichment/` — a typed `ContextDevClient` over
`https://api.context.dev/v1` plus an `EnrichmentService` invoked through
`waitUntil`.

| Trigger | Call | Cost |
| --- | --- | --- |
| Company created or given a new `domain` | `POST /brand/retrieve` `{type:"by_domain"}` | 10 credits |
| Manual re-enrich | same, `maxAgeMs: 0` | 10 credits |
| Contact created with a work email, no company | `{type:"by_email"}` → find-or-create Company, link as primary | 10 credits |
| CSV import | `POST /utility/prefetch` per row, then retrieve | prefetch free on paid plan |
| Research this company | `POST /web/extract` with our schema → `ENRICHMENT` activity | 10 credits |

**Field mapping.** `title`→`name` (only when the record was created domain-first
and unnamed); `description`/`slogan`→`description`; `logos[]` picked by
`mode`+`type`, never `logos[0]` — light+`logo`→`logoUrl`, dark+`logo`→
`logoDarkUrl`, `icon`→`iconUrl`; `colors[0].hex`→`brandColor` (key off `hex`,
the name is generated); `industries.eic[0]`→`industry`/`subIndustry`;
`address`→`city`/`stateCode`/`country`/`countryCode`; `socials[]`→ the social
URLs by `type`; `links`→`pricingUrl`/`careersUrl`. Whole payload →
`CompanyEnrichment.raw`, so re-deriving a field never costs credits again.

**Error handling.** Every field is nullable — never overwrite a human-entered
value with `null`. `400 NOT_FOUND` and `WEBSITE_ACCESS_ERROR` are `SKIPPED`, not
`FAILED`, and are not billed. `422` on an email lookup (free or disposable) is
`SKIPPED` with no company created. `403` on prefetch logs once and falls through
to a direct retrieve. `408`/`429` get one backoff retry, then `FAILED` with the
reason in `enrichmentError`. Cold lookups run p50 ≈ 7s, p90 ≈ 18s, so
`timeoutMS: 60000` and never in the request path.

**Progress in the UI** is a TanStack Query `refetchInterval` that runs while
`enrichmentStatus` is `PENDING` or `RUNNING` and returns `false` once it settles
— not a `setInterval` in an effect.

`CONTEXT_DEV_API_KEY` lives in the API's environment, declared `@IsOptional()`
in `env.validation.ts`. No key means enrichment is disabled, logged once at
boot, and companies stay `PENDING`. The key is server-side only.

### Deal intelligence (Phase 11)

Your deal record shows a *Deal Score* card and an AI-written *Forecast Context*
that reads like a summary of the timeline. That is the second agent, and it is
the one that makes this "agentic" rather than "enriched":

- **Deal score** — a 0–100 health number with a one-paragraph rationale,
  derived from stage age, activity recency and cadence, contact coverage
  (do we have a champion *and* an economic buyer?), and what the notes
  actually say. Adds `dealScore`, `dealScoreSummary`, `dealScoredAt`,
  `forecastContext` and `forecastContextManual` to `Deal` in a Phase 11
  migration — deliberately not in the §4 schema, so the core model ships
  without waiting on the model work. Recomputed on stage change and on a
  nightly cron, never in the request path.
- **Forecast context** — a rolling summary of the deal's timeline, regenerated
  when the timeline changes materially. Their record keeps *Forecast Context*
  and *Forecast Context (manual)* side by side; we do the same, and
  `forecastContextManual` always wins when set.
- **Stalled-deal detection** — an open deal with no activity in N days raises a
  task for its owner. This is the cheapest high-value automation in the whole
  product and needs no model at all.

Use Claude via the Anthropic API for these; the scoring prompt reads the
timeline the CRM already stores, so there is nothing new to integrate.

---

## 10. API contract

Every list endpoint speaks one shape, so one table component drives everything.

```ts
export const listInput = z.object({
  q:        z.string().default(""),
  sort:     z.string().default(""),
  dir:      z.enum(["asc", "desc"]).default("asc"),
  page:     z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
  filters:  z.record(z.string(), z.string()).default({}),
});
```

Returning `{ rows, total, facetCounts }`, where `facetCounts` feeds the counts
in the filter dropdowns.

| Router | Procedures |
| --- | --- |
| `users` | `me`, `list`, `setRole`, `ban` |
| `companies` | `list`, `byId`, `create`, `update`, `remove`, `enrich` |
| `contacts` | `list`, `byId`, `create`, `update`, `remove` |
| `deals` | `list`, `board`, `byId`, `create`, `update`, `setStage`, `remove` |
| `activities` | `timeline`, `create`, `update`, `complete`, `remove`, `myTasks` |
| `properties` | `list`, `create`, `update`, `archive`, `restore`, `purge`, `reorder` |
| `associations` | `list`, `link`, `unlink`, `setLabel`, `setPrimary`, `labels` |
| `savedViews` | `list`, `create`, `update`, `remove`, `reorder` |
| `attachments` | `list`, `createUploadToken`, `download`, `remove` |
| `dashboard` | `summary` |

One `associations` router serves all three pairings, taking
`{ pairing, fromId, toId }` rather than one endpoint per direction — the
alternative is nine near-identical procedures. `setPrimary` runs the
demote-then-promote transaction from §4, and `unlink` refuses to remove a
deal's last company.

`listInput.filters` carries facet values as strings. Date-range facets encode
as either a named window (`last_7_days`, `this_month`, `last_quarter`) or an
explicit `from..to` pair of ISO dates; the service resolves both to a Prisma
`gte`/`lte` on the mapped column. Named windows are resolved server-side so a
shared URL means the same thing tomorrow as it does today.

Every router carries `@UseMiddlewares(AuthMiddleware, PermissionsMiddleware)`
with per-procedure `meta.permissions`. `deals.setStage` writes the
`STAGE_CHANGE` activity and stamps `stageChangedAt`/`closedAt` in one
transaction — a stage change that doesn't appear on the timeline is a bug, so
it cannot be two calls.

---

## 11. Frontend

### Routes — flat, because sheets carry the depth

```
apps/app/app/(app)/
  page.tsx           dashboard
  companies/page.tsx
  contacts/page.tsx
  deals/page.tsx
  settings/properties/page.tsx
  settings/members/page.tsx
```

There are no `[id]` routes. A record opens in a sheet driven by a URL param:
`?company=cmp_123`, `?deal=deal_456`, `?new=company`. The back button closes it,
the URL is shareable, and we never grow a nested route tree. Deep links render
the list server-side and open the sheet on top.

### Sheets

Port `responsive-sheet.tsx` and `detail-sheet.tsx` from mvp — `Sheet` on
desktop, `Drawer` on mobile, behind one API. `DetailSheet` supplies `Header` / `Stats` / `Properties` / `Section` / `Body` /
`Footer`, which maps onto the HubSpot record layout almost one to one — their
three-column page becomes one vertical sheet:

- **Header** — logo, name, domain link, owner, enrichment chip, then the
  composer row your screenshots put under the record title: **Note · Email ·
  Call · Task · Meeting · More**. Same five, same order.
- **Stats** — `DetailSheetStats` is their *Data highlights* strip verbatim:
  **Create date · Lifecycle stage · Last activity date**. On a deal, stage
  replaces lifecycle.
- **Properties** — their *About this company* / *Details* panel. System
  properties first in registry order, then custom, all from §5. Inline-editable
  in place; no separate edit mode.
- **Sections** — the right rail, flattened: Companies, Contacts, Deals,
  Attachments, Timeline. Each shows a count and an **Add** action, and each
  renders a `SimpleTable` rather than the full `DataTable` — these are short
  embedded lists, not paginated views. The associated-deal rows carry an inline
  stage dropdown, matching the contact record in your screenshot.

  Because associations are many-to-many, each row also carries a **Primary**
  badge and an **association label** chip, both editable in place, exactly as
  your screenshots show. Sections cap at five rows with a *View all associated
  …* link that opens the full list filtered to that record — a company with
  forty contacts must not render forty rows inside a sheet. Adding an
  association is a `cmdk` search over existing records with a create-new
  fallback, so linking never means leaving the sheet.
- **Footer** — save, delete, re-enrich.

**Timeline.** Grouped by month with day sub-headers, newest first, matching
their *Recent activities*. It gets its own search box, an activity-type filter,
a date-window filter and a collapse-all toggle. Upcoming and overdue items pin
above the history with a completion checkbox.

### Create buttons live in the page shell header

Every list page puts its primary action in `PageShellActions`, which the shell
already positions top-right:

```tsx
<PageShellHeader breadcrumbItems={[{ label: "Companies" }]}>
  <PageShellHeading>
    <PageShellTitle>Companies</PageShellTitle>
    <PageShellDescription>Every account we sell to.</PageShellDescription>
  </PageShellHeading>
  <PageShellActions>
    <CreateCompanyButton />
  </PageShellActions>
</PageShellHeader>
```

The button sets `?new=company`; the same sheet component handles create and
edit, distinguished by whether an id is present. One component, one form
schema, two entry points.

### The data table, and its rules

Ported from `/Users/lewiscarhart/mvp/apps/app/components/data-table/`, rewriting
`@trycompai/ui` → `@crm/ui`:

| Source | Destination |
| --- | --- |
| `data-table.tsx` | `packages/ui/src/components/data-table.tsx` |
| `table-pagination.tsx`, `numbered-pagination.tsx` | `packages/ui/src/components/` |
| `use-table-query.ts`, `build-search.ts` | `apps/app/components/data-table/` |

Everything it needs already exists in `@crm/ui`: `table`, `dropdown-menu`,
`input-group`, `button`, `spinner`, `lib/row-accent`. The hook stays app-side
because it is routing state, not UI. `nuqs` becomes a `packages/ui` dependency
since the table owns the `expand` and `hide` params.

Behaviour carried over unchanged:

- `table-fixed` layout, `overflow-hidden` cells, so long values truncate instead
  of blowing out the table
- sticky header with `bg-background`
- search in an `InputGroup` with a leading `Search` icon
- one dropdown per facet, radio-group single-select, `all` as the reset option
- a tab dropdown for the primary partition, with counts from `facetCounts`
- a Sort dropdown listing sortable columns plus asc/desc, and clickable sortable
  headers with an arrow indicator and `aria-sort`
- a Columns dropdown toggling `hideable` columns, persisted in `?hide=`
- the whole filter row collapses behind a Filters button under `sm`, with an
  active-filter count
- `useDeferredValue` on rows so typing stays smooth
- `ROW_ACCENT` on clickable rows; expandable rows use `ROW_ACCENT_EXPANDABLE`
- pagination footer showing range and total

Five CRM-specific additions, four of them driven by the HubSpot screenshots:

1. **Columns come from the property registry**, not a literal array (§5).
2. **A row click sets the record's URL param** instead of navigating.
3. **Date-range facets.** mvp's `DataTable` only has single-select radio
   facets, but every HubSpot list filters on *Create date*, *Last activity
   date* and *Close date*. Add a `type` discriminator to `DataTableFacet`:
   `select` keeps today's behaviour, `dateRange` renders a preset list (Today,
   Last 7 days, This month, Last quarter, Custom) over `@crm/ui`'s existing
   `calendar` and `popover`. This is the one real extension to the ported
   component; everything else is reuse.
4. **Saved views as tabs above the table.** HubSpot's "Active Customers",
   "Intent", "Closed Won Deals". Because the entire table state already lives
   in the URL, a saved view is a stored query string — `savedViews.create`
   snapshots `query.search`, and clicking a tab replaces the search params.
   A `+` tab saves the current filter set. This is nearly free given the
   architecture and it is the feature the team will notice missing on day one.
5. **Standard cell renderers**, so every list looks like one product:
   `OwnerCell` (avatar + name, `No owner` when null), `RelativeDateCell`
   ("Today at 10:07", "Yesterday at 3:20 PM", then absolute), `CurrencyCell`
   (right-aligned, tabular numerals), `StageBadge`, `LifecycleBadge`, and
   `@crm/ui`'s existing `empty-cell` rendering `--` for every null — matching
   HubSpot exactly.

### Default columns

Mirroring your screenshots, so the team's muscle memory survives the move.

| List | Columns |
| --- | --- |
| Companies | Name (icon + link), Owner, Industry, Lifecycle stage, Create date, Phone, Last activity, City |
| Contacts | Name, Email, Company, Title, Lead status, Lifecycle stage, Owner, Last activity |
| Deals | Name, Stage, Close date, Owner, Amount, Forecast category, Last activity |

Companies default-sort by Create date descending; Deals by Close date
ascending. Everything beyond the first four columns is `hideable`, so the
Columns dropdown is genuinely useful rather than decorative.

The Company column renders the primary association, with a `+N` chip when a
record has more — one line per row, no wrapping, and the full set is one click
away in the sheet. `AssociationCell` owns this so all three lists agree.

### Forms

`react-hook-form` + `zodResolver` + `@crm/ui` `Field` primitives
(`Field`, `FieldGroup`, `FieldLabel`, `FieldContent`, `FieldDescription`,
`FieldError`), matching mvp's `person-sheet.tsx`.

- **One schema per form, shared with the tRPC input** where the shapes match.
- **`Controller` for non-native controls** (Select, Switch, Combobox);
  `register` for plain inputs.
- **`""` means clear, `undefined` means leave alone.** The submit handler maps
  empty strings to explicit `null`. Collapsing the two makes "clear this field"
  silently a no-op — mvp learned this the hard way.
- **Submit through `useMutation`** with an optimistic row patch, `toast.error`
  on failure, invalidate on settle.
- **The custom-property section is generated** from `buildFormSchema(defs)` and
  rendered by a `PropertyField` switch on `type`.
- **No effect resets the form when the selected record changes.** The sheet body
  is keyed: `<RecordForm key={recordId} />`.

---

## 12. Conventions

### No `useEffect`

Banned in app and feature code. The five replacements:

| Instead of an effect for | Use |
| --- | --- |
| Deriving state from state or props | compute inline during render |
| Fetching | TanStack Query / tRPC |
| Reacting to a user action | the event handler |
| Resetting state when a prop changes | `key` on the component |
| One-time external sync on mount | `useMountEffect` |

`packages/ui/src/hooks/use-mount-effect.ts` already exists and is the only
sanctioned wrapper. Concretely in this codebase: sheet open state is derived
from nuqs, never synced; search debounce is nuqs' `limitUrlUpdates`, not a
timer; enrichment polling is `refetchInterval`, not `setInterval`; form reset is
a `key`, not a dependency array.

Enforce it with Biome — `noRestrictedImports` banning the `useEffect` named
import from `react`, scoped to `apps/app/**` and `packages/ui/src/hooks/**`.
`packages/ui/src/components` is already Biome-excluded, so vendored shadcn files
(`calendar`, `sidebar`, `carousel`) are unaffected. Verify the `importNames`
syntax against Biome 2.5 when wiring it.

### No code comments

New code carries no comments. Names, types and small functions do the
explaining; anything that genuinely needs prose goes in `docs/`. Existing
comments stay — churning them adds diff noise and no value. `biome-ignore`
directives and the auto-generated Prisma header are not comments in this sense.

Add both rules to `AGENTS.md` so every agent session picks them up.

---

## 13. Phases

Each phase ends green on `bun run check-types` and `bun run lint`.

**Phase 0 — Plumbing.** Dependencies; `apps/api/src/trpc/` (module, context,
auth + permissions + logging middleware, error handler) from the mvp reference;
`nestjs-trpc generate` + `exports["./app-router"]`; the `/api/[...path]` proxy;
`lib/trpc/*`; `NuqsAdapter` + `TRPCReactProvider`; the data table into
`packages/ui`; Biome no-`useEffect` rule; housekeeping on `docs/review.md`,
`docs/api.md` and the stray temp file. *Verify: the dashboard renders
`users.me` through a server-prefetched tRPC query.*

**Phase 1 — Auth, RBAC and hosting.** `admin` plugin + access control in
`packages/auth`; `bun run auth:generate`; Redis secondary storage; owner
bootstrap; `PermissionsMiddleware`; two Vercel projects; pooled `DATABASE_URL` +
`DIRECT_URL`; Upstash; blob store. *Verify: a `readonly` user gets 403 from a
mutation, and the button is hidden.*

**Phase 2 — Schema, registry and seed.** Models from §4 and §5; one migration;
system property definitions seeded from the versioned constant; seed ~15
companies with real domains, ~40 contacts, ~25 deals across stages, ~150
activities including overdue and upcoming. *Verify: `db:migrate`, `db:seed`,
inspect in Studio.*

**Phase 3 — Companies.** `companies` + `properties` routers; the standard cell
renderers; the `dateRange` facet type; list page with the registry-driven
DataTable and the default columns from §11; company sheet with header,
composer row, Data highlights, properties, contacts, deals; lifecycle stage and
lead status editable inline; create button in `PageShellActions`. *Verify:
filter by owner and a date window, sort, page; copy the URL into a new tab and
get the same view with the sheet open.*

**Phase 3b — Associations.** `associations` router; the three join tables with
their partial unique indexes; `AssociationLabel` vocabulary and its settings
screen; `AssociationCell`; the add/link/label/set-primary UI in the sheet
sections. Lands here because Companies is the first surface that needs it and
every later phase assumes it. *Verify: a contact on two companies shows Primary
on exactly one, and a concurrent double-promote fails the write instead of
producing two.*

**Phase 4 — Contacts.** `contacts` router; list; sheet; multi-company
associations with labels; lifecycle stage, lead status and buying role.
Replaces the placeholder page.

**Phase 5 — Deals.** `deals` router; list with stage tab, owner facet and close
date range; inline stage change writing `STAGE_CHANGE`; forecast category; deal
sheet with stage stepper, amount, associated companies and contacts with
labels; the at-least-one-company service invariant. *Verify: a stage change
appears on the deal and on the timelines of every associated company, and
`lastActivityAt` moves on all affected records.*

**Phase 5b — Saved views.** `savedViews` router; the tab strip above every
table; save-current-filters, rename, reorder, share. *Verify: a saved view
survives a reload and a different browser.*

**Phase 6 — Activity, tasks, dashboard.** Timeline component and composer;
`activities` router; complete and snooze; dashboard with pipeline by stage,
closing this month, overdue tasks, recent activity.

**Phase 7 — Attachments.** Blob client uploads; `handleUpload` token route;
RBAC-checked presigned downloads; attachment sections on all three sheets.

**Phase 8 — Custom properties UI.** Settings → Properties: create, edit,
reorder, archive, restore; live preview against the table.

**Phase 9 — The agent.** `ContextDevClient`, `EnrichmentService`, `waitUntil`,
field mapping, status polling, contact-email → company, research brief.
*Verify: create a company with domain `stripe.com` and watch logo, description,
industry, socials and address populate within ~20s without a reload.*

**Phase 10 — Migration and polish.** HubSpot CSV import for companies,
contacts, deals, their custom fields **and their associations with labels and
primary flags** — HubSpot exports associations as separate files, so the
importer runs records first, associations second, and reconciles primaries in a
third pass. Dedupe on `domain`/`email`, lifecycle and lead-status value
mapping, `assesment-source` typo fix, `lastActivityAt` backfill, prefetch
warming, dry-run report first. Then deal board view (`?view=board`) and the
`cmdk` quick switcher.

**Phase 11 — Deal intelligence.** Deal score, forecast context, stalled-deal
tasks (§9). Last because it is worth nothing until the timeline has real data
in it.

---

## 14. Open items

- **Vercel Blob store — done.** `crm-attachments`
  (`store_pXY7wYOD7ccPGUNP`), region `iad1`, **private access**, in the
  `comp-ai-test` team. Not yet attached to a project, because the repo has no
  Vercel projects yet; attaching it in Phase 1 is what populates
  `BLOB_READ_WRITE_TOKEN`. Private access confirms §7's design — the CLI
  requires `--access public|private` and exposes `blob presign`, so
  RBAC-checked presigned downloads are the supported path, not a workaround.
- **Postgres provider** for pooled connections — Neon and Supabase both work;
  pick one and I'll wire `DATABASE_URL`/`DIRECT_URL`.
- **`docs/review.md`** — write it or drop the `AGENTS.md` reference.

## 15. Deliberately out of scope

Email sync, calendar sync, sequences and cadences, workflow automation, a
reporting builder, and territory rules. Plus every object sitting at `(0)` in
your record sidebars: Tickets, Quotes, Subscriptions, Payments, Orders, Payment
links and Products. Multiple pipelines are out too — your deals list shows an
"All Pipelines" selector over a single "Deals pipeline", so one opinionated
pipeline is the honest version of what you actually run.

Each of these is a HubSpot feature we are choosing not to rebuild. If sales
asks for one, it is a new plan, not a phase.
