/**
 * Charts module index - maintains backward compatibility
 * Re-exports all chart functions from the monolithic charts.ts
 */

// For now, re-export everything from the original charts.ts
// This will be gradually replaced as we extract individual chart modules
export * from '../charts.js'