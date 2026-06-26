import type { ModelAdapter } from "../types"
import { BaseModelAdapter } from "./index"
import { ModelError } from "../errors"

export class GeminiAdapter extends BaseModelAdapter {
  constructor(private model: string) {
    super()
  }

  private buildUrl(stream = false): string {
    const modelName = this.model.includes("/") ? this.model : `models/${this.model}`
    const base = "https://generativelanguage.googleapis.com/v1beta/models"
    const action = stream ? "streamGenerateContent?alt=sse" : "generateContent"
    return `${base}/${modelName}:${action}`
  }

  async generate(
    messages: { role: string; content: string }[],
    options: { maxTokens?: number; temperature?: number } = {}
  ): Promise<{ content: string; usage: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
    try {
      const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? ""
      const response = await fetch(`${this.buildUrl(false)}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(this.toGeminiBody(messages, options)),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new ModelError("gemini", text)
      }

      const data = (await response.json()) as {
        candidates: { content: { parts: { text: string }[] } }[]
        usageMetadata: { promptTokenCount: number; candidatesTokenCount: number; totalTokenCount: number }
      }

      return {
        content: data.candidates[0]?.content?.parts[0]?.text ?? "",
        usage: {
          promptTokens: data.usageMetadata?.promptTokenCount ?? 0,
          completionTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
          totalTokens: data.usageMetadata?.totalTokenCount ?? 0,
        },
      }
    } catch (err) {
      if (err instanceof ModelError) throw err
      throw new ModelError("gemini", err)
    }
  }

  async *stream(
    messages: { role: string; content: string }[],
    options: { maxTokens?: number; temperature?: number } = {}
  ): AsyncIterable<{ delta: string; done: boolean }> {
    const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? ""
    const response = await fetch(`${this.buildUrl(true)}&key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(this.toGeminiBody(messages, options)),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new ModelError("gemini", text)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new ModelError("gemini", "Empty response body")
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
          try {
            const parsed = JSON.parse(line.slice(6))
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text
            if (text) {
              yield { delta: text, done: false }
            }
          } catch {
            // skip malformed JSON
          }
        }
      }
    }

    yield { delta: "", done: true }
  }

  bindTools(_tools: { name: string; description: string; schema: unknown }[]): ModelAdapter {
    return this
  }

  private toGeminiBody(
    messages: { role: string; content: string }[],
    options: { maxTokens?: number; temperature?: number }
  ): Record<string, unknown> {
    const systemInstruction = messages.find((m) => m.role === "system")
    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }))

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        maxOutputTokens: options.maxTokens ?? 1024,
        temperature: options.temperature ?? 0.7,
      },
    }

    if (systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: systemInstruction.content }],
      }
    }

    return body
  }
}
