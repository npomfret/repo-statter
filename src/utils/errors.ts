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

export class CLIError extends RepoStatError {
  constructor(message: string, cause?: Error) {
    super(message, 'CLI_ERROR', cause)
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