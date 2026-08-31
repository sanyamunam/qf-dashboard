import { defineConfig } from 'vitest/config'

/**
 * The model layer only.
 *
 * These are pure functions over the parsed workbook with exact expected
 * answers — how many indicators are at risk, which ones are excluded, how
 * polarity inverts. That is the one part of this codebase where a unit test
 * says more than a headless screenshot, and where a silent regression in the
 * arithmetic would otherwise reach the CEO's dashboard unnoticed.
 */
export default defineConfig({
  test: { include: ['src/model/**/*.test.ts'], environment: 'node' },
})
