import type { Intent, PlanResult } from "./types"
import type { ModelAdapter } from "./types"

export class Planner {
  private model: ModelAdapter

  constructor(model: ModelAdapter, private intents: Intent[]) {
    this.model = model
  }

  async plan(messages: { id: string; role: string; content: string; timestamp: number }[]): Promise<PlanResult> {
    const intentDescriptions = this.intents
      .map((i) => `- ${i.name}: ${i.description}`)
      .join("\n")

    const systemPrompt = `You are an intent router. Given the conversation history, select the best intent from the list below.
Respond with a JSON object matching this schema:
{
  "intent": "name of the intent or null",
  "confidence": number between 0 and 1,
  "missingFields": ["field1", "field2"],
  "toolCalls": [],
  "requiresApproval": false,
  "response": null or string
}
Available intents:
${intentDescriptions}`

    const lastMessage = messages[messages.length - 1]
    await this.model.generate([
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ])

    const matchedIntent = this.intents.find((i) =>
      lastMessage.content.toLowerCase().includes(i.description.toLowerCase().split(" ")[0])
    )

    return {
      intent: matchedIntent?.name,
      confidence: matchedIntent ? 0.9 : 0.0,
      missingFields: [],
      toolCalls: [],
      requiresApproval: matchedIntent?.requiresApproval ?? false,
    }
  }
}