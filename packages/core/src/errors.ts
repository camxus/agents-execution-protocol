export class ToolExecutionError extends Error {
  constructor(
    public readonly toolName: string,
    public readonly cause: unknown,
  ) {
    super(`Tool "${toolName}" failed`)
    this.name = "ToolExecutionError"
    Object.setPrototypeOf(this, ToolExecutionError.prototype)
  }
}

export class ModelError extends Error {
  constructor(
    public readonly provider: string,
    public readonly cause: unknown,
  ) {
    super(`Model provider "${provider}" returned an error`)
    this.name = "ModelError"
    Object.setPrototypeOf(this, ModelError.prototype)
  }
}

export class PlanningError extends Error {
  constructor(public readonly cause: unknown) {
    super("Planning failed")
    this.name = "PlanningError"
    Object.setPrototypeOf(this, PlanningError.prototype)
  }
}

export class IntentNotFoundError extends Error {
  constructor(public readonly message: string) {
    super(`No intent matched for message: "${message}"`)
    this.name = "IntentNotFoundError"
    Object.setPrototypeOf(this, IntentNotFoundError.prototype)
  }
}

export class StateTransitionError extends Error {
  constructor(
    public readonly fromState: string,
    public readonly toState: string,
  ) {
    super(`Invalid state transition from ${fromState} to ${toState}`)
    this.name = "StateTransitionError"
    Object.setPrototypeOf(this, StateTransitionError.prototype)
  }
}