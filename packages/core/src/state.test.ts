import { describe, it, expect } from "vitest"
import { StateMachine } from "./state"

describe("StateMachine", () => {
  it("starts in idle state", () => {
    const sm = new StateMachine()
    expect(sm.currentState).toBe("idle")
  })

  it("transitions from idle to thinking", () => {
    const sm = new StateMachine()
    sm.transition("thinking")
    expect(sm.currentState).toBe("thinking")
  })

  it("throws on invalid transition", () => {
    const sm = new StateMachine()
    expect(() => sm.transition("streaming")).toThrow()
  })

  it("resets to idle", () => {
    const sm = new StateMachine()
    sm.transition("thinking")
    sm.reset()
    expect(sm.currentState).toBe("idle")
  })
})
