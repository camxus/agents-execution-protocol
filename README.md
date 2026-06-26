# Agents Execution Protocol

A TypeScript agent framework for building LLM-powered applications. Provides a unified protocol for agent execution across Express, Next.js, and React runtimes.

## Packages

| Package | Description |
|---------|-------------|
| `@agents/core` | Agent execution engine, tools, planning, and state machine |
| `@agents/express` | Express router adapter for agent endpoints |
| `@agents/next` | Next.js App Router and Server Actions adapter |
| `@agents/react` | React hooks and components for agent UI |

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
import { createAgent, createModel, textTool, z } from "@agents/core";

const agent = createAgent({
  model: createModel("anthropic:claude-3-opus"),
  tools: {
    search: textTool({
      description: "Search the web",
      parameters: z.object({ query: z.string() }),
      execute: async ({ query }) => { /* ... */ }
    })
  },
  intents: {
    chat: {
      description: "General conversation",
      tools: ["search"]
    }
  }
});
```

### Tool

Tools wrap a Zod schema and async execute function:

```ts
import { z } from "zod";

const weatherTool = {
  name: "getWeather",
  description: "Get current weather",
  schema: z.object({ location: z.string() }),
  execute: async ({ location }) => fetchWeather(location)
};
```

### Intent

Intents are named routing targets with descriptions for the planner:

```ts
agent.intent("bookFlight", {
  description: "Search and book flights",
  tools: ["searchFlights", "bookFlight"],
  fields: ["destination", "dates", "passengers"]
});
```

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

### React

```tsx
import { AgentProvider, FloatingChat } from "@agents/react";

function App() {
  return (
    <AgentProvider endpoint="/api/agent/stream">
      <FloatingChat hotkey="cmd+k" />
    </AgentProvider>
  );
}
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