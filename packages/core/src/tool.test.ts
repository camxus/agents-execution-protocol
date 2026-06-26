import { describe, it, expect } from "vitest"
import { ToolRegistry } from "./tool"
import { z } from "zod"

describe("ToolRegistry", () => {
  it("registers and retrieves a tool", () => {
    const registry = new ToolRegistry()
    const tool = {
      name: "test_tool",
      description: "A test tool",
      schema: z.object({ query: z.string() }),
      execute: async () => ({ result: "ok" }),
    }
    registry.register(tool)
    expect(registry.get("test_tool")).toBe(tool)
  })

  it("throws on duplicate tool name", () => {
    const registry = new ToolRegistry()
    const tool = {
      name: "test_tool",
      description: "A test tool",
      schema: z.object({ query: z.string() }),
      execute: async () => ({ result: "ok" }),
    }
    registry.register(tool)
    expect(() => registry.register(tool)).toThrow()
  })

  it("lists registered tools", () => {
    const registry = new ToolRegistry()
    registry.register({
      name: "tool_a",
      description: "Tool A",
      schema: z.object({}),
      execute: async () => ({}),
    })
    registry.register({
      name: "tool_b",
      description: "Tool B",
      schema: z.object({}),
      execute: async () => ({}),
    })
    const listed = registry.list()
    expect(listed).toHaveLength(2)
    expect(listed.map((t) => t.name)).toEqual(["tool_a", "tool_b"])
  })
})
