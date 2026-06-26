import { createAgent, createModel } from "agents-core"
import { expressAgent } from "agents-express"
import express from "express"

const agent = createAgent({
  model: createModel("openai:gpt-4o"),
  tools: [],
})

const app = express()
app.use(express.json())
app.use("/api/agent", expressAgent(agent))

app.listen(3000, () => {
  console.log("Agent API running on http://localhost:3000")
})
