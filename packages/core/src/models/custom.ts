import type { ModelAdapter } from "../types"
import { BaseModelAdapter } from "./index"
import { ModelError } from "../errors"

export class CustomAdapter extends BaseModelAdapter {
  constructor(
    private baseUrl: string,
    private apiKey: string,
    private model: string,
  ) {
    super()
  }

  async generate(
    messages: { role: string; content: string }[],
    options: { maxTokens?: number; temperature?: number } = {}
  ): Promise<{ content: string; usage: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
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
        throw new ModelError(this.baseUrl, text)
      }

      const data = (await response.json()) as {
        choices: { message: { content: string } }[]
        usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
      }

      return {
        content: data.choices[0].message.content,
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        },
      }
    } catch (err) {
      if (err instanceof ModelError) throw err
      throw new ModelError(this.baseUrl, err)
    }
  }

  async *stream(
    messages: { role: string; content: string }[],
    options: { maxTokens?: number; temperature?: number } = {}
  ): AsyncIterable<{ delta: string; done: boolean }> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
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
      throw new ModelError(this.baseUrl, text)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new ModelError(this.baseUrl, "Empty response body")
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
          if (jsonStr.trim() === "[DONE]") {
            yield { delta: "", done: true }
            return
          }
          const parsed = JSON.parse(jsonStr)
          if (parsed.choices?.[0]?.delta?.content) {
            yield { delta: parsed.choices[0].delta.content, done: false }
          }
        }
      }
    }
  }

  bindTools(_tools: { name: string; description: string; schema: unknown }[]): ModelAdapter {
    return this
  }
}