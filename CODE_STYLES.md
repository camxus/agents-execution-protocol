# Code Style

## Language & Tooling

- TypeScript everywhere. No `.js` source files.
- `strict: true` in every `tsconfig.json`. No `// @ts-ignore` without a comment explaining why.
- ESLint with `@typescript-eslint/recommended`. Prettier for formatting (config at root).
- Vitest for tests. No Jest.
- `pnpm` for package management. No `npm install` or `yarn` in any package.

---

## Naming

| Thing | Convention | Example |
|-------|-----------|---------|
| Files | `kebab-case.ts` | `tool-registry.ts` |
| Classes | `PascalCase` | `ToolRegistry` |
| Interfaces | `PascalCase`, no `I` prefix | `ModelAdapter` |
| Type aliases | `PascalCase` | `PlanResult` |
| Functions | `camelCase` | `createAgent()` |
| Variables | `camelCase` | `toolRegistry` |
| Constants | `SCREAMING_SNAKE` only for module-level true constants | `DEFAULT_MAX_TOKENS` |
| React components | `PascalCase` | `FloatingChat` |
| React hooks | `use` prefix + `PascalCase` | `useChat` |
| Tool names | `snake_case` strings | `"search_contacts"` |
| Intent names | `snake_case` strings | `"create_campaign"` |
| SSE event types | `noun:verb` strings | `"tool:start"` |
| Env variables | `SCREAMING_SNAKE` | `ANTHROPIC_API_KEY` |

---

## File Structure

Each source file owns one primary export. The file name matches that export.

```
tool-registry.ts       → export class ToolRegistry
use-chat.ts            → export function useChat
anthropic-adapter.ts   → export class AnthropicAdapter
```

`index.ts` files only re-export — no logic.

---

## TypeScript

### Prefer `type` over `interface` for public API shapes

```ts
// Good
export type PlanResult = {
  intent: string
  confidence: number
  missingFields: string[]
  toolCalls: ToolCall[]
  requiresApproval: boolean
  response: string | null
}

// Avoid for public shapes — interfaces can be accidentally extended
export interface PlanResult { ... }
```

Use `interface` only when declaration merging is intentional (plugin system, middleware registration).

### Discriminated unions over optional fields

```ts
// Good
type AgentStatus =
  | { state: "idle" }
  | { state: "thinking" }
  | { state: "executing"; toolName: string }
  | { state: "error"; message: string }

// Avoid
type AgentStatus = {
  state: "idle" | "thinking" | "executing" | "error"
  toolName?: string   // only meaningful in some states
  message?: string    // only meaningful in some states
}
```

### No `any`. Use `unknown` and narrow.

```ts
// Good
function parseEvent(raw: unknown): AgentEvent {
  if (!isObject(raw) || typeof raw.type !== "string") {
    throw new Error("Invalid event shape")
  }
  // narrow from here
}

// Bad
function parseEvent(raw: any): AgentEvent { ... }
```

### Explicit return types on all exported functions

```ts
// Good
export function createAgent(config: AgentConfig): Agent { ... }

// Bad — return type inferred, changes silently
export function createAgent(config: AgentConfig) { ... }
```

### Async errors

Always `await` and `try/catch`. Never `.catch(console.error)` in library code.

```ts
// Good
async function executeTool(tool: Tool, args: unknown): Promise<ToolResult> {
  try {
    return await tool.execute(args, ctx)
  } catch (err) {
    throw new ToolExecutionError(tool.name, err)
  }
}
```

---

## Zod

All schemas are defined alongside the type they describe. Export both.

```ts
export const PlanningQuestionSchema = z.object({
  id: z.string(),
  type: z.enum(["text", "select", "multiselect", "date", "number", "toggle"]),
  label: z.string(),
  description: z.string().optional(),
  options: z.array(z.string()).optional(),
  required: z.boolean().default(true),
  value: z.unknown().optional(),
})

export type PlanningQuestion = z.infer<typeof PlanningQuestionSchema>
```

Never call `.parse()` on untrusted input without wrapping in `try/catch`. Prefer `.safeParse()` at system boundaries (HTTP request bodies, SSE payloads).

---

## React

### Hooks

- One hook per file.
- Hooks return a plain object with named properties — never a tuple (except when mimicking `useState` intentionally).
- No business logic inside components. Components call hooks; hooks contain logic.

```ts
// Good
export function useChat() {
  const ctx = useAgentContext()
  const send = useCallback((text: string) => { ... }, [ctx])
  return { send, messages: ctx.messages, status: ctx.status, clear: ctx.clear }
}
```

### Components

- Props interfaces are defined in the same file, above the component.
- No default exports. Named exports only.
- `forwardRef` only when the ref is documented and intentional.

```tsx
export type FloatingChatProps = {
  hotkey?: string
  defaultOpen?: boolean
  className?: string
}

export function FloatingChat({ hotkey = "cmd+k", defaultOpen = false, className }: FloatingChatProps) {
  ...
}
```

### State

- Prefer `useReducer` over multiple `useState` calls when state has more than two fields that change together.
- Never mutate state directly. Always produce a new object/array.

---

## Express

Route handlers are thin. All logic lives in core.

```ts
// Good
router.post("/chat", async (req, res, next) => {
  try {
    const result = await agent.chat(req.body)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

// Bad — business logic in the route
router.post("/chat", async (req, res) => {
  const { message } = req.body
  const intent = await planner.plan(message)   // ← belongs in core
  ...
})
```

---

## Errors

Define typed error classes in `@agents/core`. All other packages import and re-throw them — never create new error classes in adapter packages.

```ts
export class ToolExecutionError extends Error {
  constructor(
    public readonly toolName: string,
    public readonly cause: unknown,
  ) {
    super(`Tool "${toolName}" failed`)
    this.name = "ToolExecutionError"
  }
}

export class ModelError extends Error {
  constructor(
    public readonly provider: string,
    public readonly cause: unknown,
  ) {
    super(`Model provider "${provider}" returned an error`)
    this.name = "ModelError"
  }
}

export class PlanningError extends Error { ... }
export class IntentNotFoundError extends Error { ... }
```

---

## SSE Events

Emit events with the helper from `@agents/core/stream`, not by writing raw `data:` strings.

```ts
// Good
import { emitEvent } from "@agents/core/stream"

emitEvent(res, { type: "tool:start", tool: "search_contacts", args })

// Bad
res.write(`data: ${JSON.stringify({ type: "tool:start", tool: "search_contacts", args })}\n\n`)
```

Always emit `{ type: "done" }` as the final event. Never close the SSE connection without it.

---

## Tests

### File location

Test files sit next to the source file they test.

```
src/
├─ planner.ts
├─ planner.test.ts
├─ tool-registry.ts
└─ tool-registry.test.ts
```

### Structure

```ts
import { describe, it, expect, vi } from "vitest"

describe("Planner", () => {
  describe("plan()", () => {
    it("returns the correct intent when message matches description", async () => {
      ...
    })

    it("returns missingFields when required fields are absent", async () => {
      ...
    })
  })
})
```

- One `describe` block per exported function or class.
- Test names complete the sentence "it ___".
- No shared mutable state between tests. Each `it` sets up its own fixtures.
- Mock external I/O (model calls, DB calls). Never mock the module under test.

### Assertions

```ts
// Good — specific
expect(result.intent).toBe("create_campaign")
expect(result.missingFields).toEqual(["schedule"])

// Bad — too broad
expect(result).toBeTruthy()
```

---

## Comments

Code comments explain *why*, not *what*. If the what needs explaining, rename the variable.

```ts
// Good
// The planner runs up to 5 iterations to allow tool results to influence the next plan.
// More than 5 suggests a loop; treat as an error.
const MAX_PLAN_ITERATIONS = 5

// Bad
// Set max iterations to 5
const MAX_PLAN_ITERATIONS = 5
```

JSDoc only on exported public API symbols. No JSDoc on internal helpers.

---

## Imports

Order (enforced by ESLint `import/order`):

1. Node built-ins (`node:fs`, `node:path`)
2. External packages (`zod`, `express`, `react`)
3. Internal workspace packages (`@agents/core`)
4. Relative imports (`./tool-registry`)

Blank line between each group. No default import aliases that differ from the export name.

```ts
import { readFileSync } from "node:fs"

import { z } from "zod"
import type { Request, Response } from "express"

import type { AgentConfig } from "@agents/core"

import { ToolRegistry } from "./tool-registry"
```

---

## Environment Variables

- All env var access goes through a single `env.ts` file per package that reads from `process.env` and throws at startup if a required variable is missing.
- Never read `process.env.FOO` inline inside business logic.

```ts
// packages/express-agents/src/env.ts
export const env = {
  port: Number(process.env.PORT ?? 3000),
  anthropicApiKey: required("ANTHROPIC_API_KEY"),
}

function required(key: string): string {
  const value = process.env[key]
  if (!value) throw new Error(`Missing required environment variable: ${key}`)
  return value
}
```
