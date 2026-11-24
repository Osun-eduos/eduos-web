export type Role = 'MINISTRY_ADMIN' | 'MINISTRY_OFFICER' | 'SCHOOL_ADMIN' | 'TEACHER' | 'PARENT';
export type SchoolLevel = 'PRIMARY' | 'JUNIOR_SECONDARY' | 'SENIOR_SECONDARY' | 'JUNIOR_AND_SENIOR';
export type Ownership = 'PUBLIC' | 'PRIVATE';

export interface User {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: Role;
  schoolId: string | null;
  school: { id: string; name: string; code: string } | null;
  mustChangePassword: boolean;
  isActive: boolean;
  lockedUntil: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface School {
  id: string;
  code: string;
  name: string;
  lga: string;
  level: SchoolLevel;
  ownership: Ownership;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  accounts?: number;
  accountsByRole?: Partial<Record<Role, number>>;
}

export interface NewCredentials {
  user: User;
  tempPassword: string;
}

export interface AuditEntry {
  id: string;
  action: string;
  actorId: string | null;
  actorName: string | null;
  targetType: string | null;
  targetId: string | null;
  targetName: string | null;
  meta: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
}
