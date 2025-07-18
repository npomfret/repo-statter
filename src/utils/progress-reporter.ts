export interface ProgressReporter {
  report(step: string, current?: number, total?: number): void
}

export class ConsoleProgressReporter implements ProgressReporter {
  report(step: string, current?: number, total?: number): void {
    if (current !== undefined && total !== undefined) {
      console.log(`[${current}/${total}] ${step}`)
    } else {
      console.log(`[Progress] ${step}`)
    }
  }
}

export class SilentProgressReporter implements ProgressReporter {
  report(_step: string, _current?: number, _total?: number): void {
    // No-op implementation for tests and programmatic usage
  }
}