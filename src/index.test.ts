import { describe, it, expect } from 'vitest'
import { VERSION } from './index.js'

describe('Constants', () => {
  it('should export VERSION constant', () => {
    expect(VERSION).toBe('1.0.0')
  })
})