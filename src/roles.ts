import type { Role, SchoolLevel } from './types';

export const ROLE_LABEL: Record<Role, string> = {
  MINISTRY_ADMIN: 'Ministry administrator',
  MINISTRY_OFFICER: 'Ministry officer',
  SCHOOL_ADMIN: 'School administrator',
  TEACHER: 'Teacher',
  PARENT: 'Parent',
};

export const LEVEL_LABEL: Record<SchoolLevel, string> = {
  PRIMARY: 'Primary',
  JUNIOR_SECONDARY: 'Junior Secondary',
  SENIOR_SECONDARY: 'Senior Secondary',
  JUNIOR_AND_SENIOR: 'Junior & Senior Secondary',
};

/** Which account types each role may create (mirrors the API's rules). */
export const CAN_CREATE: Record<Role, Role[]> = {
  MINISTRY_ADMIN: ['MINISTRY_ADMIN', 'MINISTRY_OFFICER', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT'],
  MINISTRY_OFFICER: [],
  SCHOOL_ADMIN: ['TEACHER', 'PARENT'],
  TEACHER: [],
  PARENT: [],
};

export const isMinistry = (r: Role) => r === 'MINISTRY_ADMIN' || r === 'MINISTRY_OFFICER';
export const canSeeAccounts = (r: Role) => isMinistry(r) || r === 'SCHOOL_ADMIN';
export const canSeeActivity = (r: Role) => r === 'MINISTRY_ADMIN' || r === 'SCHOOL_ADMIN';

export function levelLabel(level: string) {
  const [kind, n] = level.split('_');
  return kind === 'PRIMARY' ? `Primary ${n}` : `${kind} ${n}`;
}

export const SEX_LABEL = { F: 'Female', M: 'Male' } as const;

export function ageFrom(dob: string) {
  const d = new Date(dob + 'T00:00:00Z');
  const now = new Date();
  let a = now.getUTCFullYear() - d.getUTCFullYear();
  if (now.getUTCMonth() < d.getUTCMonth() || (now.getUTCMonth() === d.getUTCMonth() && now.getUTCDate() < d.getUTCDate())) a--;
  return a;
}

export const canSeeStudents = (r: Role) => r !== 'PARENT' && r !== 'TEACHER';
