import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth';
import { canSeeAccounts, canSeeActivity, isMinistry, ROLE_LABEL } from '../roles';

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
          {isMinistry(user.role) && <NavLink to="/schools">Schools</NavLink>}
          {canSeeAccounts(user.role) && <NavLink to="/accounts">Accounts</NavLink>}
          {canSeeActivity(user.role) && <NavLink to="/activity">Activity</NavLink>}
          <NavLink to="/profile">My account</NavLink>
        </nav>
        <div className="who">
          <span>
            <b>{user.fullName}</b>
            <br />
            {ROLE_LABEL[user.role]}
            {user.school ? ` · ${user.school.name}` : ''}
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
