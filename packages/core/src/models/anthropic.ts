import type { ModelAdapter } from "../types"
import { BaseModelAdapter } from "./index"
import { ModelError } from "../errors"

export class AnthropicAdapter extends BaseModelAdapter {
  constructor(private model: string) {
    super()
  }

  async generate(
    messages: { role: string; content: string }[],
    options: { maxTokens?: number; temperature?: number } = {}
  ): Promise<{ content: string; usage: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: options.maxTokens ?? 1024,
          temperature: options.temperature ?? 0.7,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new ModelError("anthropic", text)
      }

      const data = (await response.json()) as {
        content: { text: string }[]
        usage: { input_tokens: number; output_tokens: number }
      }

      return {
        content: data.content[0].text,
        usage: {
          promptTokens: data.usage.input_tokens,
          completionTokens: data.usage.output_tokens,
          totalTokens: data.usage.input_tokens + data.usage.output_tokens,
        },
      }
    } catch (err) {
      if (err instanceof ModelError) throw err
      throw new ModelError("anthropic", err)
    }
  }

  async *stream(
    messages: { role: string; content: string }[],
    options: { maxTokens?: number; temperature?: number } = {}
  ): AsyncIterable<{ delta: string; done: boolean }> {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: options.maxTokens ?? 1024,
        temperature: options.temperature ?? 0.7,
        stream: true,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new ModelError("anthropic", text)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new ModelError("anthropic", "Empty response body")
    }

    const decoder = new TextDecoder()
    let buffer = ""

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const jsonStr = line.slice(6)
          const parsed = JSON.parse(jsonStr)
          if (parsed.type === "content_block_delta") {
            yield { delta: parsed.delta.text ?? "", done: false }
          }
          if (parsed.type === "message_stop") {
            yield { delta: "", done: true }
          }
        }
      }
    }
  }

  bindTools(_tools: { name: string; description: string; schema: unknown }[]): ModelAdapter {
    return this
  }
}