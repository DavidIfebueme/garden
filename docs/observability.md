# Observability

Garden uses Cloudflare Workers Logs as the primary debugging surface. Use the Garden app Worker logs first (`garden-staging`); connector APIs and Executor MCP Durable Objects run in that deployment. The Tail Worker (`garden-staging-tail`) is only an optional summary stream.

## Git build trigger

Cloudflare Workers Builds watches `main` and `dev` in `Flow-Research/garden`.
The trigger is attached to `garden-staging`, so both branches' build logs appear
there. Its deploy command is `cd ../.. && pnpm run deploy:ci`, with root directory
`/apps/web`. The dispatcher uses Cloudflare's `WORKERS_CI_BRANCH`:

| Branch | Alchemy target | Worker | Migrations |
| --- | --- | --- | --- |
| `main` | `staging` | `garden-staging` | Yes |
| `dev` | `dev` | `garden-dev` | No |
| Manual only | `preview` | `garden-preview` | No |

Dev and preview share staging's PostgreSQL origin. Their Cloudflare resources
are independently owned. Preview stays manual through `pnpm run deploy:preview`;
there is no automatic preview build for pull requests or other branches.

Staging retains the existing `garden-production` Alchemy stack and `production`
state stage to preserve resource ownership. The product target is `staging`.

Cloudflare documents branch selection and build-time variables in its
[Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/).

Cloudflare stores the GitHub repository ID, not only its
owner and name. After a repository transfer or replacement, reconnect the
Workers Builds trigger even when the GitHub URL remains unchanged.

## Primary dashboard filters

Open Workers & Pages → Observability, then query the producer Worker. Useful filters:

```text
$metadata.service = "garden-staging"
$metadata.error EXISTS
$workers.outcome = "exception"
$workers.event.response.status >= 500
$metadata.level = "error"
message : "auth.session.lookup_failed"
event = "auth.session.lookup_failed"
$workers.event.request.path = "/api/inbox"
```

Use **Invocations** when you want request-grouped context. Use **Events** when you want chronological console/error rows. Add columns for `event`, `message`, `component`, `requestId`, `$workers.event.request.path`, `$workers.event.response.status`, and `$metadata.error` when debugging app errors.

## Tail Worker policy

`garden-staging-tail` consumes producer trace events after a producer invocation finishes. Cloudflare's Tail handler invocation message is always `tail`, so tail-worker invocation rows are noise in the dashboard. Its Wrangler config disables invocation logs and keeps only custom summary logs emitted by the observer.

The tail observer should not flatten producer errors into an alternate schema for normal debugging. Cloudflare already indexes producer metadata and structured app logs. Tail summaries are for compact alert-like rows only.

## Log levels

Staging sets `GARDEN_LOG_LEVEL=warn`. Garden structured `debug` and `info` records are intentionally suppressed there. Warnings and errors still emit. Local development can set a lower level when noisy debugging is needed.

## Structured app logs

`createGardenLogger` emits structured JSON with both `event` and `message` set to the Garden event name. `event` is the stable programmatic field; `message` makes Cloudflare's row/search UI usable without expanding every row.
