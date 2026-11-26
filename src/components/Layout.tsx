import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { canSeeAccounts, canSeeActivity, canSeeAttendance, canSeeInspections, canSeeResults, canSeeSms, canSeeStaff, canSeeStudents, isOversight, ROLE_LABEL } from '../roles';

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
          {isOversight(user.role) && <NavLink to="/dashboard">Dashboard</NavLink>}
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
          {user.role === 'SCHOOL_ADMIN' && <NavLink to="/notices">Notices to parents</NavLink>}
          {(isOversight(user.role) || user.role === 'SCHOOL_ADMIN') && <NavLink to="/archive">Archive</NavLink>}
          {isOversight(user.role) && <NavLink to="/sessions">Sessions and terms</NavLink>}
          {canSeeAccounts(user.role) && <NavLink to="/accounts">Accounts</NavLink>}
          {canSeeActivity(user.role) && <NavLink to="/activity">Activity</NavLink>}
          <NavLink to="/notifications">
            Notifications{unread > 0 && <span className="badge" aria-label={`${unread} unread`}>{unread > 99 ? '99+' : unread}</span>}
          </NavLink>
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
