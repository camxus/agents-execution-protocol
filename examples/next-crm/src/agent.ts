import { createAgent, createModel } from "agents-core"

export const agent = createAgent({
  model: createModel("openai:gpt-4o"),
  tools: [],
})
