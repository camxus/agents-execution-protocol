import type { ToolInterface, ToolContext } from "./types"
import { z } from "zod"
import { ToolExecutionError } from "./errors"

export class ToolRegistry {
  private tools: Map<string, ToolInterface> = new Map()

  register(tool: ToolInterface): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered`)
    }
    this.tools.set(tool.name, tool)
  }

  get(name: string): ToolInterface | undefined {
    return this.tools.get(name)
  }

  list(): { name: string; description: string; schema: ReturnType<typeof z.object> }[] {
    return Array.from(this.tools.values()).map((t) => ({
      name: t.name,
      description: t.description,
      schema: t.schema,
    }))
  }

  async execute(name: string, args: unknown, ctx: ToolContext): Promise<unknown> {
    const tool = this.tools.get(name)
    if (!tool) {
      throw new Error(`Tool "${name}" not found`)
    }
    try {
      const validated = tool.schema.parse(args)
      return await tool.execute(validated, ctx)
    } catch (err) {
      throw new ToolExecutionError(name, err)
    }
  }
}

export function createTool(tool: ToolInterface): ToolInterface {
  return tool
}