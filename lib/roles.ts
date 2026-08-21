import type { SystemRole } from './types'

/** How a role is written for people to read. */
export function roleLabel(role?: string | null): string {
  if (role === 'SUPERVISOR') return 'Supervisor'
  if (role === 'ADMIN') return 'Administrator'
  return 'Student Researcher'
}

/**
 * Classes for the coloured glow around an avatar — blue for a Student
 * Researcher, green for a Supervisor, amber for an Administrator. The colours
 * themselves live in globals.css under `.role-ring-*`.
 */
export function roleRingClass(role?: SystemRole | string | null): string {
  if (role === 'SUPERVISOR') return 'role-ring role-ring-supervisor'
  if (role === 'ADMIN') return 'role-ring role-ring-admin'
  return 'role-ring role-ring-student'
}
