export type Role = 'MINISTRY_ADMIN' | 'MINISTRY_OFFICER' | 'LGA_OFFICER' | 'INSPECTOR' | 'SCHOOL_ADMIN' | 'TEACHER' | 'PARENT';
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
  /** LGA education officers and LGA inspectors: the one LGA they oversee. */
  lga: string | null;
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

export type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED';
export type AttendanceCounts = Record<AttendanceStatus, number>;

export interface Register {
  class: { id: string; name: string; school: { id: string; name: string }; classTeacher: { id: string; fullName: string } | null; session: string };
  date: string;
  editable: boolean;
  lockedReason: string | null;
  register: { takenBy: string; takenAt: string; updatedBy: string | null; updatedAt: string | null } | null;
  students: { id: string; learnerId: string; fullName: string; sex: Sex; status: AttendanceStatus | null; note: string | null; inClass: boolean }[];
  totals: AttendanceCounts;
}

export interface AttendanceDay {
  date: string;
  session: string | null;
  isSchoolDay: boolean;
  holiday: string | null;
  classes: {
    id: string;
    name: string;
    classTeacher: { id: string; fullName: string } | null;
    students: number;
    taken: boolean;
    takenBy: string | null;
    takenAt: string | null;
    counts: AttendanceCounts | null;
  }[];
  totals: AttendanceCounts & { classes: number; taken: number };
}

export interface ClassAttendance {
  class: { id: string; name: string; session: string };
  from: string;
  to: string;
  registers: number;
  students: { id: string; learnerId: string; fullName: string; inClass: boolean; counts: AttendanceCounts; rate: number | null }[];
  days: (AttendanceCounts & { date: string })[];
}

export interface StudentAttendance {
  from: string | null;
  to: string | null;
  counts: AttendanceCounts;
  rate: number | null;
  records: { date: string; status: AttendanceStatus; note: string | null; className: string; school: string }[];
}

export interface AttendanceToday {
  date: string;
  isSchoolDay: boolean;
  holiday: string | null;
  classes: number;
  taken: number;
  counts: AttendanceCounts;
  rate: number | null;
}

export interface Component { key: string; label: string; max: number }
export type SheetStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'RETURNED';
export type SssGrading = 'WAEC' | 'BASIC';

export interface Term {
  id: string;
  number: number;
  name: string;
  session: { id: string; name: string };
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  components: Component[];
  showPositions: boolean;
  sssGrading: SssGrading;
}

export interface ClassSubjectRow {
  id: string;
  code: string;
  name: string;
  teacher: { id: string; fullName: string } | null;
  sheet: { id: string; status: SheetStatus } | null;
}

export interface MySubjects {
  term: { id: string; name: string; session: string } | null;
  subjects: { id: string; code: string; name: string; class: { id: string; name: string }; students: number; sheet: { id: string; status: SheetStatus; returnNote: string | null } | null }[];
}

export interface ScoreSheet {
  id: string | null;
  classSubject: { id: string; code: string; name: string; teacher: { id: string; fullName: string } | null };
  class: { id: string; name: string; level: ClassLevel; school: { id: string; name: string } };
  term: { id: string; name: string; session: string; isCurrent: boolean; components: Component[]; sssGrading: SssGrading };
  status: SheetStatus;
  returnNote: string | null;
  submitted: { by: string | null; at: string } | null;
  decided: { by: string | null; at: string } | null;
  editable: boolean;
  lockedReason: string | null;
  released: boolean;
  students: { id: string; learnerId: string; fullName: string; inClass: boolean; marks: Record<string, number | null>; total: number | null; grade: string | null }[];
  summary: { students: number; complete: number; average: number | null; highest: number | null; lowest: number | null };
}

export interface ClassResults {
  class: { id: string; name: string; level: ClassLevel; school: { id: string; name: string }; classTeacher: { id: string; fullName: string } | null };
  term: { id: string; name: string; session: string; isCurrent: boolean; showPositions: boolean };
  released: { by: string; at: string } | null;
  canRelease: boolean;
  blockers: string[];
  canEditTeacherRemarks: boolean;
  canEditPrincipalRemarks: boolean;
  subjects: { classSubjectId: string; code: string; name: string; teacher: { id: string; fullName: string } | null; sheetId: string | null; status: SheetStatus | null; entered: number; average: number | null }[];
  students: { id: string; learnerId: string; fullName: string; totals: Record<string, number | null>; total: number | null; subjects: number; average: number | null; position: number | null; teacherRemark: string | null; principalRemark: string | null }[];
}

export interface ReportCard {
  released: boolean;
  student: { id: string; learnerId: string; fullName: string; sex: Sex; dateOfBirth: string; admissionNumber: string | null };
  school: { id: string; name: string; code: string; lga: string; address: string | null };
  class: { id: string; name: string; classTeacher: string | null; students: number };
  term: { id: string; name: string; session: string; startDate: string; endDate: string; components: Component[]; showPositions: boolean };
  subjects: { code: string; name: string; marks: Record<string, number | null>; total: number | null; grade: string | null; remark: string | null; classAverage: number | null; highest: number | null; lowest: number | null; position: number | null }[];
  summary: { subjects: number; total: number | null; average: number | null; position: string | null; outOf: number; classAverage: number | null };
  attendance: AttendanceCounts & { marked: number; rate: number | null };
  remarks: { teacher: string | null; principal: string | null };
  gradingScale: { min: number; grade: string; remark: string }[];
  nextTermBegins: string | null;
}

export interface ReportCardTerm { termId: string; name: string; session: string; className: string; released: boolean }

export interface ResultsSummary {
  term: { id: string; name: string; session: string };
  passMark: number;
  creditMark: number;
  schools: { id: string; name: string; lga: string; classesReleased: number; students: number; entries: number; average: number | null; passRate: number | null; creditRate: number | null }[];
  subjects: { code: string; name: string; entries: number; average: number | null; passRate: number | null; creditRate: number | null }[];
}

export interface Holiday {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

// ---------- Staff registry ----------
export type StaffCategory = 'TEACHING' | 'NON_TEACHING';
export type StaffStatus = 'ACTIVE' | 'ON_LEAVE' | 'LEFT' | 'RETIRED';
export interface SchoolBrief { id: string; name: string; code: string; lga: string }
export interface StaffSummary {
  id: string;
  staffNumber: string;
  fullName: string;
  sex: 'F' | 'M';
  category: StaffCategory;
  rank: string | null;
  gradeLevel: number | null;
  step: number | null;
  status: StaffStatus;
  phone: string | null;
  email: string | null;
  subjects: string[];
  school: SchoolBrief | null;
  account: { id: string; fullName: string; role: Role } | null;
  trcnNumber: string | null;
  yearsOfService: number | null;
}
export interface StaffRequest {
  id: string;
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  reason: string;
  note: string | null;
  effectiveDate: string;
  requestedAt: string;
  decidedAt?: string | null;
  requestedBy?: string | null;
  decidedBy?: string | null;
  from: SchoolBrief | null;
  to: SchoolBrief | null;
  staff?: StaffSummary;
}
export interface StaffRecord extends StaffSummary {
  surname: string;
  firstName: string;
  middleName: string | null;
  dateOfBirth: string | null;
  firstAppointment: string | null;
  age: number | null;
  qualifications: { id: string; kind: string; course: string | null; institution: string | null; year: number | null }[];
  trainings: { id: string; title: string; provider: string | null; startDate: string; endDate: string | null; hours: number | null }[];
  postings: { id: string; school: SchoolBrief; startDate: string; endDate: string | null; reason: string | null }[];
  requests: StaffRequest[];
}

// ---------- Inspections ----------
export type Overall = 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
export interface ChecklistItem { key: string; label: string; type: 'count' | 'rating' | 'yesno' | 'choice'; options?: { value: string; label: string }[]; hint?: string }
export interface Checklist { version: number; ratings: { value: string; label: string }[]; sections: { key: string; title: string; items: ChecklistItem[] }[] }
export interface InspectionSummary {
  id: string;
  school: SchoolBrief;
  inspector: { id: string; fullName: string; role: Role };
  visitedOn: string;
  overall: Overall;
  createdAt: string;
  issues: { level: Overall; text: string }[];
  issueCount: number;
  photoCount: number;
  notes: string | null;
}
export interface Inspection extends InspectionSummary {
  template: number;
  answers: Record<string, Record<string, number | string | boolean>>;
  photos: { id: string; section: string; caption: string | null; bytes: number }[];
}

// ---------- Text messages ----------
export type SmsStatus = 'QUEUED' | 'SENDING' | 'SENT' | 'FAILED' | 'CANCELLED';
export interface SmsMessage {
  id: string;
  kind: string;
  to: string;
  body: string;
  status: SmsStatus;
  error: string | null;
  attempts: number;
  date: string | null;
  createdAt: string;
  sendAfter: string;
  sentAt: string | null;
  cost: string | null;
  /** kudisms, or log when no SMS account is set up and nothing was really sent. */
  provider: string | null;
  student: string | null;
  parent: string | null;
  school: string | null;
}
export interface SmsSummary {
  today: Record<SmsStatus, number>;
  absenceSms: boolean | null;
  delayMinutes: number;
  provider: string;
  sending: boolean;
  balance: string | null;
  schoolsOff: number | null;
}
