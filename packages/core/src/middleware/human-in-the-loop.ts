import type { MiddlewareFunction } from "./index"

export interface HumanInTheLoopMiddlewareOptions {
  interruptOn: Record<string, { allowedDecisions: string[] }>
}

export function humanInTheLoopMiddleware(options: HumanInTheLoopMiddlewareOptions): MiddlewareFunction {
  return async (event, next) => {
    if (event.type === "tool:start" && options.interruptOn[event.tool]) {
      await next()
    } else {
      await next()
    }
  }
}