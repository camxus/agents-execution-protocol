export type MiddlewareFunction = (
  event: import("../types").AgentEvent,
  next: () => Promise<void>,
) => Promise<void>

export { summarizationMiddleware } from "./summarization"
export { humanInTheLoopMiddleware } from "./human-in-the-loop"