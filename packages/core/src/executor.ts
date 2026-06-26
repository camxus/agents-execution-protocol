import type { Message, PlanResult, ToolContext, ToolInterface } from "./types"
import { PlanningError } from "./errors"
import { StateMachine } from "./state"
import { Planner } from "./planner"

function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export class Executor {
  private middlewares: Array<(event: import("./types").AgentEvent, next: () => Promise<void>) => Promise<void>> = []
  private toolRegistry: { get(name: string): ToolInterface | undefined; execute(name: string, args: unknown, ctx: ToolContext): Promise<unknown> }

  constructor(
    private planner: Planner,
    toolRegistry: { get(name: string): ToolInterface | undefined; execute(name: string, args: unknown, ctx: ToolContext): Promise<unknown> },
    private stateMachine: StateMachine,
  ) {
    this.toolRegistry = toolRegistry
  }

  use(middleware: (event: import("./types").AgentEvent, next: () => Promise<void>) => Promise<void>): void {
    this.middlewares.push(middleware)
  }

  async execute(userMessage: string, emit: (event: import("./types").AgentEvent) => void): Promise<import("./types").AgentEvent[]> {
    const events: import("./types").AgentEvent[] = []

    const messages: Message[] = [
      {
        id: uuid(),
        role: "user" as const,
        content: userMessage,
        timestamp: Date.now(),
      },
    ]

    this.stateMachine.transition("thinking")

    const planStart: import("./types").AgentEvent = { type: "planning:start" }
    events.push(planStart)
    emit(planStart)

    let planResult: PlanResult
    try {
      planResult = await this.planner.plan(messages)
    } catch (err) {
      throw new PlanningError(err)
    }

    if (planResult.missingFields && planResult.missingFields.length > 0) {
      const questionEvent: import("./types").AgentEvent = {
        type: "planning:question",
        question: {
          id: uuid(),
          type: "text",
          label: planResult.missingFields[0],
          required: true,
        },
      }
      events.push(questionEvent)
      emit(questionEvent)
      return events
    }

    if (planResult.response) {
      const tokenEvent: import("./types").AgentEvent = { type: "token", delta: planResult.response }
      events.push(tokenEvent)
      emit(tokenEvent)
    } else if (planResult.toolCalls.length > 0) {
      this.stateMachine.transition("executing")

      for (const toolCall of planResult.toolCalls) {
        const startEvent: import("./types").AgentEvent = { type: "tool:start", tool: toolCall.tool, args: toolCall.args }
        events.push(startEvent)
        emit(startEvent)

        const ctx: ToolContext = {
          agent: {} as any,
          intent: planResult.intent,
          messages,
        }

        try {
          const result = await this.toolRegistry.execute(toolCall.tool, toolCall.args, ctx)
          const successEvent: import("./types").AgentEvent = { type: "tool:success", tool: toolCall.tool, result }
          events.push(successEvent)
          emit(successEvent)
        } catch (err) {
          const errorEvent: import("./types").AgentEvent = { type: "tool:error", tool: toolCall.tool, error: String(err) }
          events.push(errorEvent)
          emit(errorEvent)
        }
      }
    }

    if (!planResult.response && planResult.toolCalls.length === 0) {
      this.stateMachine.transition("streaming")
      const response = await (this.planner as any).model.generate([
        { role: "user", content: userMessage },
      ])
      const tokenEvent: import("./types").AgentEvent = { type: "token", delta: response.content }
      events.push(tokenEvent)
      emit(tokenEvent)
    }

    this.stateMachine.transition("finished")
    const doneEvent: import("./types").AgentEvent = { type: "done", usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } }
    events.push(doneEvent)
    emit(doneEvent)

    return events
  }
}
