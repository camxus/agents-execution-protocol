# Agents Execution Protocol

A TypeScript agent framework for building LLM-powered applications. Provides a unified protocol for agent execution across Express, Next.js, and React runtimes.

## Packages

| Package | Description |
|---------|-------------|
| `@agents/core` | Agent execution engine, tools, planning, and state machine |
| `@agents/express` | Express router adapter for agent endpoints |
| `@agents/next` | Next.js App Router and Server Actions adapter |
| `@agents/react` | React hooks for agent integration |

## Quick Start

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Type check
pnpm typecheck

# Lint
pnpm lint
```

## Installation

```bash
# Install all packages
pnpm add @agents/core @agents/express @agents/react @agents/next
```

## Core Concepts

### Agent

Create an agent with `createAgent(config)`:

```ts
import { createAgent, createTool } from "@agents/core";
import { createModel } from "@agents/core/models";
import { z } from "zod";

const agent = createAgent({
  model: createModel("anthropic:claude-3-opus"),
  tools: [
    createTool({
      name: "search",
      description: "Search the web",
      schema: z.object({ query: z.string() }),
      execute: async ({ query }, ctx) => { /* ... */ }
    })
  ],
  intents: [
    {
      name: "chat",
      description: "General conversation",
      tools: ["search"]
    }
  ]
});
```

### Tool

Tools wrap a Zod schema and async execute function. The `createTool` helper validates args and provides a clean interface:

```ts
import { createTool } from "@agents/core";
import { z } from "zod";

export const weatherTool = createTool({
  name: "getWeather",
  description: "Get current weather",
  schema: z.object({ location: z.string() }),
  execute: async ({ location }, ctx) => {
    return fetchWeather(location);
  }
});
```

### Intent

Intents define routing targets for the planner. Each intent maps to available tools:

```ts
import { createAgent } from "@agents/core";

const agent = createAgent({
  intents: [
    {
      name: "bookFlight",
      description: "Search and book flights",
      tools: ["searchFlights", "bookFlight"],
      fields: ["destination", "dates", "passengers"]
    }
  ]
});
```

### Middleware

Middleware intercepts agent events for cross-cutting concerns like summarization and approvals:

```ts
import { createAgent } from "@agents/core";
import { summarizationMiddleware, humanInTheLoopMiddleware } from "@agents/core/middleware";

const agent = createAgent({ /* ... */ });

agent.use(
  summarizationMiddleware({
    model: createModel("anthropic:claude-3-haiku"),
    trigger: { tokens: 4000 }
  }),
  humanInTheLoopMiddleware({
    interruptOn: {
      delete_record: { allowedDecisions: ["approve", "reject"] }
    }
  })
);
```

Each middleware receives `(event, next)` and can inspect/modify events before calling `next()`.

## Usage

### Express

```ts
import { expressAgent } from "@agents/express";
import express from "express";

const app = express();
const router = expressAgent(agent);
app.use("/api/agent", router);

// Routes:
// POST /api/agent/chat    - Single-turn response
// POST /api/agent/stream  - SSE stream of events
// GET  /api/agent/tools   - List available tools
```

### Next.js

```ts
// app/api/agent/route.ts
import { nextAgent } from "@agents/next";

export const { POST } = nextAgent(agent);
```

Or use streaming:

```ts
import { nextStreamAgent } from "@agents/next";

export const { POST } = nextStreamAgent(agent);
```

### React

```tsx
import { AgentProvider } from "@agents/react";

function App() {
  return (
    <AgentProvider agent={agent}>
      <MyComponent />
    </AgentProvider>
  );
}
```

Use the `useAgent()` hook to access agent state:

```tsx
import { useAgent } from "@agents/react";

function ChatComponent() {
  const { status, messages, send, clear } = useAgent();
  
  return (
    <div>
      <p>Status: {status}</p>
      <button onClick={() => send("Hello!")}>Send</button>
    </div>
  );
}
```

Or use `useChat()` for a simplified interface.

### Model Adapters

```ts
import { createModel } from "@agents/core/models";

// Named provider
const model = createModel("anthropic:claude-3-opus");
const model = createModel("openai:gpt-4o");
const model = createModel("gemini:gemini-pro");

// Custom endpoint
const model = createModel({
  baseUrl: "https://my-llm.internal/v1",
  apiKey: process.env.LLM_KEY,
  model: "my-model-name",
});
```

## Development

```bash
pnpm typecheck  # Type check all packages
pnpm lint       # Lint all packages
pnpm test       # Run all tests
```

## Architecture

```
User Message
     │
     ▼
Transport Layer    (@agents/express · @agents/next)
     │
     ▼
Agent Core         (@agents/core)
├─ Intent Router
├─ Planning Engine
├─ Tool Executor
├─ State Machine
└─ Stream Emitter
     │
     ▼
Model Adapter      (Anthropic · OpenAI · custom endpoint)
     │
     ▼
React Client       (@agents/react)
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed documentation.

## Publishing

The `Publish and Tag` workflow publishes all packages to npm and creates a git tag.

Trigger manually from GitHub Actions with a version input (e.g., `0.2.0`):

```bash
gh workflow run publish.yml -f version=0.2.0
```

Requires `NPM_TOKEN` secret to be configured in the repository settings.

## License

MIT