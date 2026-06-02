import React, { useState, useEffect, useContext } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { AuthContext } from '../context/AuthContext';
import { apiClient } from '../utils/apiClient';

const FollowRequestsPage = () => {
  const { user, isLoading: authLoading } = useContext(AuthContext);
  const router = useRouter();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    apiClient.get(`/api/users/${user._id}/follow-requests`)
      .then(data => setRequests(data.requests ?? []))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  }, [user]);

  const notify = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

  const accept = async (requesterId) => {
    setActing(requesterId);
    try {
      await apiClient.post(`/api/users/${requesterId}/follow-request/accept`);
      setRequests(prev => prev.filter(u => u._id !== requesterId));
      notify('Follow request accepted');
    } catch {
      notify('Error accepting request', 'error');
    } finally {
      setActing(null);
    }
  };

  const decline = async (requesterId) => {
    setActing(requesterId);
    try {
      await apiClient.post(`/api/users/${requesterId}/follow-request/decline`);
      setRequests(prev => prev.filter(u => u._id !== requesterId));
      notify('Follow request declined');
    } catch {
      notify('Error declining request', 'error');
    } finally {
      setActing(null);
    }
  };

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <Head>
        <title>Follow Requests — NumisRoma</title>
      </Head>

      {notification.show && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-md border animate-fade-in shadow-md ${
            notification.type === 'success'
              ? 'bg-success-bg border-success-border text-success-text'
              : 'bg-error-bg border-error-border text-error-text'
          }`}
        >
          <span className="font-sans text-sm">{notification.message}</span>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-full text-text-muted hover:text-text-primary hover:bg-surface-alt transition-colors duration-150"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="font-display font-semibold text-2xl text-text-primary">Follow Requests</h1>
            <p className="font-sans text-xs text-text-muted">{requests.length} pending</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber border-t-transparent" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-sans text-sm text-text-muted">No pending follow requests</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map(requester => (
              <div
                key={requester._id}
                className="flex items-center justify-between p-4 bg-card border border-border rounded-lg"
              >
                <button
                  onClick={() => router.push(`/profile?id=${requester._id}`)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 bg-amber-bg border border-border overflow-hidden">
                    {requester.avatar ? (
                      <Image src={requester.avatar} alt={requester.username} width={44} height={44} className="rounded-full object-cover" />
                    ) : (
                      <span className="font-display font-semibold text-base text-amber">
                        {requester.username.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-sans text-sm font-semibold text-text-primary">@{requester.username}</p>
                    {requester.bio && (
                      <p className="font-sans text-xs text-text-muted truncate max-w-[200px]">{requester.bio}</p>
                    )}
                  </div>
                </button>

                <div className="flex items-center gap-2 ml-3">
                  <button
                    onClick={() => accept(requester._id)}
                    disabled={acting === requester._id}
                    className="px-4 py-1.5 font-sans text-sm font-semibold rounded-md bg-amber text-[#fdf8f0] hover:bg-amber-hover transition-colors duration-150 disabled:opacity-50"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => decline(requester._id)}
                    disabled={acting === requester._id}
                    className="px-4 py-1.5 font-sans text-sm rounded-md border border-border bg-card text-text-secondary hover:bg-surface-alt transition-colors duration-150 disabled:opacity-50"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FollowRequestsPage;
