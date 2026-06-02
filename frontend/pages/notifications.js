import React, { useState, useEffect, useContext, useCallback } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { AuthContext } from '../context/AuthContext';
import { apiClient } from '../utils/apiClient';

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
    case 'follow_request':  return `${sender} requested to follow you`;
    case 'follow_accepted': return `${sender} accepted your follow request`;
    case 'new_follower':    return `${sender} started following you`;
    case 'new_message':     return `${sender} sent you a message`;
    default:                return `${sender} sent a notification`;
  }
};

const NotificationsPage = () => {
  const { user, isLoading: authLoading } = useContext(AuthContext);
  const router = useRouter();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [actingOnRequest, setActingOnRequest] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const fetchPage = useCallback(async (pageNum, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const data = await apiClient.get(`/api/notifications?page=${pageNum}&limit=20`);
      setNotifications(prev => append ? [...prev, ...(data.notifications ?? [])] : (data.notifications ?? []));
      setHasMore(data.pagination?.hasMore ?? false);
    } catch {}
    finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchPage(1);
  }, [user, fetchPage]);

  // Listen on BroadcastChannel — the Navbar SSE connection broadcasts here,
  // so we refresh without opening a second SSE stream (which would kick the Navbar's).
  useEffect(() => {
    if (!user) return;
    let bc;
    try {
      bc = new BroadcastChannel('numisroma:notifications');
      bc.onmessage = () => fetchPage(1);
    } catch {}
    return () => { try { bc?.close(); } catch {} };
  }, [user, fetchPage]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchPage(next, true);
  };

  const markRead = async (n) => {
    if (!n.isRead) {
      try {
        await apiClient.put(`/api/notifications/${n._id}/read`);
        setNotifications(prev => prev.map(x => x._id === n._id ? { ...x, isRead: true } : x));
      } catch {}
    }
  };

  const handleClick = async (n) => {
    if (n.type === 'follow_request') return;
    await markRead(n);
    if (n.type === 'new_message') {
      router.push('/messages');
    } else if (n.sender?._id) {
      router.push(`/profile?id=${n.sender._id}`);
    }
  };

  const handleAccept = async (n) => {
    setActingOnRequest(n._id);
    try {
      await apiClient.post(`/api/users/${n.sender._id}/follow-request/accept`);
      await markRead(n);
      setNotifications(prev => prev.filter(x => x._id !== n._id));
    } catch {}
    finally { setActingOnRequest(null); }
  };

  const handleDecline = async (n) => {
    setActingOnRequest(n._id);
    try {
      await apiClient.post(`/api/users/${n.sender._id}/follow-request/decline`);
      await markRead(n);
      setNotifications(prev => prev.filter(x => x._id !== n._id));
    } catch {}
    finally { setActingOnRequest(null); }
  };

  const markAllRead = async () => {
    try {
      await apiClient.put('/api/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch {}
  };

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber border-t-transparent" />
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen bg-canvas">
      <Head>
        <title>Notifications — NumisRoma</title>
      </Head>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="font-sans text-xs font-medium tracking-widest uppercase mb-1 text-amber">Social</p>
            <h1 className="font-display font-semibold text-3xl text-text-primary">Notifications</h1>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="font-sans text-sm text-amber hover:text-amber-hover transition-colors duration-150"
            >
              Mark all as read
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber border-t-transparent" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-surface-alt">
              <svg className="w-7 h-7 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <p className="font-sans text-sm text-text-muted">No notifications yet</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden divide-y divide-border">
            {notifications.map(n => (
              <div
                key={n._id}
                onClick={() => handleClick(n)}
                className={`flex items-start gap-4 px-5 py-4 ${!n.isRead ? 'border-l-4 border-amber' : 'border-l-4 border-transparent'} ${n.type !== 'follow_request' ? 'cursor-pointer hover:bg-surface-alt transition-colors duration-150' : ''}`}
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-amber-bg overflow-hidden">
                  {n.sender?.avatar ? (
                    <Image src={n.sender.avatar} alt={n.sender.username} width={40} height={40} className="rounded-full object-cover" />
                  ) : (
                    <span className="font-sans font-semibold text-sm text-amber">
                      {n.sender?.username?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`font-sans text-sm leading-relaxed ${n.isRead ? 'text-text-secondary' : 'text-text-primary font-medium'}`}>
                    {notifText(n)}
                  </p>
                  <p className="font-sans text-xs text-text-muted mt-0.5">{relativeTime(n.createdAt)}</p>
                  {n.type === 'follow_request' && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleAccept(n)}
                        disabled={actingOnRequest === n._id}
                        className="px-4 py-1.5 font-sans text-sm font-semibold rounded-md bg-amber text-[#fdf8f0] hover:bg-amber-hover transition-colors duration-150 disabled:opacity-50"
                      >
                        {actingOnRequest === n._id ? 'Accepting…' : 'Accept'}
                      </button>
                      <button
                        onClick={() => handleDecline(n)}
                        disabled={actingOnRequest === n._id}
                        className="px-4 py-1.5 font-sans text-sm rounded-md border border-border bg-card text-text-secondary hover:bg-surface-alt transition-colors duration-150 disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>

                {!n.isRead && n.type !== 'follow_request' && <span className="w-2 h-2 rounded-full bg-amber shrink-0 mt-2" />}
              </div>
            ))}
          </div>
        )}

        {hasMore && (
          <div className="flex justify-center mt-6">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="px-6 py-2.5 font-sans text-sm font-semibold rounded-md border border-border bg-card text-text-secondary hover:border-border-strong transition-colors duration-150 disabled:opacity-50"
            >
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
