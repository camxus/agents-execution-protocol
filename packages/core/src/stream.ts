import type { AgentEvent } from "./types"

export function serializeEvent(event: AgentEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}

export function serializeEventsArray(events: AgentEvent[]): string {
  return events.map(serializeEvent).join("") + "data: [DONE]\n\n"
}

export function createAsyncEventIterator(
  events: AgentEvent[],
): AsyncIterable<string> {
  return {
    [Symbol.asyncIterator]() {
      let index = 0
      return {
        async next(): Promise<IteratorResult<string>> {
          if (index < events.length) {
            return { done: false, value: serializeEvent(events[index++]) }
          }
          return { done: true, value: "" }
        },
      }
    },
  }
}