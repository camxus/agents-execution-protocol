import type { MiddlewareFunction } from "./index"

export interface SummarizationMiddlewareOptions {
  model: string
  trigger: { tokens?: number; messages?: number }
}

export function summarizationMiddleware(_options: SummarizationMiddlewareOptions): MiddlewareFunction {
  return async (event, next) => {
    if (event.type === "planning:start") {
      await next()
    } else {
      await next()
    }
  }
}