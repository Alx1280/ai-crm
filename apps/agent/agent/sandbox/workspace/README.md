# /workspace

Scratch space for research in progress. Nothing in here is the record — the CRM
is the record, and it is reached through tools, not through this filesystem.

Useful for:

- **Dossiers.** `dossiers/<contactId>.json` — dump a profile you fetched, then
  `grep`/`jq` it instead of re-reading it into context.
- **Diffs.** Keeping last month's profile next to this month's is how a job
  change becomes visible without a second lookup.
- **Working notes** while you assemble a brief across several sources.

Two things this filesystem must never hold:

1. **Anything out of a mailbox.** Email bodies and meeting notes stay in the
   turn, in the app runtime. `read_crm_history` gives you the whole message
   because it is our own data; writing it here moves it somewhere with a
   different lifetime and a different set of eyes on it.
2. **Credentials.** There are none here, and there is no reason to create any.

There is no network from this sandbox. `web_fetch` and `web_search` still work
— they run outside it.
