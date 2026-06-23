export const PASSWORD_MIN_LENGTH = 8

export interface PasswordCheck {
  id: string
  label: string
  passed: boolean
}

export function getPasswordChecks(password: string): PasswordCheck[] {
  return [
    {
      id: 'length',
      label: `At least ${PASSWORD_MIN_LENGTH} characters`,
      passed: password.length >= PASSWORD_MIN_LENGTH,
    },
    {
      id: 'uppercase',
      label: 'One uppercase letter',
      passed: /[A-Z]/.test(password),
    },
    {
      id: 'lowercase',
      label: 'One lowercase letter',
      passed: /[a-z]/.test(password),
    },
    {
      id: 'number',
      label: 'One number',
      passed: /\d/.test(password),
    },
    {
      id: 'special',
      label: 'One special character (!@#$…)',
      passed: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
    },
  ]
}

export function isPasswordValid(password: string): boolean {
  return getPasswordChecks(password).every((c) => c.passed)
}

export const PASSWORD_REQUIREMENTS_HINT =
  'At least 8 characters with uppercase, lowercase, number, and symbol'
