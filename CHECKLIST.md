# Checklist

## New Package Bootstrap

- [ ] Create `packages/<name>/src/index.ts`
- [ ] Add `package.json` with `name`, `version`, `main`, `module`, `types`, `exports` fields
- [ ] Extend `tsconfig.base.json` in local `tsconfig.json`
- [ ] Add package to `pnpm-workspace.yaml`
- [ ] Add build pipeline entry to `turbo.json`
- [ ] Add `@agents/core` as a workspace dependency if needed
- [ ] Run `pnpm install` from root to link

---

## Adding a Tool

- [ ] Define Zod schema — every field described, no `z.any()`
- [ ] Name is `snake_case`, globally unique across the agent instance
- [ ] `execute()` is async, returns a plain serialisable value (no class instances, no Dates)
- [ ] `execute()` handles its own errors and throws typed errors — never swallows silently
- [ ] Tool is registered via `agent.tool()` before the server starts
- [ ] Confirm tool appears in `GET /tools` response
- [ ] Write at least one unit test for the `execute()` function in isolation

```ts
// Minimal passing shape
new Tool({
  name: "my_tool",
  description: "One sentence. What it does, not how.",
  schema: z.object({
    query: z.string().describe("The search query"),
  }),
  execute: async ({ query }, ctx) => {
    return { result: await myApi.search(query) };
  },
})
```

---

## Adding an Intent

- [ ] `name` is `snake_case`
- [ ] `description` is plain English (the planner reads this to route)
- [ ] `fields` covers every piece of data the downstream tools need
- [ ] `tools` lists only tools this intent is allowed to call
- [ ] If the intent mutates data, `requiresApproval: true` is set
- [ ] Manual test: send a message that should trigger this intent and confirm routing

---

## Express Adapter

- [ ] `expressAgent(agent)` is mounted before the catch-all error handler
- [ ] CORS is configured for the React client's origin
- [ ] Auth middleware is applied to the router, not globally (to allow public health checks)
- [ ] `/stream` returns `Content-Type: text/event-stream` with `Cache-Control: no-cache`
- [ ] Graceful shutdown: `server.close()` is called on `SIGTERM`
- [ ] Error events (`type: "error"`) are returned over SSE, not as HTTP error codes, so the client can display them

---

## Next.js Adapter

- [ ] Route file is `app/api/agent/route.ts` (or a subdirectory)
- [ ] File exports `const POST = nextAgent(agent)` — no default export
- [ ] If using Edge runtime: `export const runtime = "edge"` is set and no Node-only APIs are used in tools
- [ ] Server Actions that call `serverAction(agent)` are marked `"use server"`
- [ ] Environment variables used in tools are prefixed correctly: `NEXT_PUBLIC_` for client, unprefixed for server
- [ ] Streaming works in both `next dev` and `next build && next start`

---

## React Integration

- [ ] `<AgentProvider endpoint="...">` wraps the component tree above the first consumer
- [ ] `endpoint` points to an absolute path or full URL — not a relative path that breaks in nested routes
- [ ] `useChat()` is called inside a component that is a descendant of `AgentProvider`
- [ ] `messages` array is keyed by `id`, not by index, when rendered in a list
- [ ] Loading state (`status === "thinking"`) is visually indicated
- [ ] Error state (`status === "error"`) is caught and displayed — not silently swallowed
- [ ] `<FloatingChat>` is rendered once, at the top of the tree
- [ ] `hotkey` prop value is tested on both Mac and Windows if the app targets both

---

## Planning Popover

- [ ] `usePlanning().questions` is checked before rendering — render nothing if empty
- [ ] Each `PlanningQuestion` is rendered with its `label`, `description`, and appropriate input type
- [ ] `answer(id, value)` is called on every user interaction, not just on submit
- [ ] Required questions (`required: true`) block `submit()` — validated before calling
- [ ] Popover closes automatically when `questions` returns to empty after `submit()`

---

## Streaming

- [ ] SSE connection is closed (`EventSource.close()`) on component unmount
- [ ] Reconnection is handled: `EventSource` reconnects automatically; test by restarting the server
- [ ] `type: "done"` event triggers a state reset, not `type: "token"` with an empty delta
- [ ] Token stream is concatenated correctly — no double spaces, no missing characters
- [ ] Long streams do not cause layout thrash — message container has a fixed max-height with overflow scroll

---

## Model Adapter

- [ ] `createModel()` string follows `provider:model-name` format exactly
- [ ] API key is read from environment, never hardcoded
- [ ] Custom endpoint includes trailing `/v1` if the provider requires it
- [ ] `stream()` implementation handles early connection close without throwing unhandled rejections
- [ ] Model errors (rate limit, context length exceeded) are caught and re-thrown as typed `ModelError`

---

## Middleware

- [ ] Each middleware calls `next()` exactly once (or deliberately stops the chain)
- [ ] `summarizationMiddleware` trigger threshold is set lower than the model's context limit
- [ ] `humanInTheLoopMiddleware` `interruptOn` keys match tool names exactly (case-sensitive)
- [ ] Approval flow is tested end-to-end: confirm the `approval:required` SSE event is emitted and the UI renders the approval card

---

## Before Merge

- [ ] `pnpm -r typecheck` passes with zero errors
- [ ] `pnpm -r test` passes with zero failures
- [ ] `pnpm -r build` produces `dist/` in every package
- [ ] No `console.log` left in library code (use the logger plugin for intentional output)
- [ ] No hardcoded API keys, URLs, or model names in committed files
- [ ] `ARCHITECTURE.md` updated if the filesystem changed
- [ ] `CODE_STYLES.md` consulted for any new patterns introduced

---

## Before Release

- [ ] Version bumped in `package.json` (semver: patch for fixes, minor for new features, major for breaking changes)
- [ ] `CHANGELOG.md` entry written
- [ ] All packages in the monorepo that depend on the changed package have their peer dependency ranges updated
- [ ] `pnpm publish --dry-run` succeeds for each changed package
- [ ] Example apps (`examples/`) updated to use the new API surface
