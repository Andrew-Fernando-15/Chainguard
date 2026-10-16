import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { FiSearch, FiBell, FiSun, FiMoon, FiMenu, FiX, FiShield, FiLogOut, FiArrowRight, FiCheck } from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getAnomalies } from '../services/api';

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
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState(() => {
    try {
      const saved = localStorage.getItem('cg_read_notifs');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const notifRef = useRef(null);
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout, token } = useAuth();
  const navigate = useNavigate();

  const isOversightRole = user?.position === 'Judge' || user?.position === 'CBI' || user?.role === 'Judge' || user?.role === 'CBI';
  const visibleLinks = links.filter((l) => l.to !== '/ai-detection' || isOversightRole);

  // Close notifications on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch real anomaly alerts for the notification bell (Judge & CBI only)
  useEffect(() => {
    if (!token || !isOversightRole) return;

    const loadNotifs = () => {
      getAnomalies(token)
        .then((data) => {
          if (!Array.isArray(data)) return;
          const seen = new Set();
          const unique = [];

          for (const a of data) {
            const action = a.action || 'ALERT';
            const userName = a.userName || a.userId?.name || 'Unknown';
            const rule = (a.triggeredRules || [])[0] || a.details || 'Suspicious Activity';
            const caseId = a.caseId || '';

            // Deduplicate key: action + user + case + rule
            const key = `${action}:${userName}:${caseId}:${rule}`;
            if (!seen.has(key)) {
              seen.add(key);
              unique.push({
                id: a._id,
                action,
                userName,
                caseId,
                rule,
                text: `${action} by ${userName}`,
                detail: rule,
                time: timeAgoShort(a.createdAt),
              });
            }
          }

          setNotifications(unique.slice(0, 8));
        })
        .catch(() => {});
    };

    loadNotifs();
    const interval = setInterval(loadNotifs, 10000);
    return () => clearInterval(interval);
  }, [token, isOversightRole]);

  function markAllRead() {
    const allIds = new Set(notifications.map((n) => n.id));
    setReadIds(allIds);
    try {
      localStorage.setItem('cg_read_notifs', JSON.stringify([...allIds]));
    } catch {}
  }

  function handleNotifClick(notif) {
    // Mark this one as read
    const updated = new Set(readIds);
    updated.add(notif.id);
    setReadIds(updated);
    try {
      localStorage.setItem('cg_read_notifs', JSON.stringify([...updated]));
    } catch {}
    setNotifOpen(false);
    navigate('/ai-detection');
  }

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  function timeAgoShort(dateStr) {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return '<1m';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  }

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
            {visibleLinks.map((l) => (
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

            {/* Notification Bell Dropdown (Judge & CBI Only) */}
            {isOversightRole && (
              <div className="relative" ref={notifRef}>
              <button
                aria-label="Notifications"
                onClick={() => setNotifOpen((v) => !v)}
                className="relative rounded-lg p-2 text-frost/70 light:text-navy/70 hover:bg-white/5 light:hover:bg-navy/5 hover:text-frost light:hover:text-navy transition-colors"
              >
                <FiBell className="text-lg" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-[#0B132B] light:ring-white animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#0e1726]/95 light:bg-white p-3 shadow-2xl backdrop-blur-xl border border-white/10 light:border-navy/15 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between border-b border-white/5 light:border-navy/10 pb-2.5 px-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-frost light:text-navy">Alerts & Notifications</span>
                      {unreadCount > 0 && (
                        <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-medium text-rose-400 light:text-rose-600">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="flex items-center gap-1 text-xs text-cyan hover:underline"
                      >
                        <FiCheck className="text-xs" /> Mark read
                      </button>
                    )}
                  </div>

                  <div className="mt-2 max-h-72 overflow-y-auto space-y-1 divide-y divide-white/[0.03] light:divide-navy/[0.05]">
                    {notifications.length === 0 ? (
                      <div className="px-3 py-6 text-center text-sm text-frost/40 light:text-navy/40">
                        No security alerts reported
                      </div>
                    ) : (
                      notifications.map((n) => {
                        const isRead = readIds.has(n.id);
                        return (
                          <div
                            key={n.id}
                            onClick={() => handleNotifClick(n)}
                            className={`group cursor-pointer rounded-xl p-2.5 transition-colors ${
                              isRead
                                ? 'opacity-70 hover:opacity-100 hover:bg-white/5 light:hover:bg-navy/5'
                                : 'bg-white/[0.04] light:bg-navy/[0.04] hover:bg-white/[0.08] light:hover:bg-navy/[0.08]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`rounded px-1.5 py-0.5 font-mono text-[10px] uppercase font-semibold ${
                                  n.action.includes('DENIED')
                                    ? 'bg-rose-500/15 text-rose-400 light:text-rose-600'
                                    : n.action.includes('UPLOAD')
                                    ? 'bg-cyan/15 text-cyan'
                                    : 'bg-blue/15 text-blue'
                                }`}
                              >
                                {n.action}
                              </span>
                              <span className="text-[11px] text-frost/40 light:text-navy/40">{n.time} ago</span>
                            </div>
                            <p className="mt-1.5 text-xs font-medium text-frost/90 light:text-navy/90 line-clamp-1">
                              {n.userName} {n.caseId ? `• ${n.caseId}` : ''}
                            </p>
                            <p className="text-[11px] text-frost/50 light:text-navy/60 line-clamp-1 mt-0.5">
                              {n.detail}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="mt-2 border-t border-white/5 light:border-navy/10 pt-2 px-2">
                    <button
                      onClick={() => {
                        setNotifOpen(false);
                        navigate('/ai-detection');
                      }}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium text-cyan hover:bg-cyan/10 transition-colors"
                    >
                      View All in AI Detection <FiArrowRight className="text-xs" />
                    </button>
                  </div>
                </div>
              )}
            </div>
            )}

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
            {visibleLinks.map((l) => (
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
