import type { Role, SchoolLevel } from './types';

export const ROLE_LABEL: Record<Role, string> = {
  MINISTRY_ADMIN: 'Ministry administrator',
  MINISTRY_OFFICER: 'Ministry officer',
  LGA_OFFICER: 'LGA education officer',
  INSPECTOR: 'School inspector',
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
  MINISTRY_ADMIN: ['MINISTRY_ADMIN', 'MINISTRY_OFFICER', 'LGA_OFFICER', 'INSPECTOR', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT'],
  MINISTRY_OFFICER: [],
  LGA_OFFICER: [],
  INSPECTOR: [],
  SCHOOL_ADMIN: ['TEACHER', 'PARENT'],
  TEACHER: [],
  PARENT: [],
};

export const isMinistry = (r: Role) => r === 'MINISTRY_ADMIN' || r === 'MINISTRY_OFFICER';
/** Read-only oversight of schools: the Ministry, LGA education officers and inspectors. LGA-scoped accounts see only their LGA. */
export const isOversight = (r: Role) => isMinistry(r) || r === 'LGA_OFFICER' || r === 'INSPECTOR';
/** Roles tied to an LGA: required for LGA officers, optional for inspectors (none means state-wide). */
export const LGA_ROLES: Role[] = ['LGA_OFFICER', 'INSPECTOR'];
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

export const canTakeAttendance = (r: Role) => r === 'TEACHER' || r === 'SCHOOL_ADMIN';
export const canSeeAttendance = (r: Role) => r !== 'PARENT';
export const canSeeResults = (r: Role) => r !== 'PARENT';

export const canSeeStaff = (r: Role) => isOversight(r) || r === 'SCHOOL_ADMIN';
export const canEditStaff = (r: Role) => r === 'MINISTRY_ADMIN' || r === 'SCHOOL_ADMIN';
export const canSeeInspections = (r: Role) => isOversight(r) || r === 'SCHOOL_ADMIN';
export const canSeeSms = (r: Role) => isMinistry(r) || r === 'SCHOOL_ADMIN';

export const STAFF_STATUS_LABEL = { ACTIVE: 'Active', ON_LEAVE: 'On leave', LEFT: 'Left', RETIRED: 'Retired' } as const;
export const CATEGORY_LABEL = { TEACHING: 'Teaching', NON_TEACHING: 'Non-teaching' } as const;
export const OVERALL = {
  GOOD: { label: 'Good', pill: 'p-good' },
  FAIR: { label: 'Fair', pill: 'p-warn' },
  POOR: { label: 'Poor', pill: 'p-bad' },
  CRITICAL: { label: 'Critical', pill: 'p-bad' },
} as const;
