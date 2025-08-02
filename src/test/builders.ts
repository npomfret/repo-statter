import type { CommitData, FileChange } from '../git/parser.js'

export class CommitDataBuilder {
  private commit: CommitData = {
    sha: 'abc123',
    authorName: 'Test Author',
    authorEmail: 'test@example.com',
    date: '2024-01-01',
    message: 'Test commit',
    linesAdded: 0,
    linesDeleted: 0,
    bytesAdded: 0,
    bytesDeleted: 0,
    filesChanged: []
  }

  withHash(sha: string): this {
    this.commit.sha = sha
    return this
  }

  withAuthor(authorName: string, authorEmail?: string): this {
    this.commit.authorName = authorName
    if (authorEmail) this.commit.authorEmail = authorEmail
    return this
  }

  withDate(date: Date | string): this {
    this.commit.date = typeof date === 'string' ? date : date.toISOString()
    return this
  }

  withMessage(message: string): this {
    this.commit.message = message
    return this
  }

  withFileChange(fileChange: FileChange): this {
    this.commit.filesChanged.push(fileChange)
    this.updateStats()
    return this
  }

  withFileChanges(fileChanges: FileChange[]): this {
    this.commit.filesChanged = fileChanges
    this.updateStats()
    return this
  }

  private updateStats(): void {
    this.commit.linesAdded = this.commit.filesChanged.reduce((sum, fc) => sum + fc.linesAdded, 0)
    this.commit.linesDeleted = this.commit.filesChanged.reduce((sum, fc) => sum + fc.linesDeleted, 0)
    this.commit.bytesAdded = this.commit.filesChanged.reduce((sum, fc) => sum + (fc.bytesAdded || 0), 0)
    this.commit.bytesDeleted = this.commit.filesChanged.reduce((sum, fc) => sum + (fc.bytesDeleted || 0), 0)
  }

  build(): CommitData {
    return { ...this.commit }
  }
}

export class FileChangeBuilder {
  private fileChange: FileChange = {
    fileName: 'test.js',
    linesAdded: 0,
    linesDeleted: 0,
    fileType: '.js',
    bytesAdded: 0,
    bytesDeleted: 0
  }

  withPath(path: string): this {
    this.fileChange.fileName = path
    this.fileChange.fileType = path.split('.').pop() || ''
    return this
  }

  withFileType(fileType: string): this {
    this.fileChange.fileType = fileType
    return this
  }

  withAdditions(lines: number, bytes?: number): this {
    this.fileChange.linesAdded = lines
    this.fileChange.bytesAdded = bytes ?? lines * 50 // Default ~50 bytes per line
    return this
  }

  withAdditionsNoByte(lines: number): this {
    this.fileChange.linesAdded = lines
    this.fileChange.bytesAdded = 0
    return this
  }

  withDeletions(lines: number, bytes?: number): this {
    this.fileChange.linesDeleted = lines
    this.fileChange.bytesDeleted = bytes ?? lines * 50 // Default ~50 bytes per line
    return this
  }

  withDeletionsNoByte(lines: number): this {
    this.fileChange.linesDeleted = lines
    this.fileChange.bytesDeleted = 0
    return this
  }

  build(): FileChange {
    return { ...this.fileChange }
  }
}

// Factory functions for common test scenarios
export function createTestCommit(overrides?: Partial<CommitData>): CommitData {
  const builder = new CommitDataBuilder()
  
  if (overrides?.sha) builder.withHash(overrides.sha)
  if (overrides?.authorName) builder.withAuthor(overrides.authorName, overrides.authorEmail)
  if (overrides?.date) builder.withDate(overrides.date)
  if (overrides?.message) builder.withMessage(overrides.message)
  
  // If filesChanged provided, use them directly
  if (overrides?.filesChanged) {
    builder.withFileChanges(overrides.filesChanged)
  } else {
    // Otherwise create default file change
    const defaultFile = new FileChangeBuilder()
      .withPath('src/index.js')
      .withAdditions(overrides?.linesAdded ?? 10)
      .withDeletions(overrides?.linesDeleted ?? 0)
    
    if (overrides?.bytesAdded !== undefined) {
      defaultFile.withAdditions(overrides.linesAdded ?? 10, overrides.bytesAdded)
    }
    if (overrides?.bytesDeleted !== undefined) {
      defaultFile.withDeletions(overrides.linesDeleted ?? 0, overrides.bytesDeleted)
    }
    
    builder.withFileChange(defaultFile.build())
  }
  
  return builder.build()
}

export function createEmptyCommit(author: string = 'Test Author'): CommitData {
  return new CommitDataBuilder()
    .withAuthor(author)
    .withMessage('Empty commit')
    .build()
}





