# Agents

A TypeScript agent framework with Express, Next.js, and React adapters.

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

# Publish (via GitHub Action)
# See .github/workflows/publish.yml
```

## Development

```bash
pnpm typecheck  # Type check all packages
pnpm lint       # Lint all packages
```

## Publishing

The `Publish and Tag` workflow publishes all packages to npm and creates a git tag. Trigger manually with a version input (e.g., `0.1.0`).

Requires `NPM_TOKEN` secret to be configured in the repository.

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed documentation.