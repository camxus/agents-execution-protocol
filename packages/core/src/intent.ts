import type { Intent } from "./types"

export class IntentRegistry {
  private intents: Map<string, Intent> = new Map()

  register(intent: Intent): void {
    if (this.intents.has(intent.name)) {
      throw new Error(`Intent "${intent.name}" is already registered`)
    }
    this.intents.set(intent.name, intent)
  }

  get(name: string): Intent | undefined {
    return this.intents.get(name)
  }

  list(): Intent[] {
    return Array.from(this.intents.values())
  }
}