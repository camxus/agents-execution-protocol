import type { AgentInterface } from "agents-core"

export function nextAgent(agent: AgentInterface) {
  return {
    POST: async (req: globalThis.Request) => {
      const body = await req.json() as { message: string }
      const events = await agent.chat(body.message)
      return new Response(JSON.stringify({ events }), {
        headers: { "Content-Type": "application/json" },
      })
    },
  }
}

export function nextStreamAgent(agent: AgentInterface) {
  return {
    POST: async (req: globalThis.Request) => {
      const body = await req.json() as { message: string }
      const events = await agent.chat(body.message)

      const stream = new ReadableStream({
        async start(controller) {
          for (const event of events) {
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`))
          }
          controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"))
          controller.close()
        },
      })

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      })
    },
  }
}

export function serverAction(agent: AgentInterface) {
  return async (message: string) => {
    const events = await agent.chat(message)
    return events
  }
}
