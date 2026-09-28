# Org Brain: living memory, write-back, and surfaced gaps

Status: implementation work on `feat/brain-updates`, branched from `upstream/dev` (`0906652`). Not pushed. This document is the source of record for the PR.

## 1. What this branch does

Turns the Org Brain from an upload-only document store into a living memory: turns read relevant knowledge automatically, finished runs file durable knowledge back through a typed gate, humans review low-confidence writes in the inbox, questions and approvals cannot be stranded, and work-product review is reachable from both the inbox and the issue.

The design follows the org-brain gist and supermemory's company-brain lessons, adapted to Garden's product surfaces. Garden is not a Slack bot; the same principles are applied to issue runs, automations, and chat.

## 2. Starting point and the problems

Before this branch, from the code:

- Storage: Helix graph plus vectors, nodes `file`, `section`, `note`; edges `HAS_SECTION`, `MENTIONS`, and free-text labels. Embeddings 384-dim, `@cf/baai/bge-small-en-v1.5`, one per file and section. R2 holds raw bytes; Helix holds extracted text and vectors. `packages/brain`.
- Ingestion: upload route writes R2, `brain.addItem` dedupes on a canonical file key, then `ctx.waitUntil(indexAndAudit)` extracts, chunks, embeds, and runs a one-shot `BrainAuditSubAgent`.
- Agent access: five tools (`brain_search`, `add_to_brain`, `brain_observe_mention`, `brain_link`, `brain_neighborhood`) registered in chat and automation, not issue runs, and named in no base prompt.
- No scope on items, only `workspace_id`.
- Search ranked by reciprocal rank fusion only; no recency signal.
- No instrumentation, no measurement.
- Indexing used `ctx.waitUntil`, best effort.

Problems addressed: static knowledge, agent-only access, no entities, no scope, no source or time signal, no measurement, unreliable ingestion, and several UI gaps found during testing.

## 3. Architecture decisions

- Knowledge is shared; agent state stays local in each Durable Object.
- Durable knowledge is separate from live connector state. The brain keeps conclusions; connectors stay the live source.
- Silence is a valid outcome. Retrieval below the floor injects nothing; a background pass that finds nothing writes nothing.
- Attention is a budget.
- Nothing destructive. Merges and links are reversible assertions.
- Scope is inherited from the source, never guessed by an agent.
- Measure before tuning.
- Write-back is additive. It creates new items; it never edits existing documents. Editing knowledge is a separate, unbuilt feature.

## 4. Brain domain and service changes

### Scope model

`packages/brain/src/domain/scope.ts` (new):

- `BrainScope` union: `{ kind: 'org' } | { kind: 'team', teamId } | { kind: 'user', userId }`.
- `canViewScope(scope, viewer)`, `scopeKey(scope)`.
- `narrowestScope(scopes)` returns the shared restricted scope, or `undefined` when scopes are incomparable, so a mixed-scope derivation fails closed.

`packages/brain/src/domain/items.ts`:

- Optional `scope` on `BrainItem` and `NewBrainItem`.
- Optional `occurredAt` timestamp on both.
- `scopeOf(item)` defaults absent scope to `org`.

`packages/brain/src/helix/constants.ts`:

- `PROPS.scopeKind = 'scope_kind'`, `PROPS.scopeId = 'scope_id'`, `PROPS.occurredAt = 'occurred_at'`.

`packages/brain/src/services/Brain.ts`:

- `decodeScope` maps stored properties to a scope; absent means `org`; invalid fails closed.
- `propsOf` writes scope only when provided, and `occurredAt` as an ISO string.
- `itemProjection` carries the new properties.
- Viewer filtering on every read path: `read`, `readFileItem`, `readFile`, `search`, `listFiles`, `sectionsOf`, `neighborhood`. Optional viewer defaults to org-only, so an unwired caller cannot over-expose.
- `neighborhood` fails when the root is not visible, instead of returning neighbors of a hidden node.
- Search logs only visible hits.
- `addText` accepts `scope`.

### Freshness

`packages/brain/src/services/freshness.ts` (new):

- `freshnessWeight` half-life decay, non-finite timestamps treated as fresh so one bad value cannot scramble the sort.
- `rerankByFreshness` multiplies fused score by decay and sorts by `rankScore`.

`Brain.search` now reranks by freshness. The fused RRF `score` is preserved; `freshness` and `rankScore` are separate fields. Half-life 90 days, floor 0.25.

`occurredAt` is used for freshness with `origin.at` as fallback. The stored string decodes via `Schema.DateTimeUtcFromString` (`Schema.DateTimeUtc` does not decode strings; verified empirically).

### Retrieval selection

`packages/brain/src/services/selection.ts` (new): `selectInjection` takes anchors plus scored hits, dedupes by id, orders anchors first, drops hits below a relevance floor, and caps item count.

### Write-back decision core

`packages/brain/src/services/write-back.ts` (new): `decideWriteBack(candidates, policy)` returns `link | write | review | skip`. Skips blank claims, invalid or non-finite confidence, and empty duplicate ids. Reviews sensitive or low-confidence claims. Never overwrites.

## 5. Instrumentation schema

`packages/db/src/schema/brain-telemetry.ts` (new):

- `brain_retrieval`: one row per retrieval (workspace, actor, agent, surface, source, query, scope, hit count, timestamp).
- `brain_retrieval_hit`: returned item id, rank, score, `used`, `used_at`.
- `brain_write_proposal`: pending/approved/rejected knowledge proposals with claim, kind, confidence, scope, evidence, decider, timestamps.

Migration `0049_tense_human_cannonball.sql` plus `0049_snapshot.json`. Note: the repo journal has a pre-existing duplicate `idx: 46` entry, so drizzle generated a second `0048` prefix; the new migration was renamed to `0049` by hand and the snapshot chain verified (`db:check` clean).

## 6. Read injection

`packages/agent-runtime/src/brain-injection.ts` (new):

- `latestUserText(messages)` extracts the current user text.
- `loadBrainInjection` runs a scoped `brain.search`, applies an absolute minimum top score of `0.02` and a relative floor of `0.6` of the top score, formats a compact memory block, and returns it. Any failure returns an empty block so a turn never breaks.
- Debug log `[brain-injection]` with `event`, `query`, `hitCount`, `topScore`, `relevanceFloor`, `injectedCount`, `itemIds`, and `surface`.

Wired into:

- Chat: `AgentDO` `ChatSubAgent.beforeTurn`, viewer is the thread owner.
- Issue runs: `IssueRunSubAgent.beforeTurn`, org viewer.
- Automations: `AutomationRunSubAgent.beforeTurn`, org viewer.

Confirmed live: `query: 'how do i ask a client for payment?'` injected 6 items including the uploaded playbook; `yo`, `yo yo`, `yo yo yo` log `brain.injection.empty`.

Not done: scoring on semantic distance, and seeding issue injection from the issue title and body (issue runs still seed from the generic run instruction, which is noisy).

## 7. Write-back

`packages/agent-runtime/src/brain-write-back.ts`:

- Four-question durability prompt.
- `propose_brain_item` tool with `claim`, `kind`, `confidence`, `sensitive`. The handler calls `decideWriteBack` (policy `directWriteConfidence: 0.75`):
  - `write` calls `Brain.addText` with org scope.
  - `review` inserts a `brain_write_proposal` row.
  - skip/link does nothing.
- `add_to_brain` is removed from the write-back active tools, so the model cannot bypass the gate.

`packages/agent-runtime/src/brain-write-back-sub-agent.ts`: `BrainWriteBackSubAgent`, a one-turn Think facet mirroring the audit facet. Active tools: `brain_search`, `propose_brain_item`. Has `HYPERDRIVE` for proposal writes.

`packages/agent-runtime/src/brain-write-back-runner.ts`: runner that authorizes, resolves the agent, acquires the facet, runs the turn, and reclaims the facet.

`AgentDO` (`packages/agent-runtime/src/agent-do.ts`):

- `startBrainWriteBack` callable RPC.
- `claimBrainWriteBackRun` claims one write-back per run in DO SQLite (`brain_write_back_runs`), so a retried workflow completion cannot double-write.
- Trigger in `completeRunTurn` and `completeAutomationRunTurn` on terminal success (`succeeded` or `blocked` for issues, `completed` for automations), fire-and-forget via `ctx.waitUntil`.

Summary source. The first attempt captured text in `onChatResponse`, which does not fire for workflow-driven runs, so the summary was always empty and the trigger never fired. Fixed to read `getMessages()` at completion, joining the last three assistant texts (the final assistant message is often tool-calls only). A trigger log was added: `agent_do.brain_write_back.trigger_check { status, summaryLength, hasWorkspace }`.

Run-end status. `completeWorkflowTurn` now returns `{ status, workspaceId, summary }` for both facets.

Not runtime-verified: no run has yet produced a proposal or a written note. That is the next test.

## 8. Inbox knowledge digest

- `packages/core/src/types/inbox.ts`: new type `brain_proposal`.
- `inbox-compute.ts`: source `brain_proposal:<id>` from pending `brain_write_proposal` rows.
- `inbox-detail-label.tsx`, `inbox-item-preview.tsx`: label and preview.
- `inbox-control-plane.tsx`: `BrainProposalInboxAction` with Approve and Reject.
- `apps/web/src/routes/api/brain/proposals/$id/resolve.ts`: approve writes the claim to Helix (org scope) and marks the proposal approved; reject marks it rejected; both archive the inbox item.
- `apps/web/src/lib/api/inbox.ts`: `resolveBrainProposal`.

## 9. Question durability

Root cause: `ask_question` writes a durable inbox row, but `computeInboxItems` archived any item whose source key was absent from the live sources. Leaving `waiting_for_input` dropped the key, so the row was archived while unanswered.

Fix: `persistInboxSourceItems` keeps an unarchived `waiting_for_input:<runId>` item while its run is non-terminal, using `LIVE_RUN_STATUSES`, and archives it once the run is terminal or the issue closes. Answering archives by key (`comments.ts`); terminal issues are archived by `archiveTerminalIssueInbox`.

Lifecycle guard already existed: `LIVE_RUN_STATUSES` includes `waiting_for_input`, and `startIssueRun` refuses a new run while a live run exists (`run-service.ts:554-604`).

## 10. Work-product review in the issue detail

`issue-detail.tsx` `IssueOutputSurface` passed `() => {}` for `onApprove`, `onRequestChanges`, `onApply`, so the buttons did nothing. Now wired to a `reviewWorkProduct` mutation with invalidation of the work-products list, active run, detail, and timeline.

Why it was invisible: the issue detail never invalidated the work-products query when a run finished, so a stale empty result persisted. Added `issueKeys.workProducts(issue.id)` to the run-change invalidation.

## 11. Live approval in the issue detail

The old card was fed by `issue_run:approval_requested`, an event with no writer anywhere in the repo, and `pendingApprovalFromEvents` discarded the request id anyway.

Fix: new `GET /api/issues/$id/pending-approval` reads the pending `permission_request` for the issue's active run and returns `{ request_id, title, body }`. The issue detail renders the approval card from it and wires Approve and Deny to `api.resolvePermissionRequest`.

Not runtime-verified: no run has paused `waiting_for_approval` since the change.

## 12. Plan panel and issue-interaction skill

- `run-plan-card.tsx`: an `in_progress` step only spins while the run is live; a finished run shows remaining steps as hollow circles instead of an endless loader.
- `skills/issue-interaction/SKILL.md`: requires `update_plan` at the start, at every transition (finished step `completed`, next `in_progress`), and one final call before producing a work product, asking, or blocking. Never end a run with a step `in_progress`.
- The steps come from the agent's own `update_plan` tool; the UI reconstructs the panel from the latest `update_plan` tool call in the run events.

## 13. Tool schemas for strict providers

DeepSeek rejects a tool whose parameters are not a top-level JSON object. Two tools used root `z.union`, which serializes to `anyOf` with no `type`:

- `add_to_brain`: now one object with a required `mode` of `create | update`, optional `itemId`, `label`, `content`, `kind`, `summary`, and per-mode validation. The audit prompt updated to `mode "update"`.
- `assign_issue`: now one object with a required `target` of `agent | member`, optional `assignee_agent_id`, `assignee_member`, and per-target validation. Restores the model-visible exactly-one contract without a root union.

Both are safe for Kimi (object is canonical) and required by DeepSeek. A test asserts every brain tool schema is object-typed.

## 14. Inbox thread de-duplication

`inbox-notification-detail-v2.tsx` rendered the truncated preview and the full action card for the same latest item. It now hides the preview for the latest item when the type has a rich action card (`wp_review`, `waiting_for_input`, `brain_proposal`, `review_requested`).

## 15. Environment and local run notes

- `pnpm` installed via corepack; `pnpm install --frozen-lockfile` after the rebase (upstream changed the lockfile).
- Local data: `pnpm offline:up` starts Postgres (55432) and Helix (6968). Containers must be restarted after a host reboot.
- Cloudflare auth: `wrangler login` OAuth expired and this shell is non-interactive, so a `CLOUDFLARE_API_TOKEN` is in `.env`. Rotate it when done; the token was also pasted in chat.
- Node fetch to Cloudflare timed out over a dead IPv6 route while curl fell back to IPv4. Fixed by launching the server with `NODE_OPTIONS='--dns-result-order=ipv4first --no-network-family-autoselection --max-old-space-size=3072'`.
- `.env` and `.audit/` are untracked. `.gitignore` covers `.env`, `.dev.vars`.

## 16. Commits

```
2ca3f3d7 feat(brain): living org brain foundations
7c20a827 feat(brain): gate run write-back and fix surfaced gaps
ef2767a3 feat(inbox): surface Org Brain write proposals for review
e00ca6df fix(issues): source live approval from permission_request
b29d7177 fix(brain): read run summary from session and repair work product surfacing
b466e48e fix(ui): stop spinning finished plans and de-duplicate inbox action cards
4dc28a2d docs(issue-skill): require plan updates on every transition and a closed final plan
770fcb7a fix(brain): summarize write-back from assistant text and log the trigger decision
```

49 files, about 2720 insertions against `upstream/dev`.

## 17. Verification state

Verified:

- Workspace typecheck 12/12; brain and web lint 0.
- Brain tests 67 passed against real Helix, including new scope, freshness, selection, write-back, occurred-at, and section-scope tests.
- Agent-runtime tests 8 passed (brain tools object-schema guard, audit, assignment).
- `db:check` clean; migration 0049 applied to local Postgres and to Testcontainers.
- Injection confirmed live in logs.
- Requiring real Helix and Postgres, not scripts, for the above.

Not runtime-verified:

- Write-back producing a proposal or note (next test).
- The knowledge digest card resolving a proposal.
- The issue live-approval card resolving a permission request.
- Question durability across a run leaving `waiting_for_input`.

## 18. Known gaps and open items

- Injection scores on the coarse RRF tied to the score fields, not semantic distance; issue runs seed from the generic instruction, not the issue text.
- Write-back does not dedupe into `link`; `duplicateOf` is never set. Dedupe is prompt-level only.
- Approving a work product does not resume or start a follow-up run, so an issue the agent left `in_review` stays there until a human moves it. Verified in code: no run trigger in `approveWorkProduct` or the review route.
- Request changes writes a comment but likewise does not start a run from this path.
- Entity resolution, mentions staging, connectors on-demand capture, the cleanup pass, source/time ranking for connector data, and the people-facing brain view are not built.
- Pre-existing drizzle journal duplicate `idx: 46` remains.
- `revise_work_product` failed in an early run (`ok: false`); not investigated.

## 19. Test scenarios issue

Use one issue per scenario, or fold them into one issue with a checklist. External requirements are noted.

Scenario A, decision plus write-back (no external tools):

Title: `Decide our partial-payment policy for overdue invoices`
Body: use the payment playbook in the Org Brain; decide how a partial payment changes the schedule; rules only; produce a brief and record in the Org Brain.
Expect: read injection finds the playbook; a brief work product; a `brain_write_proposal` row or a written note; plan steps transition and close.

Scenario B, multiple approvals and one denial (needs connectors):

Title: `Notify a customer and update the shared doc`
Body: send the follow-up email to the customer, then update the Google Doc with the outcome, then post a summary comment. Do not research externally.
Expect: the run pauses `waiting_for_approval` before send, an inbox permission card appears with Approve and Deny; approve resumes; a second card appears before the doc edit; deny that one and confirm the agent adapts and does not perform the action; two approval cards in sequence.

Scenario C, a question (no external tools):

Title: `Choose between two onboarding tracks`
Body: ask which track the team prefers before producing the brief.
Expect: run pauses `waiting_for_input`; an inbox Question waiting item appears; it persists while the run is live; answering archives it and resumes.

Scenario D, work-product revision:

Title: `Draft our incident severity rules and revise on feedback`
Body: produce a brief; the reviewer requests changes; revise in place and produce v2.
Expect: Approve, Request changes, and Apply work from both the inbox and the issue detail; versions increment.

Scenario E, denial of a destructive action (needs a destructive connector capability):

Title: `Close the stale tickets`
Body: close the listed tracker tickets if they are stale.
Expect: approval card; deny; the run continues without closing and reports the denial.

## 20. PR checklist

- Rebase is done; branch is on top of `upstream/dev`.
- Run `pnpm typecheck`, `pnpm lint`, `pnpm --filter @garden/brain test` with `GARDEN_ITEST_HELIX=1`, and `pnpm --filter @garden/db test`.
- Confirm `.env` and `.audit/` are not committed.
- Decide whether to commit the decision trail (`.audit/brain-updates.tsv`).
- Wire approval to resume the run, or state explicitly that it does not.
- Note the Cloudflare token rotation and the IPv6 `NODE_OPTIONS` requirement for local dev.
- Fix or link the drizzle journal duplicate index separately.
