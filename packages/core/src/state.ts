import type { AgentStatus } from "./types"
import { StateTransitionError } from "./errors"

export type State = AgentStatus["state"]

export type AllowedTransitions = Record<State, State[]>

const ALLOWED_TRANSITIONS: AllowedTransitions = {
  idle: ["thinking", "planning"],
  thinking: ["planning", "streaming", "finished", "error"],
  planning: ["clarifying", "waiting", "streaming", "finished", "error"],
  clarifying: ["planning", "streaming", "finished", "error"],
  waiting: ["planning", "executing", "finished", "error"],
  executing: ["streaming", "finished", "error"],
  streaming: ["finished", "error"],
  finished: ["idle", "thinking"],
  error: ["idle", "thinking"],
}

export class StateMachine {
  private current: State = "idle"

  get currentState(): State {
    return this.current
  }

  transition(to: State): void {
    const allowed = ALLOWED_TRANSITIONS[this.current] ?? []
    if (!allowed.includes(to)) {
      throw new StateTransitionError(this.current, to)
    }
    this.current = to
  }

  canTransition(to: State): boolean {
    const allowed = ALLOWED_TRANSITIONS[this.current] ?? []
    return allowed.includes(to)
  }

  reset(): void {
    this.current = "idle"
  }
}