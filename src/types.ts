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

export type ClassLevel =
  | 'PRIMARY_1' | 'PRIMARY_2' | 'PRIMARY_3' | 'PRIMARY_4' | 'PRIMARY_5' | 'PRIMARY_6'
  | 'JSS_1' | 'JSS_2' | 'JSS_3' | 'SSS_1' | 'SSS_2' | 'SSS_3';
export type Sex = 'F' | 'M';
export type StudentStatus = 'ACTIVE' | 'WITHDRAWN' | 'GRADUATED';
export type TransferStatus = 'REQUESTED' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';

export interface AcademicSession {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface ClassArm {
  id: string;
  level: ClassLevel;
  arm: string;
  name: string;
  capacity: number;
  students: number;
  classTeacher: { id: string; fullName: string } | null;
}

export interface StudentSummary {
  id: string;
  learnerId: string;
  fullName: string;
  surname: string;
  firstName: string;
  middleName: string | null;
  sex: Sex;
  dateOfBirth: string;
  status: StudentStatus;
  school: { id: string; name: string; code: string } | null;
  admissionNumber: string | null;
  currentClass: { id: string; name: string } | null;
}

export interface Guardian {
  id: string;
  relationship: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  isActive?: boolean;
}

export interface StudentRecord extends StudentSummary {
  stateOfOrigin: string | null;
  lgaOfOrigin: string | null;
  homeAddress?: string | null;
  guardians: Guardian[];
  enrolments: { school: string; schoolCode: string; admissionNumber: string; admittedOn: string; leftOn: string | null; leftReason: string | null }[];
  classHistory: { session: string; className: string; school: string }[];
  transfers: { id: string; status: TransferStatus; from: string; to: string; reason: string; note: string | null; requestedAt: string; decidedAt: string | null }[];
}

export interface Transfer {
  id: string;
  status: TransferStatus;
  reason: string;
  note: string | null;
  requestedAt: string;
  decidedAt: string | null;
  requestedBy: string | null;
  decidedBy: string | null;
  fromSchool: { id: string; name: string; code: string; lga: string };
  toSchool: { id: string; name: string; code: string; lga: string };
  student: { id: string; learnerId: string; fullName: string; sex: Sex; dateOfBirth: string; currentClass: string | null };
}

export interface SchoolRef {
  id: string;
  name: string;
  code: string;
  lga: string;
}
