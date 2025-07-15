import { describe, it, expect } from 'vitest'
import { add, multiply, VERSION } from './index.js'

describe('Math functions', () => {
  describe('add', () => {
    it('should add two positive numbers', () => {
      expect(add(2, 3)).toBe(5)
    })

    it('should add negative numbers', () => {
      expect(add(-2, -3)).toBe(-5)
    })

    it('should add zero correctly', () => {
      expect(add(5, 0)).toBe(5)
      expect(add(0, 0)).toBe(0)
    })
  })

  describe('multiply', () => {
    it('should multiply two positive numbers', () => {
      expect(multiply(3, 4)).toBe(12)
    })

    it('should multiply with negative numbers', () => {
      expect(multiply(-3, 4)).toBe(-12)
      expect(multiply(-3, -4)).toBe(12)
    })

    it('should multiply by zero', () => {
      expect(multiply(5, 0)).toBe(0)
      expect(multiply(0, 10)).toBe(0)
    })
  })
})

describe('Constants', () => {
  it('should export VERSION constant', () => {
    expect(VERSION).toBe('1.0.0')
  })
})