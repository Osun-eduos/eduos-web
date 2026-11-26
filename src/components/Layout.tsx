import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { canSeeAccounts, canSeeActivity, canSeeAttendance, canSeeInspections, canSeeSms, canSeeStaff, canSeeStudents, isOversight, ROLE_LABEL } from '../roles';

export function Layout() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  // The unread count refreshes every minute, on each page change, and when the inbox changes.
  useEffect(() => {
    if (!user) return;
    const load = () => api<{ unread: number }>('/notifications/unread-count').then((r) => setUnread(r.unread)).catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    window.addEventListener('eduos:inbox', load);
    return () => {
      clearInterval(t);
      window.removeEventListener('eduos:inbox', load);
    };
  }, [user, location.pathname]);
  if (!user) return null;
  const r = user.role;
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
          <NavLink to="/notifications">
            Notifications{unread > 0 && <span className="badge" aria-label={`${unread} unread`}>{unread > 99 ? '99+' : unread}</span>}
          </NavLink>
          {isOversight(r) && (
            <>
              <h3>State</h3>
              <NavLink to="/dashboard">Dashboard</NavLink>
              <NavLink to="/schools">Schools</NavLink>
              <NavLink to="/results">Results</NavLink>
            </>
          )}
          {r === 'SCHOOL_ADMIN' && (
            <>
              <h3>School</h3>
              <NavLink to="/my-school">School profile</NavLink>
              <NavLink to="/classes" end>Classes</NavLink>
              <NavLink to="/classes/allocation">Class allocation</NavLink>
            </>
          )}
          {(canSeeStudents(r) || canSeeAttendance(r)) && <h3>Learners</h3>}
          {canSeeStudents(r) && <NavLink to="/students">Students</NavLink>}
          {canSeeAttendance(r) && <NavLink to="/attendance">Attendance</NavLink>}
          {canSeeStudents(r) && <NavLink to="/transfers">Transfers</NavLink>}
          {(r === 'TEACHER' || r === 'SCHOOL_ADMIN') && (
            <>
              <h3>Exams and results</h3>
              {r === 'TEACHER' && <NavLink to="/scores">Scores</NavLink>}
              {r === 'TEACHER' && <NavLink to="/results">Class results</NavLink>}
              {r === 'SCHOOL_ADMIN' && <NavLink to="/results">Results approval</NavLink>}
              <NavLink to="/exams">Exam timetable</NavLink>
            </>
          )}
          {(isOversight(r) || r === 'SCHOOL_ADMIN') && <NavLink to="/archive">Exam records</NavLink>}
          {canSeeStaff(r) && (
            <>
              <h3>Staff</h3>
              <NavLink to="/staff" end>Staff registry</NavLink>
              {r === 'SCHOOL_ADMIN' && <NavLink to="/staff/register">Staff register</NavLink>}
            </>
          )}
          {canSeeInspections(r) && (
            <>
              <h3>Infrastructure</h3>
              <NavLink to="/inspections" end>Inspections</NavLink>
              {(r === 'INSPECTOR' || r === 'LGA_OFFICER') && <NavLink to="/inspections/new">New inspection</NavLink>}
            </>
          )}
          {canSeeSms(r) && <h3>Messages</h3>}
          {r === 'SCHOOL_ADMIN' && <NavLink to="/notices">Announcements</NavLink>}
          {canSeeSms(r) && <NavLink to="/text-messages">Text messages</NavLink>}
          {(isOversight(r) || canSeeAccounts(r) || canSeeActivity(r)) && <h3>Administration</h3>}
          {isOversight(r) && <NavLink to="/sessions">Sessions and terms</NavLink>}
          {isOversight(r) && <NavLink to="/grading">Grading system</NavLink>}
          {canSeeAccounts(r) && <NavLink to="/accounts">Accounts</NavLink>}
          {canSeeActivity(r) && <NavLink to="/activity">Activity</NavLink>}
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
