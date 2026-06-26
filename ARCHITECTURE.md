# Architecture

## Overview

Three complementary packages that share a common agent protocol. The core execution loop lives in `@agents/core`; the three published packages are thin adapters over it.

```
User Message
     │
     ▼
 Transport Layer          (@agents/express · @agents/next)
     │
     ▼
 Agent Core               (@agents/core)
  ├─ Intent Router
  ├─ Planning Engine
  ├─ Tool Executor
  ├─ State Machine
  └─ Stream Emitter
     │
     ▼
 Model Adapter            (Anthropic · OpenAI · custom endpoint)
     │
     ▼
 React Client             (@agents/react)
  ├─ AgentProvider
  ├─ Hooks
  └─ UI Components
```

---

## Monorepo Layout

```
agents/
├─ packages/
│   ├─ core/                    # @agents/core
│   │   ├─ src/
│   │   │   ├─ agent.ts         # createAgent() factory
│   │   │   ├─ tool.ts          # Tool class + registry
│   │   │   ├─ intent.ts        # Intent registration
│   │   │   ├─ planner.ts       # Planning engine
│   │   │   ├─ executor.ts      # Tool execution loop
│   │   │   ├─ state.ts         # State machine (idle → thinking → executing → done)
│   │   │   ├─ stream.ts        # SSE stream helpers
│   │   │   ├─ models/
│   │   │   │   ├─ index.ts     # createModel() + ModelAdapter interface
│   │   │   │   ├─ anthropic.ts # claude-* adapter
│   │   │   │   ├─ openai.ts    # gpt-* adapter
│   │   │   │   └─ custom.ts    # { baseUrl, apiKey, model } adapter
│   │   │   ├─ middleware/
│   │   │   │   ├─ index.ts
│   │   │   │   ├─ summarization.ts
│   │   │   │   └─ human-in-the-loop.ts
│   │   │   └─ types.ts         # Shared types + Zod schemas
│   │   ├─ package.json
│   │   └─ tsconfig.json
│   │
│   ├─ express-agents/          # @agents/express
│   │   ├─ src/
│   │   │   ├─ index.ts         # expressAgent() export
│   │   │   ├─ router.ts        # Mounts /chat, /stream, /tools routes
│   │   │   ├─ middleware.ts    # Auth, CORS, error handling
│   │   │   └─ sse.ts           # Express SSE response helpers
│   │   ├─ package.json
│   │   └─ tsconfig.json
│   │
│   ├─ next-agents/             # @agents/next
│   │   ├─ src/
│   │   │   ├─ index.ts         # nextAgent() export
│   │   │   ├─ route-handler.ts # App Router POST handler
│   │   │   ├─ server-action.ts # Server Actions wrapper
│   │   │   └─ edge.ts          # Edge runtime variant
│   │   ├─ package.json
│   │   └─ tsconfig.json
│   │
│   └─ react-agents/            # @agents/react
│       ├─ src/
│       │   ├─ index.ts
│       │   ├─ provider/
│       │   │   ├─ AgentProvider.tsx    # Context + SSE connection
│       │   │   └─ AgentContext.ts      # Typed context
│       │   ├─ hooks/
│       │   │   ├─ useAgent.ts          # Core agent state
│       │   │   ├─ useChat.ts           # send(), messages, status
│       │   │   ├─ useMessages.ts       # Message list management
│       │   │   ├─ usePlanning.ts       # questions, answer(), submit()
│       │   │   ├─ useStreaming.ts       # Token stream
│       │   │   ├─ useToolState.ts      # Per-tool execution state
│       │   │   └─ useFloatingChat.ts   # open, close, toggle
│       │   └─ components/
│       │       ├─ FloatingChat.tsx
│       │       ├─ ChatSidebar.tsx
│       │       ├─ ChatDialog.tsx
│       │       ├─ MessageList.tsx
│       │       ├─ Composer.tsx
│       │       └─ PlanningPopover.tsx
│       ├─ package.json
│       └─ tsconfig.json
│
├─ examples/
│   ├─ express-api/             # Minimal Express example
│   │   ├─ src/
│   │   │   ├─ agent.ts
│   │   │   ├─ tools.ts
│   │   │   └─ index.ts
│   │   └─ package.json
│   │
│   └─ next-crm/               # Full Next.js + React example
│       ├─ app/
│       │   ├─ api/agent/route.ts
│       │   └─ page.tsx
│       ├─ src/
│       │   ├─ agent.ts
│       │   └─ tools.ts
│       └─ package.json
│
├─ package.json                 # Workspace root (pnpm)
├─ pnpm-workspace.yaml
├─ turbo.json
└─ tsconfig.base.json
```

---

## Package Responsibilities

### `@agents/core`

The only package with business logic. All other packages import from here and add no logic of their own beyond I/O adaption.

**`createAgent(config)`** — returns an `Agent` instance with `.chat()`, `.tool()`, `.intent()`, `.use()`, `.on()`.

**`Tool`** — wraps a Zod schema + async execute function. Registered into a `ToolRegistry` at agent creation time.

**`Intent`** — named routing target with a description (used by the planner), an optional field list, a tool subset, and an optional system prompt override.

**`Planner`** — takes conversation history + intent list → returns `PlanResult`: `{ intent, confidence, missingFields, toolCalls, requiresApproval, response }`.

**`Executor`** — runs the planner in a loop until state reaches `finished` or `error`. Emits SSE events at each state transition.

**`ModelAdapter`** — interface that all model adapters implement: `generate()`, `stream()`, `bindTools()`. Concrete adapters: `AnthropicAdapter`, `OpenAIAdapter`, `CustomAdapter`.

**`StateMachine`** — enum states: `idle | thinking | planning | clarifying | waiting | executing | streaming | finished | error`. Guards prevent invalid transitions.

---

### `@agents/express`

```
expressAgent(agent, options?) → Router
```

Mounts three routes on the returned Express `Router`:

| Route | Method | Purpose |
|-------|--------|---------|
| `/chat` | POST | Single-turn JSON request/response |
| `/stream` | POST | SSE stream of agent events |
| `/tools` | GET | Lists registered tools (name, description, schema) |

The caller mounts the router wherever they like: `app.use('/api/agent', expressAgent(agent))`.

---

### `@agents/next`

```
nextAgent(agent, options?) → { POST: Handler }
```

Returns a Next.js App Router route handler object. Streams via the Web Streams API (`ReadableStream`) so it works on both Node and Edge runtimes.

A separate `serverAction(agent)` wrapper turns any intent call into a Next.js Server Action for use without a dedicated API route.

---

### `@agents/react`

**`AgentProvider`** — opens an SSE connection to the configured endpoint. Distributes agent state via context.

**`useChat()`** — primary hook. Returns `{ send, messages, status, clear }`.

**`usePlanning()`** — returns `{ questions, answer, skip, submit, loading }`. The `PlanningPopover` component consumes this hook directly; apps can also drive it manually.

**`useStreaming()`** — returns the raw token stream for custom rendering.

**`FloatingChat`** — zero-config entry point. Accepts `hotkey` prop (`"cmd+k"`, `"ctrl+space"`, etc.). Renders `ChatDialog` on trigger.

---

## Data Flow: Single Turn

```
1. User types in <Composer>
2. useChat().send(text) called
3. AgentProvider POST /stream with { message, history }
4. express-agents / next-agents passes to Agent.chat()
5. Agent.chat() → Planner.plan()
6. Planner calls model with intent list + history
7. PlanResult returned
8. If missingFields → emit planning:question event → SSE to client
9. usePlanning() surfaces questions → PlanningPopover renders
10. User answers → send() called again with answers
11. Executor picks up → runs tool calls in sequence
12. Each tool emits tool:start / tool:success / tool:error over SSE
13. Final response emitted as streaming tokens (type: "token")
14. State → finished → useChat().status = "idle"
```

---

## Model Adapter Interface

```ts
interface ModelAdapter {
  generate(messages: Message[], options: GenerateOptions): Promise<ModelResponse>
  stream(messages: Message[], options: GenerateOptions): AsyncIterable<StreamChunk>
  bindTools(tools: Tool[]): ModelAdapter
}
```

`createModel(spec)` accepts:

```ts
// Named provider
createModel("anthropic:claude-opus-4-6")
createModel("openai:gpt-4o")

// Custom endpoint
createModel({
  baseUrl: "https://my-llm.internal/v1",
  apiKey: process.env.LLM_KEY,
  model: "my-model-name",
})
```

---

## SSE Event Schema

All SSE events are JSON with a `type` discriminant.

```ts
type AgentEvent =
  | { type: "planning:start" }
  | { type: "planning:question"; question: PlanningQuestion }
  | { type: "tool:start"; tool: string; args: unknown }
  | { type: "tool:success"; tool: string; result: unknown }
  | { type: "tool:error"; tool: string; error: string }
  | { type: "approval:required"; action: string; payload: unknown }
  | { type: "token"; delta: string }
  | { type: "done"; usage: TokenUsage }
  | { type: "error"; message: string }
```

---

## Middleware

Middleware wraps the `Executor` and intercepts events before they reach the model.

```ts
agent.use(
  summarizationMiddleware({
    model: "anthropic:claude-haiku-4-5",
    trigger: { tokens: 4000 },
  }),
  humanInTheLoopMiddleware({
    interruptOn: { delete_record: { allowedDecisions: ["approve", "reject"] } },
  })
)
```

Each middleware is a function `(event, next) => Promise<void>`, matching the Express middleware signature by design.

---

## Dependency Graph

```
@agents/react
     └─ @agents/core

@agents/express
     └─ @agents/core

@agents/next
     └─ @agents/core

examples/*
     └─ @agents/express | @agents/next | @agents/react
```

`@agents/core` has no dependency on any framework. It imports only `zod` and the chosen model SDK (tree-shaken at build time).

---

## Build

```
pnpm -r build          # Build all packages in dependency order (Turbo)
pnpm -r test           # Run vitest across all packages
pnpm -r typecheck      # tsc --noEmit across all packages
```

Each package compiles to `dist/` with separate `esm/` and `cjs/` outputs and a `.d.ts` declaration bundle.
