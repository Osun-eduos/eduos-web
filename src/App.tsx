import { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth';
import { Layout } from './components/Layout';
import { canSeeAccounts, canSeeActivity, canSeeStudents, isMinistry } from './roles';
import type { Role } from './types';
import { Accounts } from './pages/Accounts';
import { Activity } from './pages/Activity';
import { ChangePassword } from './pages/ChangePassword';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Profile } from './pages/Profile';
import { SchoolDetail } from './pages/SchoolDetail';
import { Schools } from './pages/Schools';
import { Sessions } from './pages/Sessions';
import { Classes } from './pages/Classes';
import { Students } from './pages/Students';
import { EnrolStudent } from './pages/EnrolStudent';
import { StudentRecord } from './pages/StudentRecord';
import { Transfers } from './pages/Transfers';

const isSchoolAdmin = (r: Role) => r === 'SCHOOL_ADMIN';

function RequireAuth({ children, allow }: { children: ReactNode; allow?: (r: Role) => boolean }) {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return <p className="muted" style={{ padding: 24 }}>Loading…</p>;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (user.mustChangePassword && loc.pathname !== '/change-password') return <Navigate to="/change-password" replace />;
  if (allow && !allow(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/change-password" element={<RequireAuth><ChangePassword /></RequireAuth>} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Home />} />
        <Route path="schools" element={<RequireAuth allow={isMinistry}><Schools /></RequireAuth>} />
        <Route path="schools/:id" element={<RequireAuth allow={isMinistry}><SchoolDetail /></RequireAuth>} />
        <Route path="accounts" element={<RequireAuth allow={canSeeAccounts}><Accounts /></RequireAuth>} />
        <Route path="activity" element={<RequireAuth allow={canSeeActivity}><Activity /></RequireAuth>} />
        <Route path="sessions" element={<RequireAuth allow={isMinistry}><Sessions /></RequireAuth>} />
        <Route path="classes" element={<RequireAuth allow={isSchoolAdmin}><Classes /></RequireAuth>} />
        <Route path="students" element={<RequireAuth allow={canSeeStudents}><Students /></RequireAuth>} />
        <Route path="students/new" element={<RequireAuth allow={isSchoolAdmin}><EnrolStudent /></RequireAuth>} />
        <Route path="students/:id" element={<StudentRecord />} />
        <Route path="transfers" element={<RequireAuth allow={canSeeStudents}><Transfers /></RequireAuth>} />
        <Route path="profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
