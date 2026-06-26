import type { ModelAdapter, AgentEvent } from "../types"
import { AnthropicAdapter } from "./anthropic"
import { OpenAIAdapter } from "./openai"
import { GeminiAdapter } from "./gemini"
import { CustomAdapter } from "./custom"

export function createModel(spec: string): ModelAdapter
export function createModel(spec: { baseUrl: string; apiKey: string; model: string }): ModelAdapter
export function createModel(spec: string | { baseUrl: string; apiKey: string; model: string }): ModelAdapter {
  if (typeof spec === "string") {
    const [provider, model] = spec.split(":")
    if (provider === "anthropic") {
      return new AnthropicAdapter(model)
    }
    if (provider === "openai") {
      return new OpenAIAdapter(model)
    }
    if (provider === "gemini") {
      return new GeminiAdapter(model)
    }
    throw new Error(`Unknown provider: ${provider}`)
  }
  return new CustomAdapter(spec.baseUrl, spec.apiKey, spec.model)
}

export interface GenerateOptions {
  maxTokens?: number
  temperature?: number
}

export interface StreamChunk {
  delta: string
  done: boolean
}

export interface ModelResponse {
  content: string
  usage: { promptTokens: number; completionTokens: number; totalTokens: number }
}

export abstract class BaseModelAdapter implements ModelAdapter {
  abstract generate(messages: { role: string; content: string }[], options?: GenerateOptions): Promise<{ content: string; usage: { promptTokens: number; completionTokens: number; totalTokens: number } }>
  abstract stream(messages: { role: string; content: string }[], options?: GenerateOptions): AsyncIterable<{ delta: string; done: boolean }>
  abstract bindTools(tools: { name: string; description: string; schema: unknown }[]): ModelAdapter
  
  async chat(prompt: string): Promise<AgentEvent[]> {
    const response = await this.generate([{ role: "user", content: prompt }])
    return [{ type: "token", delta: response.content }, { type: "done", usage: response.usage }]
  }
}