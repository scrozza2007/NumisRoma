import React, { useState, useContext, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { AuthContext } from '../context/AuthContext';
import Image from 'next/image';
import { Bell, Bookmark, LogOut, Menu, MessageCircle, Settings, UserRound, X } from 'lucide-react';
import { apiClient } from '../utils/apiClient';
import BrandLockup from './BrandLockup';

const POLL_INTERVAL_MS = 30000;

// Format relative time for notification timestamps.
const relativeTime = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

const notifText = (n) => {
  const sender = n.sender?.username ?? 'Someone';
  switch (n.type) {
    case 'follow_request':    return `${sender} requested to follow you`;
    case 'follow_accepted':   return `${sender} accepted your follow request`;
    case 'new_follower':      return `${sender} started following you`;
    case 'new_message':       return `${sender} sent you a message`;
    default:                  return `${sender} sent a notification`;
  }
};

const Badge = ({ count }) => {
  if (!count) return null;
  return (
    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white font-sans font-bold text-[10px] px-1 leading-none">
      {count > 99 ? '99+' : count}
    </span>
  );
};

const Navbar = () => {
  const { user, logout, isLoading } = useContext(AuthContext);
  const router = useRouter();
  const isAuthPage = router.pathname === '/login' || router.pathname === '/register';
  const [isAccountSidebarOpen, setIsAccountSidebarOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isBellOpen, setIsBellOpen] = useState(false);
  const bellTimeoutRef = useRef(null);
  const bellRef = useRef(null);

  // Badge count for the bell icon.
  const [notifCount, setNotifCount] = useState(0);

  // Last 10 notifications for the dropdown.
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [actingOnRequest, setActingOnRequest] = useState(null);

  const sseRef = useRef(null);
  const pollTimerRef = useRef(null);

  const fetchCounts = useCallback(async () => {
    if (!user) return;
    try {
      const notifData = await apiClient.get('/api/notifications/unread-count');
      setNotifCount(notifData.count ?? 0);
    } catch {}
  }, [user]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setNotifLoading(true);
    try {
      const data = await apiClient.get('/api/notifications?limit=10');
      setNotifications(data.notifications ?? []);
    } catch {}
    finally { setNotifLoading(false); }
  }, [user]);

  // SSE connection with polling fallback.
  useEffect(() => {
    if (!user || isAuthPage) return;

    let es;
    let fallbackTimer;
    let connected = false;

    const startPolling = () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      pollTimerRef.current = setInterval(fetchCounts, POLL_INTERVAL_MS);
    };

    const connect = () => {
      try {
        es = new EventSource(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/stream`, { withCredentials: true });
        sseRef.current = es;

        es.onopen = () => {
          connected = true;
          if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
        };

        es.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            if (typeof data.notifications === 'number') setNotifCount(data.notifications);
            // Broadcast to other components so they can refresh without their own SSE.
            try {
              new BroadcastChannel('numisroma:notifications').postMessage(data);
            } catch {}
          } catch {}
        };

        es.onerror = () => {
          connected = false;
          es.close();
          startPolling();
          // Retry SSE after 60s.
          fallbackTimer = setTimeout(connect, 60000);
        };
      } catch {
        startPolling();
      }
    };

    fetchCounts();
    connect();

    return () => {
      if (es) es.close();
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, [user, isAuthPage, fetchCounts]);

  useEffect(() => { setIsAccountSidebarOpen(false); }, [user]);
  useEffect(() => () => {
    if (bellTimeoutRef.current) clearTimeout(bellTimeoutRef.current);
  }, []);

  useEffect(() => {
    const close = () => { setIsMobileMenuOpen(false); setIsBellOpen(false); setIsAccountSidebarOpen(false); };
    router.events.on('routeChangeStart', close);
    return () => router.events.off('routeChangeStart', close);
  }, [router.events]);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen || isAccountSidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen, isAccountSidebarOpen]);

  // Close bell dropdown on outside click.
  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setIsBellOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const getUserInitial = () => user?.username?.charAt(0).toUpperCase() ?? '';

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleBellClick = () => {
    if (!isBellOpen) {
      fetchNotifications();
      setIsBellOpen(true);
    } else {
      setIsBellOpen(false);
    }
  };

  const markAllRead = async () => {
    try {
      await apiClient.put('/api/notifications/read-all');
      setNotifCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch {}
  };

  const markNotifRead = async (n) => {
    if (!n.isRead) {
      try {
        await apiClient.put(`/api/notifications/${n._id}/read`);
        setNotifCount(c => Math.max(0, c - 1));
        setNotifications(prev => prev.map(x => x._id === n._id ? { ...x, isRead: true } : x));
      } catch {}
    }
  };

  const handleNotifClick = async (n) => {
    await markNotifRead(n);
    setIsBellOpen(false);
    if (n.type === 'new_message') {
      const convId = n.relatedConversation?._id || n.relatedConversation;
      router.push(convId ? `/messages?conversationId=${convId}` : '/messages');
    } else if (n.sender?._id) {
      router.push(`/profile?id=${n.sender._id}`);
    }
  };

  const handleAcceptRequest = async (e, n) => {
    e.stopPropagation();
    setActingOnRequest(n._id);
    try {
      await apiClient.post(`/api/users/${n.sender._id}/follow-request/accept`);
      setNotifications(prev => prev.filter(x => x._id !== n._id));
      // SSE will push the new count; also fetch immediately for fast feedback.
      fetchCounts();
    } catch {}
    finally { setActingOnRequest(null); }
  };

  const handleDeclineRequest = async (e, n) => {
    e.stopPropagation();
    setActingOnRequest(n._id);
    try {
      await apiClient.post(`/api/users/${n.sender._id}/follow-request/decline`);
      setNotifications(prev => prev.filter(x => x._id !== n._id));
      fetchCounts();
    } catch {}
    finally { setActingOnRequest(null); }
  };

  const navLinks = [
    { label: 'Browse',      href: '/browse'      },
    { label: 'Community',   href: '/community'   },
    { label: 'Collections', href: '/collections' },
    { label: 'Donate',      href: '/donate'      },
  ];

  const isActive = (href) => router.pathname === href;
  const accountLinks = user ? [
    { label: 'Profile', href: `/profile?id=${user._id}`, Icon: UserRound },
    { label: 'Messages', href: '/messages', Icon: MessageCircle },
    { label: 'Wishlist', href: '/wishlist', Icon: Bookmark },
    { label: 'Notifications', href: '/notifications', badge: notifCount, Icon: Bell },
    { label: 'Settings', href: '/settings', Icon: Settings },
  ] : [];

  return (
    <header className="sticky top-0 z-50 bg-surface border-b border-border">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">

        {/* Logo */}
        <Link href="/" className="flex items-center flex-shrink-0 opacity-90 hover:opacity-100 transition-opacity duration-200">
          <BrandLockup priority />
        </Link>

        {/* Nav links — desktop only */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className={`font-sans text-sm font-medium transition-colors duration-200 ${
                isActive(href) ? 'text-text-primary font-medium' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Auth + hamburger */}
        <div className="flex items-center gap-3">
          {isLoading ? (
            <div className="w-9 h-9 rounded-full animate-pulse bg-surface-alt" />
          ) : user && !isAuthPage ? (
            <>
              {/* Bell icon */}
              <div className="relative" ref={bellRef}>
                <button
                  onClick={handleBellClick}
                  aria-label="Notifications"
                  className="relative w-9 h-9 flex items-center justify-center rounded-full text-text-secondary hover:text-text-primary hover:bg-surface-alt transition-colors duration-150"
                >
                  <Bell className="w-5 h-5" />
                  <Badge count={notifCount} />
                </button>

                {/* Notification dropdown */}
                {isBellOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 rounded-md z-50 animate-fade-in bg-card border border-border shadow-md overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                      <p className="font-sans font-semibold text-sm text-text-primary">Notifications</p>
                      {notifCount > 0 && (
                        <button
                          onClick={markAllRead}
                          className="font-sans text-xs text-amber hover:text-amber-hover transition-colors duration-150"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>

                    {/* List */}
                    <div className="max-h-80 overflow-y-auto divide-y divide-border">
                      {notifLoading ? (
                        <div className="flex justify-center py-8">
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-amber border-t-transparent" />
                        </div>
                      ) : notifications.length === 0 ? (
                        <p className="font-sans text-sm text-text-muted text-center py-8">No notifications yet</p>
                      ) : (
                        notifications.map(n => (
                          <div
                            key={n._id}
                            className={`flex items-start gap-3 px-4 py-3 ${!n.isRead ? 'border-l-2 border-amber' : ''} ${n.type !== 'follow_request' ? 'cursor-pointer hover:bg-surface-alt transition-colors duration-150' : 'bg-surface-alt/40'}`}
                            onClick={n.type !== 'follow_request' ? () => handleNotifClick(n) : undefined}
                          >
                            {/* Sender avatar */}
                            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-amber-bg overflow-hidden">
                              {n.sender?.avatar ? (
                                <Image src={n.sender.avatar} alt={n.sender.username} width={32} height={32} className="rounded-full object-cover" />
                              ) : (
                                <span className="font-sans font-semibold text-xs text-amber">
                                  {n.sender?.username?.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-sans text-xs text-text-primary leading-relaxed">{notifText(n)}</p>
                              <p className="font-sans text-[10px] text-text-muted mt-0.5">{relativeTime(n.createdAt)}</p>
                              {n.type === 'follow_request' && (
                                <div className="flex gap-1.5 mt-2">
                                  <button
                                    onClick={(e) => handleAcceptRequest(e, n)}
                                    disabled={actingOnRequest === n._id}
                                    className="px-3 py-1 font-sans text-xs font-semibold rounded bg-amber text-[#fdf8f0] hover:bg-amber-hover transition-colors duration-150 disabled:opacity-50"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={(e) => handleDeclineRequest(e, n)}
                                    disabled={actingOnRequest === n._id}
                                    className="px-3 py-1 font-sans text-xs rounded border border-border bg-card text-text-secondary hover:bg-surface-alt transition-colors duration-150 disabled:opacity-50"
                                  >
                                    Decline
                                  </button>
                                </div>
                              )}
                            </div>
                            {!n.isRead && n.type !== 'follow_request' && <span className="w-2 h-2 rounded-full bg-amber shrink-0 mt-1.5" />}
                          </div>
                        ))
                      )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-border">
                      <Link
                        href="/notifications"
                        onClick={() => setIsBellOpen(false)}
                        className="block text-center font-sans text-xs text-amber hover:text-amber-hover py-2.5 transition-colors duration-150"
                      >
                        See all notifications
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Account sidebar trigger */}
              <div className="relative">
                <button
                  onClick={() => setIsAccountSidebarOpen(true)}
                  aria-label="Open account menu"
                  className="flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-amber/30 rounded-full"
                >
                  {user.profileImage ? (
                    <Image
                      src={user.profileImage}
                      alt="Profile"
                      width={36}
                      height={36}
                      className="w-9 h-9 rounded-full object-cover border border-border hover:opacity-90 transition-opacity duration-200"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full flex items-center justify-center font-sans font-semibold text-sm bg-amber text-[#fdf8f0]">
                      {getUserInitial()}
                    </div>
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="font-sans text-sm font-medium text-text-secondary hover:text-text-primary transition-colors duration-200"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="font-sans text-sm font-medium px-4 py-2 rounded bg-amber text-[#fdf8f0] hover:bg-amber-hover transition-colors duration-200"
              >
                Get started
              </Link>
            </>
          )}

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setIsMobileMenuOpen(v => !v)}
            aria-label="Open navigation menu"
            className="md:hidden flex items-center justify-center w-9 h-9 rounded text-text-secondary hover:text-text-primary transition-colors duration-150"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Account sidebar overlay */}
      {isAccountSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-[rgba(46,40,32,0.4)]"
          onClick={() => setIsAccountSidebarOpen(false)}
        />
      )}

      {/* Account sidebar */}
      {isAccountSidebarOpen && user && !isAuthPage && (
        <aside
          className="fixed top-0 right-0 h-full w-[min(360px,calc(100vw-32px))] z-50 flex flex-col bg-surface border-l border-border shadow-xl animate-fade-in"
        >
          <div className="flex items-center justify-between px-5 h-16 border-b border-border shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {user.profileImage ? (
                <Image
                  src={user.profileImage}
                  alt="Profile"
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full object-cover border border-border"
                />
              ) : (
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-sans font-semibold text-sm bg-amber text-[#fdf8f0]">
                  {getUserInitial()}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-sans text-sm font-semibold truncate text-text-primary">{user.username}</p>
                <p className="font-sans text-xs truncate mt-0.5 text-text-muted">{user.email}</p>
              </div>
            </div>
            <button
              onClick={() => setIsAccountSidebarOpen(false)}
              aria-label="Close account menu"
              className="w-9 h-9 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-surface-alt transition-colors duration-150"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-5 space-y-1">
            {accountLinks.map(({ label, href, badge, Icon }) => (
              <Link
                key={label}
                href={href}
                onClick={() => setIsAccountSidebarOpen(false)}
                className={`flex items-center justify-between gap-3 px-4 py-3 rounded-md font-sans text-sm transition-colors duration-150 ${
                  isActive(href)
                    ? 'bg-amber-bg text-amber'
                    : 'text-text-secondary hover:bg-surface-alt hover:text-text-primary'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{label}</span>
                </span>
                {badge > 0 && (
                  <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white font-sans font-bold text-[10px] px-1">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          <div className="px-4 py-4 border-t border-border shrink-0">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-md font-sans text-sm text-red-700 hover:bg-red-50 transition-colors duration-150"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              Sign out
            </button>
          </div>
        </aside>
      )}

      {/* Mobile drawer overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-[rgba(46,40,32,0.4)] md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`fixed top-0 left-0 h-full w-72 z-50 flex flex-col bg-surface border-r border-border shadow-xl transition-transform duration-300 md:hidden ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-border shrink-0">
          <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="opacity-90">
            <BrandLockup priority />
          </Link>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close menu"
            className="w-8 h-8 flex items-center justify-center rounded text-text-muted hover:text-text-primary transition-colors duration-150"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navLinks.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className={`block px-4 py-2.5 rounded-md font-sans text-sm font-medium transition-colors duration-150 ${
                isActive(href)
                  ? 'bg-amber-bg text-amber'
                  : 'text-text-secondary hover:bg-surface-alt hover:text-text-primary'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Drawer auth actions */}
        <div className="px-3 py-4 border-t border-border space-y-2 shrink-0">
          {isLoading ? (
            <div className="h-9 rounded animate-pulse bg-surface-alt" />
          ) : user && !isAuthPage ? (
            <>
              <div className="px-4 py-2 mb-1">
                <p className="font-sans text-sm font-medium text-text-primary truncate">{user.username}</p>
                <p className="font-sans text-xs text-text-muted truncate">{user.email}</p>
              </div>
              {[
                { label: 'Notifications', href: '/notifications', badge: notifCount },
                { label: 'Profile',  href: `/profile?id=${user._id}` },
                { label: 'Messages', href: '/messages' },
                { label: 'Wishlist', href: '/wishlist' },
                { label: 'Settings', href: '/settings' },
              ].map(({ label, href, badge }) => (
                <Link
                  key={label}
                  href={href}
                  className="flex items-center justify-between px-4 py-2.5 rounded-md font-sans text-sm text-text-secondary hover:bg-surface-alt hover:text-text-primary transition-colors duration-150"
                >
                  {label}
                  {badge > 0 && (
                    <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white font-sans font-bold text-[10px] px-1">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2.5 rounded-md font-sans text-sm text-red-700 hover:bg-red-50 transition-colors duration-150"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="block px-4 py-2.5 rounded-md font-sans text-sm font-medium text-text-secondary hover:bg-surface-alt hover:text-text-primary transition-colors duration-150"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="block px-4 py-2.5 rounded-md font-sans text-sm font-semibold bg-amber text-[#fdf8f0] hover:bg-amber-hover transition-colors duration-200 text-center"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
