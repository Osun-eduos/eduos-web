import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth';
import { canSeeAccounts, canSeeActivity, canSeeAttendance, canSeeInspections, canSeeResults, canSeeSms, canSeeStaff, canSeeStudents, isOversight, ROLE_LABEL } from '../roles';

export function Layout() {
  const { user, signOut } = useAuth();
  if (!user) return null;
  return (
    <div className="shell">
      <aside className="side">
        <NavLink to="/" className="brand">
          <b>Osun EduOS</b>
          <span>Education Management &amp; Intelligence</span>
        </NavLink>
        <nav className="nav" aria-label="Main">
          <NavLink to="/" end>
            Home
          </NavLink>
          {isOversight(user.role) && <NavLink to="/schools">Schools</NavLink>}
          {user.role === 'SCHOOL_ADMIN' && <NavLink to="/classes">Classes</NavLink>}
          {canSeeStudents(user.role) && <NavLink to="/students">Students</NavLink>}
          {canSeeAttendance(user.role) && <NavLink to="/attendance">Attendance</NavLink>}
          {user.role === 'TEACHER' && <NavLink to="/scores">Scores</NavLink>}
          {canSeeResults(user.role) && <NavLink to="/results">Results</NavLink>}
          {canSeeStudents(user.role) && <NavLink to="/transfers">Transfers</NavLink>}
          {canSeeStaff(user.role) && <NavLink to="/staff">Staff</NavLink>}
          {canSeeInspections(user.role) && <NavLink to="/inspections">Inspections</NavLink>}
          {canSeeSms(user.role) && <NavLink to="/text-messages">Text messages</NavLink>}
          {isOversight(user.role) && <NavLink to="/sessions">Sessions and terms</NavLink>}
          {canSeeAccounts(user.role) && <NavLink to="/accounts">Accounts</NavLink>}
          {canSeeActivity(user.role) && <NavLink to="/activity">Activity</NavLink>}
          <NavLink to="/profile">My account</NavLink>
        </nav>
        <div className="who">
          <span>
            <b>{user.fullName}</b>
            <br />
            {ROLE_LABEL[user.role]}
            {user.school && user.role !== 'PARENT' ? ` · ${user.school.name}` : ''}
            {user.lga ? ` · ${user.lga} LGA` : ''}
          </span>
          <button type="button" onClick={signOut}>
            Sign out
          </button>
        </div>
      </aside>
      <main id="main">
        <Outlet />
      </main>
    </div>
  );
}
