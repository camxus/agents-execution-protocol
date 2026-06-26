import type { AgentInterface } from "agents-core"
import { useState, useEffect, useCallback, createContext, useContext } from "react"

export interface AgentProviderProps {
  agent: AgentInterface
  children: React.ReactNode
}

export interface AgentContextValue {
  status: string
  messages: unknown[]
  send: (message: string) => Promise<void>
  clear: () => void
}

export const AgentContext = createContext<AgentContextValue | null>(null)

export function useAgent() {
  const context = useContext(AgentContext)
  if (!context) {
    throw new Error("useAgent must be used within AgentProvider")
  }
  return context
}

export function AgentProvider({ agent, children }: AgentProviderProps) {
  const [status, setStatus] = useState("idle")
  const [messages, setMessages] = useState<unknown[]>([])

  const send = useCallback(async (message: string) => {
    setStatus("thinking")
    try {
      const events = await agent.chat(message)
      const newMessages = events.filter((e: any) => e.type === "token" || e.type === "tool:success")
      setMessages((prev) => [...prev, ...newMessages])
      setStatus("idle")
    } catch {
      setStatus("error")
    }
  }, [agent])

  const clear = useCallback(() => {
    setMessages([])
    setStatus("idle")
  }, [])

  useEffect(() => {
    agent.on("planning:start", () => setStatus("thinking"))
    agent.on("done", () => setStatus("idle"))
    agent.on("error", () => setStatus("error"))
  }, [agent])

  return (
    <AgentContext.Provider value={{ status, messages, send, clear }}>
      {children}
    </AgentContext.Provider>
  )
}

export function useChat() {
  const agent = useAgent()
  const send = useCallback(
    async (text: string) => {
      await agent.send(text)
    },
    [agent.send]
  )

  return {
    send,
    messages: agent.messages,
    status: agent.status,
    clear: agent.clear,
  }
}
