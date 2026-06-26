import { createAgent, createModel } from "agents-core"
import { nextAgent } from "agents-next"

const agent = createAgent({
  model: createModel("openai:gpt-4o"),
  tools: [],
})

export const POST = nextAgent(agent)
