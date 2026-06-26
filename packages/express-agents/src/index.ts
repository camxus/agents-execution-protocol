import express from "express"
import type { AgentInterface } from "agents-core"
import type { Request, Response, NextFunction } from "express"
import type { Router } from "express"

export function expressAgent(agent: AgentInterface) {
  return {
    chat: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { message } = req.body as { message: string }
        const events = await agent.chat(message)
        res.json({ events })
      } catch (err) {
        next(err)
      }
    },

    stream: async (req: Request, res: Response) => {
      const { message } = req.body as { message: string }

      res.setHeader("Content-Type", "text/event-stream")
      res.setHeader("Cache-Control", "no-cache")
      res.setHeader("Connection", "keep-alive")

      try {
        const events = await agent.chat(message)
        for (const event of events) {
          res.write(`data: ${JSON.stringify(event)}\n\n`)
        }
        res.write("data: [DONE]\n\n")
      } catch (err) {
        res.write(`data: ${JSON.stringify({ type: "error", message: String(err) })}\n\n`)
      } finally {
        res.end()
      }
    },

    tools: async (_req: Request, res: Response) => {
      res.json({ tools: [] })
    },
  }
}

export function createExpressRouter(agent: AgentInterface): Router {
  const router = express.Router()
  const endpoints = expressAgent(agent)

  router.post("/chat", endpoints.chat)
  router.post("/stream", endpoints.stream)
  router.get("/tools", endpoints.tools)

  return router
}
