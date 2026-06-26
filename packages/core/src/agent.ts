import type { AgentConfig, AgentEvent, MiddlewareFunction, ToolInterface } from "./types"
import { ToolRegistry } from "./tool"
import { IntentRegistry } from "./intent"
import { Planner } from "./planner"
import { Executor } from "./executor"
import { StateMachine } from "./state"

export function createAgent(config: AgentConfig) {
  const toolRegistry = new ToolRegistry()
  const intentRegistry = new IntentRegistry()
  const stateMachine = new StateMachine()

  for (const tool of config.tools ?? []) {
    toolRegistry.register(tool)
  }
  for (const intent of config.intents ?? []) {
    intentRegistry.register(intent)
  }

  const planner = new Planner(config.model, intentRegistry.list())
  const executor = new Executor(planner, toolRegistry, stateMachine)

  for (const middleware of config.middleware ?? []) {
    executor.use(middleware)
  }

  const listeners: Record<string, Array<(payload: unknown) => void>> = {}

  const emit = (event: AgentEvent) => {
    const handlers = listeners[event.type] ?? []
    for (const handler of handlers) {
      handler(event)
    }
  }

  return {
    chat(message: string): Promise<AgentEvent[]> {
      return executor.execute(message, emit)
    },

    send(message: string): Promise<AgentEvent[]> {
      return this.chat(message)
    },

    tool(tool: ToolInterface): void {
      toolRegistry.register(tool)
    },

    intent(intent: { name: string; description: string; fields?: string[]; tools?: string[]; requiresApproval?: boolean; systemPrompt?: string }): void {
      intentRegistry.register({
        name: intent.name,
        description: intent.description,
        fields: intent.fields,
        tools: intent.tools,
        requiresApproval: intent.requiresApproval ?? false,
        systemPrompt: intent.systemPrompt,
      })
    },

    use(middleware: MiddlewareFunction): void {
      executor.use(middleware)
    },

    on(event: string, handler: (payload: unknown) => void): void {
      if (!listeners[event]) {
        listeners[event] = []
      }
      listeners[event].push(handler)
    },
  }
}
