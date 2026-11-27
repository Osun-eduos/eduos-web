import { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { needsTwoStep, useAuth } from './auth';
import { Layout } from './components/Layout';
import { canSeeAccounts, canSeeActivity, canSeeAttendance, canSeeInspections, canSeeResults, canSeeSms, canSeeStaff, canSeeStudents, isOversight } from './roles';
import { InspectionDetail, Inspections } from './pages/Inspections';
import { Staff } from './pages/Staff';
import { StaffRecord } from './pages/StaffRecord';
import { StaffTransfers } from './pages/StaffTransfers';
import { TextMessages } from './pages/TextMessages';
import { Dashboard } from './pages/Dashboard';
import { Archive } from './pages/Archive';
import { Notices } from './pages/Notices';
import { Notifications } from './pages/Notifications';
import type { Role } from './types';
import { Accounts } from './pages/Accounts';
import { Activity } from './pages/Activity';
import { ChangePassword } from './pages/ChangePassword';
import { TwoStepRequired } from './pages/TwoStep';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Profile } from './pages/Profile';
import { SchoolDetail } from './pages/SchoolDetail';
import { Schools } from './pages/Schools';
import { Sessions } from './pages/Sessions';
import { Classes } from './pages/Classes';
import { Students } from './pages/Students';
import { ImportStudents } from './pages/ImportStudents';
import { EnrolStudent } from './pages/EnrolStudent';
import { StudentRecord } from './pages/StudentRecord';
import { Transfers } from './pages/Transfers';
import { Attendance } from './pages/Attendance';
import { ClassSubjects } from './pages/ClassSubjects';
import { MyScores, ScoreSheetPage } from './pages/Scores';
import { ClassResultsPage, Results } from './pages/Results';
import { ReportCard } from './pages/ReportCard';
import { GradingPage } from './pages/Grading';
import { Exams } from './pages/Exams';
import { Allocation } from './pages/Allocation';
import { AnalysisPage } from './pages/Analysis';
import { PopulationPage } from './pages/Population';
import { StaffRegister } from './pages/StaffRegister';
import { InspectionForm } from './pages/InspectionForm';
import { Verify } from './pages/Verify';
import { Landing } from './pages/Landing';
import { ExamRecords } from './pages/ExamRecords';
import { MySchool } from './pages/SchoolDetail';

const isTeacher = (r: Role) => r === 'TEACHER';
const canEnterScores = (r: Role) => r === 'TEACHER' || r === 'SCHOOL_ADMIN';

const isSchoolAdmin = (r: Role) => r === 'SCHOOL_ADMIN';

function RequireAuth({ children, allow }: { children: ReactNode; allow?: (r: Role) => boolean }) {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return <p className="muted" style={{ padding: 24 }}>Loading…</p>;
  // Signed-out visitors to the front page see the public landing page; anywhere else asks them to sign in.
  if (!user) return loc.pathname === '/' ? <Landing /> : <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (user.mustChangePassword && loc.pathname !== '/change-password') return <Navigate to="/change-password" replace />;
  if (!user.mustChangePassword && needsTwoStep(user) && loc.pathname !== '/two-step') return <Navigate to="/two-step" replace />;
  if (allow && !allow(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/verify" element={<Verify />} />
      <Route path="/verify/:code" element={<Verify />} />
      <Route path="/change-password" element={<RequireAuth><ChangePassword /></RequireAuth>} />
      <Route path="/two-step" element={<RequireAuth><TwoStepRequired /></RequireAuth>} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Home />} />
        <Route path="schools" element={<RequireAuth allow={isOversight}><Schools /></RequireAuth>} />
        <Route path="schools/:id" element={<RequireAuth allow={isOversight}><SchoolDetail /></RequireAuth>} />
        <Route path="accounts" element={<RequireAuth allow={canSeeAccounts}><Accounts /></RequireAuth>} />
        <Route path="activity" element={<RequireAuth allow={canSeeActivity}><Activity /></RequireAuth>} />
        <Route path="sessions" element={<RequireAuth allow={isOversight}><Sessions /></RequireAuth>} />
        <Route path="classes" element={<RequireAuth allow={isSchoolAdmin}><Classes /></RequireAuth>} />
        <Route path="students" element={<RequireAuth allow={canSeeStudents}><Students /></RequireAuth>} />
        <Route path="students/new" element={<RequireAuth allow={isSchoolAdmin}><EnrolStudent /></RequireAuth>} />
        <Route path="students/import" element={<RequireAuth allow={isSchoolAdmin}><ImportStudents /></RequireAuth>} />
        <Route path="students/:id" element={<StudentRecord />} />
        <Route path="transfers" element={<RequireAuth allow={canSeeStudents}><Transfers /></RequireAuth>} />
        <Route path="attendance" element={<RequireAuth allow={canSeeAttendance}><Attendance /></RequireAuth>} />
        <Route path="classes/:id/subjects" element={<RequireAuth allow={isSchoolAdmin}><ClassSubjects /></RequireAuth>} />
        <Route path="scores" element={<RequireAuth allow={isTeacher}><MyScores /></RequireAuth>} />
        <Route path="scores/:classSubjectId" element={<RequireAuth allow={canEnterScores}><ScoreSheetPage /></RequireAuth>} />
        <Route path="results" element={<RequireAuth allow={canSeeResults}><Results /></RequireAuth>} />
        <Route path="results/:classId" element={<RequireAuth allow={canSeeResults}><ClassResultsPage /></RequireAuth>} />
        <Route path="report-card/:studentId" element={<ReportCard />} />
        <Route path="dashboard" element={<RequireAuth allow={isOversight}><Dashboard /></RequireAuth>} />
        <Route path="staff" element={<RequireAuth allow={canSeeStaff}><Staff /></RequireAuth>} />
        <Route path="staff/:id" element={<RequireAuth allow={canSeeStaff}><StaffRecord /></RequireAuth>} />
        <Route path="staff-transfers" element={<RequireAuth allow={canSeeStaff}><StaffTransfers /></RequireAuth>} />
        <Route path="inspections" element={<RequireAuth allow={canSeeInspections}><Inspections /></RequireAuth>} />
        <Route path="inspections/:id" element={<RequireAuth allow={canSeeInspections}><InspectionDetail /></RequireAuth>} />
        <Route path="text-messages" element={<RequireAuth allow={canSeeSms}><TextMessages /></RequireAuth>} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="archive" element={<RequireAuth allow={(r) => isOversight(r) || r === 'SCHOOL_ADMIN'}><Archive /></RequireAuth>} />
        <Route path="notices" element={<RequireAuth allow={isSchoolAdmin}><Notices /></RequireAuth>} />
        <Route path="profile" element={<Profile />} />
        <Route path="records" element={<RequireAuth allow={(r) => isOversight(r) || r === 'SCHOOL_ADMIN'}><ExamRecords /></RequireAuth>} />
        <Route path="grading" element={<RequireAuth allow={isOversight}><GradingPage /></RequireAuth>} />
        <Route path="population" element={<RequireAuth allow={isOversight}><PopulationPage /></RequireAuth>} />
        <Route path="exams" element={<RequireAuth allow={canEnterScores}><Exams /></RequireAuth>} />
        <Route path="classes/allocation" element={<RequireAuth allow={isSchoolAdmin}><Allocation /></RequireAuth>} />
        <Route path="results/:classId/analysis" element={<RequireAuth allow={canSeeResults}><AnalysisPage /></RequireAuth>} />
        <Route path="staff/register" element={<RequireAuth allow={isSchoolAdmin}><StaffRegister /></RequireAuth>} />
        <Route path="inspections/new" element={<RequireAuth allow={(r) => r === 'INSPECTOR' || r === 'LGA_OFFICER'}><InspectionForm /></RequireAuth>} />
        <Route path="my-school" element={<RequireAuth allow={isSchoolAdmin}><MySchool /></RequireAuth>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
