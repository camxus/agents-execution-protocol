import { z } from "zod"

export const MessageRoleSchema = z.enum(["user", "assistant", "system"])
export type MessageRole = z.infer<typeof MessageRoleSchema>

export const MessageSchema = z.object({
  id: z.string().uuid(),
  role: MessageRoleSchema,
  content: z.string(),
  timestamp: z.number().int().positive(),
})
export type Message = z.infer<typeof MessageSchema>

export const ToolCallSchema = z.object({
  id: z.string().uuid(),
  tool: z.string(),
  args: z.record(z.string(), z.unknown()),
})
export type ToolCall = z.infer<typeof ToolCallSchema>

export const PlanningQuestionSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["text", "select", "multiselect", "date", "number", "toggle"]),
  label: z.string(),
  description: z.string().optional(),
  options: z.array(z.string()).optional(),
  required: z.boolean().default(true),
  value: z.unknown().optional(),
})
export type PlanningQuestion = z.infer<typeof PlanningQuestionSchema>

export const IntentSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9_]*$/),
  description: z.string(),
  fields: z.array(z.string()).optional(),
  tools: z.array(z.string()).optional(),
  requiresApproval: z.boolean().default(false),
  systemPrompt: z.string().optional(),
})
export type Intent = z.infer<typeof IntentSchema>

export const AgentStatusSchema = z.discriminatedUnion("state", [
  z.object({ state: z.literal("idle") }),
  z.object({ state: z.literal("thinking") }),
  z.object({ state: z.literal("planning") }),
  z.object({ state: z.literal("clarifying") }),
  z.object({ state: z.literal("waiting") }),
  z.object({ state: z.literal("executing"), toolName: z.string() }),
  z.object({ state: z.literal("streaming") }),
  z.object({ state: z.literal("finished") }),
  z.object({ state: z.literal("error"), message: z.string() }),
])
export type AgentStatus = z.infer<typeof AgentStatusSchema>

export const AgentEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("planning:start") }),
  z.object({ type: z.literal("planning:question"), question: PlanningQuestionSchema }),
  z.object({ type: z.literal("tool:start"), tool: z.string(), args: z.record(z.string(), z.unknown()) }),
  z.object({ type: z.literal("tool:success"), tool: z.string(), result: z.unknown() }),
  z.object({ type: z.literal("tool:error"), tool: z.string(), error: z.string() }),
  z.object({ type: z.literal("approval:required"), action: z.string(), payload: z.unknown() }),
  z.object({ type: z.literal("token"), delta: z.string() }),
  z.object({ type: z.literal("done"), usage: z.object({ promptTokens: z.number().int().nonnegative(), completionTokens: z.number().int().nonnegative(), totalTokens: z.number().int().nonnegative() }) }),
  z.object({ type: z.literal("error"), message: z.string() }),
])
export type AgentEvent = z.infer<typeof AgentEventSchema>

export const PlanResultSchema = z.object({
  intent: z.string().optional(),
  confidence: z.number().min(0).max(1),
  missingFields: z.array(z.string()).optional(),
  toolCalls: z.array(ToolCallSchema),
  requiresApproval: z.boolean().default(false),
  response: z.string().optional(),
})
export type PlanResult = z.infer<typeof PlanResultSchema>

export interface ModelAdapter {
  generate(messages: { role: string; content: string }[], options?: { maxTokens?: number; temperature?: number }): Promise<{ content: string; usage: { promptTokens: number; completionTokens: number; totalTokens: number } }>
  stream(messages: { role: string; content: string }[], options?: { maxTokens?: number; temperature?: number }): AsyncIterable<{ delta: string; done: boolean }>
  bindTools(tools: { name: string; description: string; schema: unknown }[]): ModelAdapter
}

export interface AgentConfig {
  model: ModelAdapter
  intents?: Intent[]
  tools?: ToolInterface[]
  middleware?: MiddlewareFunction[]
  maxPlanIterations?: number
}

export interface ToolInterface {
  name: string
  description: string
  schema: ReturnType<typeof z.object>
  execute(args: unknown, ctx: ToolContext): Promise<unknown>
}

export interface ToolContext {
  agent: AgentInterface
  intent?: string
  messages: Message[]
}

export interface MiddlewareFunction {
  (event: AgentEvent, next: () => Promise<void>): Promise<void>
}

export interface AgentInterface {
  chat(message: string): Promise<AgentEvent[]>
  send(message: string): Promise<AgentEvent[]>
  tool(tool: ToolInterface): void
  intent(intent: Intent): void
  use(middleware: MiddlewareFunction): void
  on(event: string, handler: (payload: unknown) => void): void
}