import { describe, expect, it } from 'vitest'
import {
  confirmPasswordError,
  emailError,
  nameError,
  passwordChecks,
  passwordError,
} from './validation'

describe('form validation', () => {
  it('checks emails', () => {
    expect(emailError('')).toMatch(/Įvesk el\. pašto/)
    expect(emailError('gabija@')).toMatch(/tinkamą/)
    expect(emailError('gabija@pacemates')).toMatch(/tinkamą/)
    expect(emailError('  gabija@pacemates.lt ')).toBeNull()
  })

  it('checks names', () => {
    expect(nameError(' G ')).toMatch(/bent 2/)
    expect(nameError('Gabija')).toBeNull()
    expect(nameError('x'.repeat(81))).toMatch(/per ilgas/)
  })

  it('needs 8+ characters with letters and a digit', () => {
    expect(passwordError('')).toMatch(/Įvesk/)
    expect(passwordError('abcdefgh')).toMatch(/skaičius/)
    expect(passwordError('12345678')).toMatch(/raidės/)
    expect(passwordError('ab12')).toMatch(/8 simboliai/)
    expect(passwordError('ąžuolas1')).toBeNull()
    expect(passwordChecks('bėgimas').map((c) => c.ok)).toEqual([false, true, false])
  })

  it('compares the repeated password', () => {
    expect(confirmPasswordError('begame123', '')).toMatch(/Pakartok/)
    expect(confirmPasswordError('begame123', 'begame124')).toMatch(/nesutampa/)
    expect(confirmPasswordError('begame123', 'begame123')).toBeNull()
  })
})
