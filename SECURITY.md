# Security Policy

## Reporting a vulnerability

Please report privately through **Security → Report a vulnerability** on this repository, not in a
public issue.

Include the revision, your configuration, the impact, and the steps to reproduce it. If it involves
real data, describe the shape of it rather than pasting it.

We'll acknowledge within a few working days and tell you what we intend to do. This is a small
project and there is no bounty.

## What this is, and what it assumes

This CRM is built for **one organisation of authenticated internal users**. It is not a hardened
public or multi-tenant service boundary, and the design says so out loud in a few places. The
limits below are real and worth reading before you put customer data in it.

**Sign-in is the entire authorisation model.** `ALLOWED_SIGN_IN` decides who gets in; after that,
every signed-in person can read and write every record. There are no roles, no per-record
permissions and no organizations — deliberately, because a permissions check that always returns
`true` reads like a real one at review time. If you need someone to see only part of the pipeline,
this is the wrong tool today.

An unset `ALLOWED_SIGN_IN` fails closed: nobody can sign in. A list that names a consumer domain
(`gmail.com`) is an open door, which is why single addresses are supported.

**Operators can read everything.** Whoever runs the deployment has the database, the environment
and the logs. Nothing here protects data from the person hosting it.

**The agent reads your mail.** Gmail and Calendar access is a condition of signing in, because
reading the mailbox is what the CRM is for. The research agent reads message bodies, meeting
attendees and signature blocks belonging to real people who did not sign up for this. It is
deliberately unrestricted on the *read* side and constrained on the *write* and *egress* sides —
see `apps/agent/agent/skills/data-boundaries.md`. If you deploy this, you are the data controller
for those mailboxes.

**Outbound calls send data to third parties.** Each optional key in `.env.example` turns on a
vendor the agent can query, and a query carries whatever it needs to ask the question — typically a
name, an email domain and an employer. With no keys set, nothing leaves your infrastructure except
Google's own APIs. That is the default.

**The sync route is guarded by a shared secret.** `POST /internal/sync/google` is called by a cron,
so it has no session to check; `CRON_SECRET` is the whole guard and the route refuses to run
without it. Treat it like a password.

**Session cookies depend on one shared value.** The API and the web app both verify sessions
against `BETTER_AUTH_SECRET`. Rotating it signs everyone out, which is the intended way to revoke
every session at once.

## Deploying it safely

- Set `ALLOWED_SIGN_IN` to a domain you control. Never a public mail provider.
- Generate `BETTER_AUTH_SECRET` yourself (`openssl rand -base64 32`). The value in any example file
  is not a secret.
- Serve both processes over HTTPS. Secure cookies switch on with `NODE_ENV=production`.
- Set `CRON_SECRET` if you expose the sync route at all.
- Keep the database off the public internet.
- Start with no optional API keys and add them one at a time, so you know what is leaving.

## Supported versions

`main` is the only supported branch. There are no backports.

## Dependencies

Dependencies are updated deliberately rather than automatically. If you spot a vulnerable
transitive dependency, report it the same way as anything else — a PR bumping it is welcome, but
tell us what the exposure is, since a CVE in a dev-only tool and one in the request path deserve
different urgency.
