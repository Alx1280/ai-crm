# Plan — Contact intelligence agent (v2)

Turn the enrichment worker we have into an agent that **decides**: what to
research, how hard, when to look again, and how sure it is. Every claim it
writes carries its evidence; the contact sheet shows the person, the background,
and how much of it to believe — live, while the agent works.

Read it with [`AGENTS.md`](../../AGENTS.md), [`api.md`](../api.md),
[`design.md`](../design.md), [`crm-plan.md`](./crm-plan.md),
[`gmail-calendar-plan.md`](./gmail-calendar-plan.md) and
[`people-enrichment-agent.md`](./people-enrichment-agent.md), which is v1 and
whose §0 findings still hold. Conventions there are assumed, not repeated.

**Two rules from the top, and everything below obeys them:**

1. **Never at the API level.** This is an agentic-first platform. NestJS serves
   HTTP, auth, tRPC and the Google sync. It does not research, enrich, score,
   summarise or decide anything about a person — not as a fallback, not "just
   the cheap bit", not behind a feature flag. §2, §10.
2. **The agent may read everything we have.** This is a single-tenant internal
   tool. Email bodies, meeting notes, attendee lists and every activity on a
   timeline are legitimate evidence and the agent gets them in full. The one
   boundary is egress, not access. §4.

**This document is not static either.** Each phase closes by appending what it
measured to §14, the way v1's §0 rewrote v1's architecture.

---

## 0. Where we actually are

Measured against the tree on 2026-08-01, not remembered.

### Two enrichment stacks, one job

| | Lines | Owns |
| --- | --- | --- |
| `apps/api/src/enrichment/` | ~1,720 | Context.dev company brand + research, LinkDAPI contact identity, avatar mirroring, an in-process queue |
| `apps/agent/agent/` | ~2,140 | LinkDAPI identity again, Perplexity research, summaries, socials |

Two LinkedIn clients (`enrichment/linkdapi.client.ts`, `agent/lib/linkdapi.ts`).
Two identity matchers. `looksLikeSameCompany`, `nameMatchesLocalPart` and
`searchTerms` exist verbatim in both trees — and **have already drifted**: the
agent's `looksLikeSameCompany` guards `(!b && !c)`, the API's does not, so with
an empty company name the API copy evaluates `a.includes("")` and matches every
employer on earth. It is unreachable today because the only caller passes a
domain fallback. That is the point: nobody noticed, because nobody was looking
at the copy they were not working in.

Triggers are scattered to match: `companies.service.ts:305,364,389` for
companies, `google-match.service.ts:335` for contacts, two eve schedules for
everything else.

### The "agent" is a worker with a numbered list

Both schedules are step lists — `research-new-contacts` steps 1–5,
`profile-contacts` steps a–f. The model chooses nothing that matters. It does
not pick who to work on (a `take: limit` does), how deep to go (a boolean flag
does), or when to look again (a cron expression does). Ten tools, each one API
call. That is a script with a language model inside it.

It is also using almost none of the framework. No sandbox, so no `bash`, no
`web_fetch`, no `web_search`, no workspace. No `defineState`, no `defineDynamic`,
no hooks, no channels, no subagents, no evals. Ten hand-written tools, several of
which re-implement things eve ships.

### Confidence is computed, then thrown away

`get_linkedin_profile` returns `high | medium | low`. `update_contact` refuses
anything below `high` and returns a sentence. Nothing is stored. A `medium`
match — the right person, one weak signal short — is discarded so completely
that the next run pays to rediscover it and discards it again. v1 §5 said
`medium` becomes a suggestion. Never built.

### There is no provenance store, and no way to see the agent think

v1 §6's `ContactEnrichment` model never landed. The only field-level source in
the schema is `Contact.summarySourceUrl`, shipped today. `Contact` has no
`enrichmentStatus`, so the sheet cannot even show work in flight. Everything the
agent does happens in a cron job nobody can watch, explain or interrupt.

---

## 1. What "better than HubSpot and Salesforce" has to mean

Not more fields. They will always have more fields. Four structural advantages:

| They optimise for | We do instead |
| --- | --- |
| **Enrichment as a purchase.** Credits buy a record; the unit is the record and the vendor's confidence is not your business. | **Enrichment as an argument.** Every claim carries evidence, method and date, and the UI shows them. A rep can disagree with one field for one reason. |
| **Per-seat, per-credit economics** across millions of tenants, so re-reading every contact monthly is a line item they must charge for. | **One tenant, our Postgres, our keys.** Re-reading costs cents. That turns enrichment from a snapshot into a *feed*, which is the only way job-change detection exists at all. |
| **Generic B2B data.** The same firmographics every customer of the platform gets. | **Our own conversation history as evidence** — in full. We sync Gmail and Calendar; a signature block settles a job title outright, and a reply on a thread is proof of identity no data vendor can sell us (§4). |
| **A chat panel bolted onto a record.** Ask a question, get an answer, nothing persists. | **A resident agent with durable sessions.** It works the record on its own clock, and when a rep opens the sheet they can watch it, interrupt it and redirect it — same session, same memory, next week. |

The fourth is the one that is hard to copy, and eve is the reason it is cheap
for us: durable sessions, a streamable event log and a browser client are
framework features, not a project.

**The test:** a rep opens a contact five minutes before a call and knows who
they are, what they do, how long they have done it, what we have already said to
each other, and which parts a machine inferred. Then they type "is he still at
Fleetio?" into the same panel and watch it check.

---

## 2. Decisions that carry the design

1. **Never at the API level.** Not a fallback, not a fast path. The API's
   enrichment directory is deleted, not deprecated — §0 shows what a second
   copy does even when nobody is calling it. Nest emits *events*; the agent
   decides what they mean. §10.
2. **The agent runs in a sandbox and uses the harness.** `bash`, `web_fetch`,
   `web_search`, `glob`, `grep`, `todo`, `ask_question` and a `/workspace` come
   with eve. Authored tools are for the three things the harness cannot do:
   vendor APIs that need keys and verification, CRM reads and writes, and
   decisions. Every tool we write that wraps a public HTTP GET is a tool we are
   maintaining for nothing. §4.
3. **Confidence is data, not a gate.** Every fact is stored with evidence,
   score, method and source — including the ones too weak to apply. Discarding a
   `medium` match throws away the most valuable thing the run produced: a
   candidate a human could settle in three seconds. §5.
4. **Background runs propose; people approve.** A markdown schedule is task mode
   and **cannot park for a person** — so an approval gate in a cron run is not a
   pause, it is a failure. Background work below the bar writes a *proposal*.
   Approval prompts and `ask_question` are for sessions a human started. §5, §7.
5. **The record is the interface to the agent.** The Next app mounts eve's
   routes with `withEve` and the contact sheet renders a live session with
   `useEveAgent`. The rep watches the same event stream the runtime persists.
   No second app, no chat silo. §6.
6. **The agent may read the whole CRM, including bodies.** Internal tool, single
   tenant, our own data. The boundary is *egress*: raw customer text never
   leaves as a third-party search query, and never reaches the sandbox, which
   has network access. §4, §8.
7. **Budget is an input the agent spends,** held in `defineState` and enforced
   in the tool — a VP on a live deal earns a deep pass, a newsletter signup
   earns one lookup. §7.
8. **Humans outrank the agent, permanently.** A field a person typed is never
   overwritten; a dismissed proposal is never re-proposed. Enforced in the fact
   store, not in a prompt.

### Judgment calls worth your veto

- **Deleting the API path outright.** The safe-sounding option is to keep it as
  a fallback. That is how we got two of everything. Enrichment has never been on
  a request path; if the agent is down, contacts wait.
- **Giving the agent a shell.** A sandbox with `bash` and web egress is a real
  capability and eve's own docs tell you to review it before production. The
  mitigation is not "no shell", it is **no database credentials in the sandbox**
  (§8): CRM access is authored tools in the app runtime, never `psql`.
- **Numeric confidence, shown as words.** Storing `0.82` and rendering
  "probable" invites "why not 0.79?". The honest answer is that the number is
  calibrated by evals (§9), not a probability. Three opaque bands cannot be
  calibrated at all.
- **A live agent panel on the record.** More UI, and it puts model output in
  front of reps constantly. That is the intent: an agent nobody watches is an
  agent nobody corrects.
- **The agent schedules itself.** Bounded by lease and budget, but it decides to
  come back in fourteen days. Anything less and "not static" is a slogan.

---

## 3. Data model

Current values stay denormalised on `Contact` so lists stay one query. The new
tables are the *reasoning*, not the read path.

```prisma
/// One claim about one field of one contact, with what backs it.
model ContactFact {
  id        String  @id @default(cuid())
  contactId String
  contact   Contact @relation(fields: [contactId], references: [id], onDelete: Cascade)

  field String   // "title" | "linkedinUrl" | "seniority" | "employer"…
  value String

  /// 0–1 from the evidence ledger (§5), with the band stored alongside so a
  /// re-calibration re-derives bands without re-running the research.
  score Float
  band  FactBand

  evidence  Json    // every item, so the score can be explained and recomputed
  method    String  // "linkedin.profile" | "github.api" | "crm.thread" | "web"
  sourceUrl String?

  /// The session that produced it — joins to the event log for "show your work".
  sessionId String?

  status      FactStatus @default(PROPOSED)
  decidedById String?
  decidedAt   DateTime?

  observedAt   DateTime  @default(now())
  supersededAt DateTime?

  @@index([contactId, field, status])
  @@map("contactFact")
}

enum FactBand   { VERIFIED PROBABLE POSSIBLE }
enum FactStatus { APPLIED PROPOSED DISMISSED SUPERSEDED }

/// The background panel: narrative plus the structured lines under it.
model ContactBrief {
  contactId   String   @id
  contact     Contact  @relation(fields: [contactId], references: [id], onDelete: Cascade)
  narrative   String
  sections    Json     // { currentRole, tenure, previousRoles[], seniority, function, location }
  score       Float
  sessionId   String?
  refreshedAt DateTime @default(now())
  @@map("contactBrief")
}

/// What the agent decided to do, and why. Work queue and audit trail in one.
model AgentTask {
  id          String    @id @default(cuid())
  contactId   String?
  companyId   String?
  kind        String    // "identify" | "profile" | "recheck" | "meeting-prep"
  reason      String    // the agent's own words, shown to the rep
  priority    Int       @default(0)
  budget      Int       // research units this task may spend
  dueAt       DateTime
  leasedUntil DateTime?
  sessionId   String?
  startedAt   DateTime?
  finishedAt  DateTime?
  outcome     String?
  @@index([dueAt, leasedUntil])
  @@map("agentTask")
}

/// Every runtime event, written by a hook. The "show your work" substrate.
model AgentEvent {
  id        String   @id            // eve's meta.id ULID — dedupes replays
  sessionId String
  contactId String?
  type      String
  data      Json
  emittedAt DateTime
  @@index([sessionId, emittedAt])
  @@index([contactId, emittedAt])
  @@map("agentEvent")
}
```

`AgentEvent` is close to free: a single `defineHook` on `*` writing
`insert … on conflict (id) do nothing`, exactly the pattern eve's streaming doc
recommends, and ULIDs keep it append-ordered. It gives us the agent's full
history — which tool ran, what it returned, what it decided — without inventing
an audit format.

`Contact` also gains `enrichmentStatus`/`enrichedAt`/`enrichmentError` matching
`Company`, so the sheet reuses `isEnriching()` and `ENRICHMENT_POLL_MS`
(`api.md`) for the non-streaming case. `ContactFact` subsumes
`summarySourceUrl`, `summaryUpdatedAt` and `socialsCheckedAt` shipped today;
those columns migrate into facts in Phase 1.

**Job changes fall out for free:** a new `employer` fact superseding an applied
one *is* the event. No diffing machinery, which is why v1 put it last and this
plan does not have to.

---

## 4. Capabilities: what eve gives us, what we write

### From the harness (a sandbox is all it takes)

| Built-in | What it replaces |
| --- | --- |
| `web_search`, `web_fetch` | Half of `lib/perplexity.ts`. Perplexity stays for *cited synthesis*; plain retrieval is a built-in. |
| `bash`, `read_file`, `write_file`, `glob`, `grep` | A `/workspace` dossier per contact: dump the profile JSON, grep it, diff this month's against last month's. Job-change detection becomes a `diff`. |
| `todo` | Durable per-session task list. Multi-step research stops living in the prompt. |
| `ask_question` | The agent asks the rep — "two Marchettis at Fernhill, which one?" — and parks. Worth more than any heuristic we could write for that case. |
| `agent` (root-only) | Parallel research fan-out. Meeting prep with four attendees is four children, not four sequential passes. |
| `load_skill` | Procedures load on demand instead of bloating every turn. |

Enabled deliberately, per eve's own guidance to review the defaults: `bash`,
file tools and `web_fetch` stay on because a research agent without retrieval is
a chatbot; the sandbox gets **no database credentials** (§8).

### Authored tools — only where the harness cannot go

| Group | Tools | Why authored |
| --- | --- | --- |
| **CRM read** | `read_contact`, `read_crm_history`, `read_company` | Database access belongs in the app runtime, not the sandbox. `read_crm_history` returns threads, meetings, attendance **and message bodies** — the strongest identity evidence we own. |
| **Vendor** | `get_linkedin_profile`, `get_work_history`, `research_person` | Keys, rate limits, and LinkDAPI's `200 {success:false}` envelope. |
| **Judge** | `verify_identity`, `verify_social`, `corroborate_from_crm` | These fetch their own evidence and rule in code. `verify_social` exists and is the template: no `confidence` argument, no model-supplied `sourceUrl`. |
| **Decide** | `plan_research`, `schedule_recheck`, `set_priority` | The tools that make it an agent. `schedule_recheck` takes a date **and a reason**, and the reason is shown to the rep. |
| **Write** | `apply_fact`, `propose_fact`, `write_brief`, `record_job_change` | Approval policy lives here (§5). |

Two invariants: **a tool never accepts the model's own confidence**, and **"looked,
found nothing" is recorded with a date** — the generalisation of today's
`socialsCheckedAt`, without which every run re-litigates the same absence.

### Context control

`instructions.md` shrinks to identity and the one rule. Everything else becomes
a skill loaded on demand — `identity-matching` (exists), `confidence-scoring`,
`writing-a-brief`, `meeting-prep`, `job-change`, `data-boundaries`. `load_skill`
adds instructions, never execution surface, so this is free discipline.

`defineDynamic` then makes the surface itself situational, resolved at
`session.started`: a contact with no company gets no company tools; a task on a
live deal loads the deal-brief skill; ambiguous identity work can resolve a
stronger model. (Model resolution stays at `session.started` — switching
mid-session re-ingests the conversation at uncached prices.)

### The egress boundary

The agent reads everything. What leaves is controlled:

- **Never send raw customer text to a third-party search.** Perplexity and
  `web_search` get derived questions ("what did Acme announce in 2026?"), never
  a pasted thread.
- **Nothing from a mailbox reaches `/workspace`.** The sandbox has network
  access; email bodies stay in the app runtime, in the model's context.
- **`api.md` still stands:** never *log* headers, bodies or query strings. Read
  is not log.

---

## 5. The confidence model

### Evidence, weighted

Starting values, to be calibrated (§9), not truths:

| Evidence | Weight | Primary? |
| --- | --- | --- |
| Exact email match on a profile | 0.95 | ✔ |
| LinkedIn: employer matches **and** name is consistent with the address | 0.85 | ✔ |
| **They replied on a thread we synced** | 0.85 | ✔ |
| GitHub API: the account's own `name` or `company` matches | 0.8 | ✔ |
| **A signature block in a thread states the title** | 0.8 | ✔ |
| They attended a meeting on our calendar | 0.7 | ✔ |
| Perplexity states it with a citation | 0.4 | |
| Handle is a construction of their name | 0.35 | |
| A search engine cites the profile for their name + employer | 0.35 | |
| Employer matches, name does not | 0.2 | |

The two bolded rows are ours alone, and they are near the top. That is the
argument in §1 turned into arithmetic.

Combined as `1 − Π(1 − wᵢ)` over *independent* items, capped at 0.99, with two
rules a score cannot express:

1. **No auto-apply without a primary source.** Three weak signals multiply to a
   confident-looking number and remain three weak signals.
2. **Contradiction floors the score.** A profile saying one employer and a mail
   header saying another is not 0.6, it is unresolved, and the fact is held.

### Bands

| Band | Score | Behaviour | In the UI |
| --- | --- | --- | --- |
| `VERIFIED` | ≥ 0.85 + primary | Applied automatically | The value, plain. Dotted underline reveals the source. |
| `PROBABLE` | 0.55–0.85 | Stored as a proposal; field stays empty | A line under the field: *"LinkedIn suggests Head of Security · accept · dismiss"* |
| `POSSIBLE` | 0.3–0.55 | Stored, never shown as a value | Only in the provenance panel, as what was considered |
| below | < 0.3 | Not stored | — |

### Enforced by the approval policy, not the prompt

eve's docs are explicit that model behaviour alone must not guard sensitive
writes, and a rubric in a system prompt *is* model behaviour. The policy also
has to know **who** is driving, because a task-mode schedule cannot park for a
person:

```ts title="agent/tools/apply_fact.ts (policy sketch)"
approval: ({ session, toolInput }) => {
  const auth = session.auth.current;
  const automated =
    auth?.authenticator === "app" &&
    auth.principalId === "eve:app" &&
    auth.principalType === "runtime";

  if ((toolInput?.score ?? 0) >= 0.85 && toolInput?.hasPrimarySource) {
    return "not-applicable";                       // verified: just write it
  }
  // A cron turn cannot wait for a human, so asking would hang the run.
  return automated
    ? { type: "denied", reason: "Below the bar — call propose_fact instead." }
    : "user-approval";                             // a rep is here; ask them
};
```

Same tool, two behaviours, decided by the principal rather than by a flag the
model can set. Sensitive fields (`email`, `companyId`, anything that re-parents
a record) sit a band higher regardless of score.

---

## 6. The contact sheet

All of it inside `design.md`: components from `/packages/ui`, no new radii or
colours, no `className` overrides on shared components, new variants land in the
package.

### The Background section

Above Details, because it is what the sheet is *for*:

```
BACKGROUND                                            refreshed 2 days ago

Lewis Carhart is the CEO and co-founder of Comp AI. He previously led
growth at Fleetio and spent four years at Deloitte in risk advisory.

Current role    CEO & Co-founder · Comp AI · 2 yrs 3 mos
Previously      Head of Growth, Fleetio · Risk Advisory, Deloitte
Seniority       Founder / C-level          Function   Executive
Based           London, UK

WE KNOW THEM                                    ← from our own data
12 emails · last reply 4 days ago · 3 meetings · next: Thursday 14:00
Also here       Sarah Chen (CTO) · Tom Reyes (Security Lead)
```

The second block is the one no incumbent renders, because it is built from the
Gmail and Calendar sync rather than a purchased record.

### How confidence reads

`status-indicator.tsx` argues against pill chips in its own comment and it is
right: a sheet speckled with coloured badges is a sheet you read the badges of.

- **Verified values render as plain text.** No chrome. Decoration on everything
  is noise, and noise is how the one uncertain field gets missed.
- **Agent-written values carry a dotted underline.** Hover or focus reveals a
  `ProvenanceTooltip` — source, method, date, the evidence that scored it. One
  new component in `/packages/ui`.
- **Proposals are not values.** The field stays empty; the suggestion sits
  beneath with accept and dismiss. A guess is never formatted like a fact.
- **`StatusIndicator`** already covers in-flight and failed.

Accept and dismiss write `ContactFact.status` with `decidedById` — labelled
data for §9, produced by the people best placed to judge, when they care.

### The live panel

`withEve()` in `apps/app/next.config.ts` mounts eve's routes on the app's own
origin — no CORS, no URL env var. A `useEveAgent()` panel in the sheet then
gives the record something neither incumbent has:

- **Watch it work.** `actions.requested` / `action.result` render as a plain
  list of steps: *searched LinkedIn · read profile · checked GitHub API ·
  rejected `github.com/lewis`*. The rejections are the most trust-building thing
  on the page.
- **Interrupt and redirect.** "Is he still at Fleetio?" continues the same
  durable session, with the same history, on the same record.
- **Answer its questions.** `ask_question` renders inline: two Marchettis at
  Fernhill, pick one. The answer is worth more than any tiebreak heuristic.
- **Replay.** Sessions are durable for 30 days and the stream is rewindable, so
  "why does it think that?" is a question with an answer.

**Tables get none of this.** The contacts list stays plain text; scanning is its
whole job. Confidence and agency belong where a decision gets made.

---

## 7. Not static: how the agent chooses

### One dispatcher, not two cron prompts

A single `defineSchedule({ cron: "* * * * *", run })` claims due `AgentTask`
rows under an atomic lease and calls `receive(...)` per row with `appAuth`,
following eve's documented dynamic-scheduling pattern. Prompts stop being
numbered lists; the row carries the objective, the budget and the reason.

### The agent writes its own rows

`schedule_recheck` takes a date *and* a reason:

- champion on an open deal → 14 days ("job change here moves a live deal")
- named contact, no open deal → 90 days
- nothing found twice → 365 days, low priority
- `support@`, `no-reply@` → never

Today's `cron: "20 * * * *"` over `take: 10 ORDER BY createdAt` treats the CEO of
a live opportunity and a bounced alias identically.

### Events jump the queue

A calendar event tomorrow with an unknown external attendee inserts a
high-priority `meeting-prep` task the moment the sync sees it. Delivery is a
custom channel (`agent/channels/crm.ts`) exposing routes the sync posts domain
events to — "thread ingested", "attendee unknown" — never "enrich this". The
agent decides what an event means; that is the whole point of rule 1.

### Depth is a decision, budget is state

`plan_research` reads the contact, the deal context and the budget, then picks
the passes. The budget is a `defineState` slot decremented by the tools that
spend it — eve's own budget example, applied to vendor calls:

```ts
const research = defineState("crm.research-budget", () => ({ spent: 0, cap: 8 }));
```

A $40k opportunity earns more calls than a newsletter signup, and the agent —
not a boolean — makes that call.

### Fan-out for briefs

Meeting prep with four external attendees delegates four children through the
built-in `agent` tool with non-overlapping write scopes, then writes one brief.
If the orchestration gets genuinely complex, the opt-in `Workflow` tool lets the
model author that fan-out as one durable step; it stays off until a brief needs
it, because a capped subagent budget is easier to reason about than
model-authored JavaScript.

---

## 8. What stays deterministic

Widening discretion is only safe if the boundary is code:

- **Identity verification.** `verify_*` fetch their own evidence and rule.
- **The approval policy.** §5, keyed on principal, in the tool definition.
- **Never overwrite a human; never re-propose a dismissal.** In the fact store.
- **No database credentials in the sandbox.** The sandbox has `bash` and
  egress; CRM access is authored tools in the app runtime. This is the single
  most important line in the section.
- **No raw customer text leaves as a search query.** §4.
- **Rate limits and budgets.** A token bucket per vendor; a per-task budget the
  agent spends but cannot raise.
- **Business context only.** Name, title, employer, tenure, public profile. No
  special categories regardless of what an endpoint returns (v1 §9 stands).

Dynamic in *what to do*. Fixed in *what is allowed*.

---

## 9. Evals, or the confidence number means nothing

`evals/*.eval.ts` with `defineEval`, driving real sessions over the same HTTP
surface the app uses; `mockModel` for deterministic fixtures where the point is
the plumbing rather than the judgement.

| Metric | Target | Why |
| --- | --- | --- |
| Precision at `VERIFIED` | ≥ 0.98 | An auto-applied wrong fact is the failure that costs a deal. |
| Precision at `PROBABLE` | ≥ 0.75 | Below this, reps learn to dismiss without reading. |
| Recall | tracked, not gated | Coverage is a cost decision; precision is a trust one. |
| Cost per contact | tracked | Where "budget as an input" meets reality. |

The fixture set is real CRM addresses with known answers, **including ones whose
correct answer is nothing** — a matcher that never abstains scores well on a set
where everybody is findable. Accept/dismiss decisions from §6 feed the fixtures,
which is the flywheel: the more it is corrected, the better calibrated the number
the corrections are shown against.

Calibration is the deliverable: when a band says 0.85, roughly 85 of 100 should
be right. The weights in §5 move until that holds.

---

## 10. Retiring the API path

Order matters — no window with two writers:

1. **Facts first.** `ContactFact` and the `AgentEvent` hook land; the agent
   writes through them.
2. **Invert the triggers.** `companies.service.ts` and `google-match.service.ts`
   stop calling enrichment and post a domain event to the agent's CRM channel.
   Nest learns nothing about enrichment; it reports what happened.
3. **Move company enrichment.** Context.dev brand mapping becomes agent tools.
   `brand-mapping.ts` moves as-is — pure and well-tested.
4. **Delete `apps/api/src/enrichment/`,** minus `avatar.service.ts` (Blob
   mirroring belongs to whoever writes the URL). ~1,600 lines out of the API,
   ~200 of them moving rather than dying. One LinkedIn client in the repo, one
   identity matcher, one place to fix a bug.
5. **Move the tests.** `enrichment.spec.ts`, `contact-enrichment.spec.ts` and
   the integration spec go to `apps/agent/test/`. They encode findings, not
   implementation.

What Nest keeps: HTTP, auth, tRPC, the sync, and the ability to say "this
happened". What it stops doing: deciding anything about people.

---

## 11. Phases

| Phase | Scope | Done when |
| --- | --- | --- |
| **1 — Provenance spine** | `ContactFact`, `ContactBrief`, `AgentEvent` hook, `Contact.enrichmentStatus`; `ProvenanceTooltip` in `/packages/ui` | Every agent-written value on the sheet traces to a source and a date without opening a database. |
| **2 — Harness** | Sandbox on, built-ins reviewed and gated, instructions split into skills, `defineState` budget, `defineDynamic` surface | The agent researches with `web_search`/`web_fetch`/`bash`; three authored tools are deleted as redundant. |
| **3 — Confidence** | Evidence ledger, bands, principal-aware approval policy, proposals inline with accept/dismiss | A `medium` match becomes a suggestion a rep settles in three seconds instead of a discarded log line. |
| **4 — Agent-only** | §10 steps 2–5 | `apps/api/src/enrichment/` is gone. |
| **5 — Background panel** | Structured sections, tenure, "we know them" from Gmail/Calendar, colleagues | The five-minutes-before-a-call test in §1 passes. |
| **6 — Live panel** | Same-origin proxy, `useEveAgent` on the contact sheet, `ask_question` inline, step list | A rep watches a rejection happen and trusts the accepted ones more. |
| **7 — Dynamic scheduling** | `AgentTask`, dispatcher, `plan_research`, `schedule_recheck`, CRM channel, subagent fan-out | Two contacts researched on different cadences, for reasons the agent wrote and the rep can read. |
| **8 — Meeting prep** | Calendar-triggered briefs for external attendees | Thursday's 14:00 has a brief on it by Wednesday night. |
| **9 — Job changes** | Superseding facts raise an activity and a task for the owner | A champion moves and their owner knows that week. |

Phases 1–4 make the data trustworthy; 5–9 are what a rep would miss if you took
it away. One ordering constraint is non-negotiable, as v1 also said: a brief
built on unverified identities is confidently wrong *in front of a customer*.

---

## 12. Risks

- **eve is in preview.** APIs may change before GA. `apps/agent/lib/` is where
  the vendor-shaped code lives; keep framework surface in the authored files
  thin enough to move.
- **A sandbox with egress is a real capability.** §8's no-credentials rule is
  the mitigation, and it only holds if nobody "temporarily" adds `DATABASE_URL`
  to the sandbox env.
- **Task-mode schedules cannot pause.** Any design that wants a human mid-cron
  is wrong by construction; that is why §5's policy denies rather than asks.
- **Live streams show reasoning.** eve's docs flag the privacy implications of
  rendering reasoning events. Internal tool, so acceptable — but it is a
  decision, and it is recorded here as one.
- **Single-provider LinkedIn risk** (v1 §9) is unchanged.

---

## 13. Open questions

1. **Score on the record, or only in the tooltip?** Leaning: band in the
   tooltip, raw number only in the provenance panel.
2. **Do proposals expire?** A suggestion nobody has judged in 90 days is noise.
   Auto-dismiss, or keep and stop re-scoring?
3. **Who owns the budget dial?** A constant, or a per-account setting a rep can
   turn up?
4. ~~Does the agent see message bodies?~~ **Decided: yes, in full.** Internal
   tool, single tenant. The boundary is egress (§4), not access.
5. **Company facts too?** The model generalises, but companies have one source
   and no identity problem. Probably later, possibly never.
6. **A rep edits a field by hand — what happens to the fact?** Superseded and
   kept as history is right, but the store must then accept writes that did not
   come from the agent.
7. **Does the live panel belong on companies and deals too?** Same machinery,
   three times the surface. Contacts first.

---

## 14. What each phase actually taught us

Appended as phases land, in v1 §0's spirit — measurements that changed the
design, not a changelog.

### Phases 1–4 (2026-08-01)

**The weights in §5 do not behave the way the table implies, and a test caught
it.** `crm.signature-block` at 0.8 is below the `VERIFIED` floor, so a title
read out of a signature was going to become a suggestion rather than a fact —
not what §1 promises. The realistic case saves it: a signature is read *on a
thread they replied to*, so the evidence is `crm.thread-reply` +
`crm.signature-block` → 0.97, and it writes. The lesson is that weights must be
tested against the **combinations that actually occur**, not one at a time.

**Four weak signals do not reach 0.85** (they reach 0.797), so the "pile of weak
evidence" scenario the primary-source rule exists to stop was not reachable by
arithmetic anyway. The rule is still right — it has to hold under
re-calibration — but the test for it now asserts `bandFor(0.99, false)`
directly rather than pretending the weights get there.

**Approval gates were wrong for `record_fact`.** The plan had one on the write
tool. Building it showed the flaw: if approval denies the call, `execute` never
runs, so the *proposal is never stored* — the gate would have deleted the
feature it was protecting. Band logic inside the same function that scores the
evidence is strictly stronger, because there is no path around it. Approval
moved to where blast radius is bigger than one field: `record_job_change`,
which can re-parent a contact.

**Verification functions should return evidence, not verdicts.** `verifyGithub`
used to decide `accepted: true` on *any* of name-match, company-match, or
domain-link. That meant an account sharing only an employer — a colleague — was
written with the same authority as one naming the person. Returning evidence
kinds instead put both through the ledger, and the colleague case now scores
0.2 and is dropped. Same code, one fewer way to be confidently wrong.

**The "delete three redundant tools" prediction was wrong in detail and right in
outcome.** Nothing became redundant *because of the harness* — `research_person`
and the two candidate-finders still earn their keep. Six tools went anyway
(`update_contact`, `write_contact_summary`, `write_briefing`,
`list_contacts_to_research`, `list_contacts_to_profile`, plus the API's two
enrichment services), because the fact store replaced the write path and one
`list_outstanding_work` replaced the "which queue am I" tools.

**The sandbox needs no network, which was not obvious until the harness table
was read properly.** `web_fetch` runs in the app runtime and `web_search` at the
provider — only `bash` and the file tools run in the sandbox. So `deny-all`
costs nothing and removes the only shell-shaped path out of the building for
the email bodies this agent now reads in full. It is set on the backend factory
rather than in `onSession`, so it cannot be forgotten per session.

**`packages/db` and `packages/auth` imported `@crm/env` without declaring it.**
Hoisting hid it until `bun add` in `apps/agent` created a local `node_modules`
that shadowed the root, and then every DB-touching test failed at once. Two
one-line `package.json` fixes; worth recording because the symptom
("Cannot find module" in a package nobody edited) looks nothing like the cause.

### Phase 6 (2026-08-01)

**`withEve` was the wrong tool, and the constraint made the design better.**
The agent stays its own deployment, so mounting it inside the Next build was
never available. What replaced it is the pattern the app already uses for the
API: a **same-origin proxy**, at `app/eve/v1/[...path]/route.ts`, mounted at
exactly the path `useEveAgent()` defaults to. The hook needs no `host`, the
browser never learns the agent has its own origin, and there is no CORS and no
cross-site cookie anywhere in it.

**The proxy is an enforcement point, not a passthrough**, and that is the one
structural difference from the API proxy beside it. The agent never sees the
session cookie — it is stripped — so if the route did not check the session,
nothing downstream would. It checks, then mints a two-minute HS256 token naming
the rep.

**eve's `jwtHmac()` helper labels the caller a service, and that would have been
a silent bug.** Verified through the helper, a rep's token resolves to
`principalType: "service"` with `principalId: "crm-app:user_123"` — sensible for
a machine credential, wrong for a person. `lib/approval.ts` decides whether to
pause for a human by reading exactly those fields, so a sensitive write would
have been *refused* with "not something to do unattended" while the rep sat
watching. `repFromCrm` wraps `verifyJwtHmac` and maps the subject to a real user
principal instead. Found by printing the verifier's output rather than trusting
the shape, and now pinned by `channel-auth.spec.ts`.

**Both halves of the token are tested against each other**: the app mints and
eve's own verifier accepts (`apps/app/test/agent-bridge.spec.ts`), and forged,
expired, wrong-audience, wrong-issuer and subject-less tokens are all rejected
by the real auth function (`apps/agent/test/channel-auth.spec.ts`). A shared
secret is the whole security of the panel, so neither side is asserted from
memory.

**`AGENT_BRIDGE_SECRET` unset skips the entry rather than opening it.** No
signer, no panel, everything else unchanged — the agent still runs its own
schedule. That is the correct failure for an optional capability whose absence
must never widen access.

**One duplication survived on purpose.** `domainOf` in the agent and
`domainFromEmail`/`normalizeDomain` in the API do the same job. Both apps
genuinely need it, and a shared package for two pure functions is more
machinery than the risk justifies — but it is the same shape as the drift in §0,
so it is written down here rather than left to be rediscovered.
