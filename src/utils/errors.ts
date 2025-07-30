export class RepoStatError extends Error {
  constructor(message: string, public code: string, public override cause?: Error) {
    super(message)
    this.name = 'RepoStatError'
  }
}

export class GitParseError extends RepoStatError {
  constructor(message: string, cause?: Error) {
    super(message, 'GIT_PARSE_ERROR', cause)
  }
}

export class BuildError extends RepoStatError {
  constructor(message: string, cause?: Error) {
    super(message, 'BUILD_ERROR', cause)
  }
}

export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

export function isRepoStatError(error: unknown): error is RepoStatError {
  return error instanceof RepoStatError
}

export function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new RepoStatError(message, 'ASSERTION_ERROR')
  }
}

export function assertDefined<T>(value: T | undefined | null, name: string): asserts value is T {
  if (value === undefined || value === null) {
    throw new RepoStatError(`${name} is required but was ${value}`, 'ASSERTION_ERROR')
  }
}