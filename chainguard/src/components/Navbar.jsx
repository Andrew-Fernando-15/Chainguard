import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { FiSearch, FiBell, FiSun, FiMoon, FiMenu, FiX, FiShield, FiLogOut } from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { notifications } from '../data/dummyData';

const links = [
  { to: '/', label: 'Home' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/upload', label: 'Upload' },
  { to: '/ai-detection', label: 'AI Detection' },
  { to: '/verify', label: 'Verify' },
  { to: '/custody', label: 'Custody' },
  { to: '/roles', label: 'Roles' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  const isLight = theme === 'light';

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 light:border-navy/10">
      <div className="glass-strong">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 lg:px-8">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue to-cyan">
              <FiShield className="text-navy light:text-white" />
            </span>
            <span className="text-frost light:text-navy">ChainGuard</span>
          </Link>

          <div className="hidden items-center gap-1 lg:flex">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-white/5 light:bg-navy/5 text-cyan'
                      : 'text-frost/70 light:text-navy/70 hover:text-frost light:hover:text-navy hover:bg-white/5 light:hover:bg-navy/5'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative hidden md:block">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-frost/40 light:text-navy/40" />
              <input
                type="text"
                placeholder="Search evidence ID..."
                className="w-48 rounded-lg border border-white/10 light:border-navy/10 bg-white/5 light:bg-navy/5 py-1.5 pl-9 pr-3 text-sm outline-none text-frost light:text-navy placeholder:text-frost/30 light:placeholder:text-navy/40 focus:border-cyan/50"
              />
            </div>

            <div className="relative">
              <button
                aria-label="Notifications"
                onClick={() => setNotifOpen((v) => !v)}
                className="relative rounded-lg p-2 text-frost/70 light:text-navy/70 hover:bg-white/5 light:hover:bg-navy/5 hover:text-frost light:hover:text-navy transition-colors"
              >
                <FiBell />
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-cyan" />
              </button>
              {notifOpen && (
                <div className="glass-strong absolute right-0 mt-2 w-72 rounded-xl p-2 shadow-xl light:border light:border-navy/10">
                  {notifications.map((n) => (
                    <div key={n.id} className="rounded-lg px-3 py-2 text-sm hover:bg-white/5 light:hover:bg-navy/5 transition-colors">
                      <p className="text-frost/90 light:text-navy/90">{n.text}</p>
                      <p className="text-xs text-frost/40 light:text-navy/40">{n.time} ago</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              aria-label="Toggle theme"
              onClick={toggleTheme}
              className="rounded-lg p-2 text-frost/70 light:text-navy/70 hover:bg-white/5 light:hover:bg-navy/5 hover:text-frost light:hover:text-navy transition-colors"
            >
              {isLight ? <FiMoon /> : <FiSun />}
            </button>

            {isAuthenticated ? (
              <div className="hidden items-center gap-2 lg:flex">
                <span className="text-sm text-frost/70 light:text-navy/80">Hi, {user?.name?.split(' ')[0]}</span>
                <button
                  onClick={handleLogout}
                  aria-label="Log out"
                  className="rounded-lg p-2 text-frost/70 light:text-navy/70 hover:bg-white/5 light:hover:bg-navy/5 hover:text-frost light:hover:text-navy transition-colors"
                >
                  <FiLogOut />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden rounded-lg bg-gradient-to-r from-blue to-cyan px-4 py-2 text-sm font-medium text-navy lg:block"
              >
                Sign In
              </Link>
            )}

            <button
              aria-label="Menu"
              onClick={() => setOpen((v) => !v)}
              className="rounded-lg p-2 text-frost/70 light:text-navy/70 hover:bg-white/5 light:hover:bg-navy/5 hover:text-frost light:hover:text-navy transition-colors lg:hidden"
            >
              {open ? <FiX /> : <FiMenu />}
            </button>
          </div>
        </nav>

        {open && (
          <div className="flex flex-col gap-1 border-t border-white/5 light:border-navy/10 px-5 py-3 lg:hidden">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-frost/70 light:text-navy/70 hover:bg-white/5 light:hover:bg-navy/5 hover:text-frost light:hover:text-navy transition-colors"
              >
                {l.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
