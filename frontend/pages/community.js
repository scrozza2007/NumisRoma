import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';
import { LockKeyhole, Search, UsersRound } from 'lucide-react';
import { apiClient } from '../utils/apiClient';

const Community = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [recommendedUsers, setRecommendedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const { user, isLoading: authLoading } = useContext(AuthContext);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?message=You must be logged in to access community features');
    }
  }, [user, authLoading, router]);

  const fetchRecommendedUsers = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await apiClient.get('/api/users/recommended');
      setRecommendedUsers(data);
      setUsers([]);
    } catch (error) {
      setRecommendedUsers([]);
      setUsers([]);
      if (error.status !== 404) {
        setNotification({ show: true, message: 'Unable to load recommended users. Please refresh.', type: 'error' });
        setTimeout(() => setNotification({ show: false, message: '', type: '' }), 5000);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  const searchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.get(`/api/users?search=${encodeURIComponent(searchTerm)}`);
      setUsers(Array.isArray(data) ? data : data.users || []);
      setRecommendedUsers([]);
    } catch {}
    finally { setLoading(false); }
  }, [searchTerm]);

  useEffect(() => {
    if (!searchTerm && user && !authLoading) fetchRecommendedUsers();
  }, [user, authLoading, searchTerm, fetchRecommendedUsers]);

  useEffect(() => {
    if (!user || authLoading) return;
    const timer = setTimeout(() => {
      if (searchTerm) searchUsers(); else fetchRecommendedUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, user, authLoading, searchUsers, fetchRecommendedUsers]);

  const toggleFollow = async (userId, currentStatus) => {
    if (!user) { router.push('/login'); return; }
    try {
      let newStatus;
      if (currentStatus === 'accepted' || currentStatus === 'pending') {
        await apiClient.delete(`/api/users/${userId}/unfollow`);
        newStatus = 'none';
      } else {
        const data = await apiClient.post(`/api/users/${userId}/follow`);
        newStatus = data.followStatus ?? 'accepted';
      }
      const update = (list) => list.map((u) =>
        u._id === userId ? { ...u, isFollowing: newStatus === 'accepted', followStatus: newStatus } : u
      );
      setUsers(update(users));
      setRecommendedUsers(update(recommendedUsers));
      const msg = currentStatus === 'accepted' ? 'Unfollowed successfully'
        : currentStatus === 'pending' ? 'Follow request cancelled'
        : newStatus === 'pending' ? 'Follow request sent'
        : 'Now following';
      setNotification({ show: true, message: msg, type: 'success' });
      setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
    } catch {
      setNotification({ show: true, message: 'An error occurred. Please try again.', type: 'error' });
      setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
    }
  };

  const UserCard = ({ user: profileUser }) => {
    const initials = profileUser.username.charAt(0).toUpperCase();
    const r = useRouter();
    const followStatus = profileUser.followStatus ?? (profileUser.isFollowing ? 'accepted' : 'none');
    const btnLabel = followStatus === 'accepted' ? 'Following' : followStatus === 'pending' ? 'Requested' : '+ Follow';
    return (
      <div
        className="flex items-center justify-between p-4 cursor-pointer transition-colors duration-150 bg-card border border-border rounded-lg hover:border-border-strong"
        onClick={() => r.push(`/profile?id=${profileUser._id}`)}
      >
        <div className="flex items-center gap-4">
          {profileUser.avatar ? (
            <Image src={profileUser.avatar} alt={profileUser.username} width={44} height={44} className="rounded-full object-cover border border-border" />
          ) : (
            <div className="w-11 h-11 rounded-full flex items-center justify-center font-sans font-semibold text-base bg-amber-bg text-amber">
              {initials}
            </div>
          )}
          <div>
            <p className="font-sans text-sm font-semibold text-text-primary">@{profileUser.username}</p>
            {profileUser.isPrivate && (
              <p className="font-sans text-xs text-text-muted flex items-center gap-1">
                <LockKeyhole className="w-3 h-3" />
                Private
              </p>
            )}
          </div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); toggleFollow(profileUser._id, followStatus); }}
          className={`font-sans text-sm px-4 py-1.5 rounded-md transition-colors duration-150 ${
            followStatus === 'accepted'
              ? 'border border-border bg-card text-text-secondary hover:bg-surface-alt hover:text-text-primary'
              : followStatus === 'pending'
              ? 'border border-amber bg-amber-bg text-amber'
              : 'border border-amber bg-amber-bg text-amber hover:bg-amber hover:text-[#fdf8f0]'
          }`}
        >
          {btnLabel}
        </button>
      </div>
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber border-t-transparent" />
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="min-h-screen bg-canvas">
      <Head>
        <title>Community — NumisRoma</title>
        <meta name="description" content="Connect with other numismatic collectors on NumisRoma" />
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

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-8">
          <p className="font-sans text-xs font-medium tracking-widest uppercase mb-3 text-amber">Community</p>
          <h1 className="font-display font-semibold text-4xl mb-2 text-text-primary">Collectors</h1>
          <p className="font-sans text-sm text-text-muted">Find and follow other Roman coin collectors.</p>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <input
            type="text"
            placeholder="Search by username or email…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 font-sans text-sm bg-card border border-border rounded-md outline-none focus:border-amber transition-colors duration-150 text-text-primary"
          />
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted" />
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber border-t-transparent" />
          </div>
        ) : (
          <>
            {!searchTerm && recommendedUsers.length > 0 && (
              <div>
                <h2 className="font-display font-semibold text-xl mb-4 text-text-primary">Suggested collectors</h2>
                <div className="space-y-3">
                  {recommendedUsers.map((u) => <UserCard key={u._id} user={u} />)}
                </div>
              </div>
            )}

            {!searchTerm && recommendedUsers.length === 0 && (
              <div className="text-center py-16">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 bg-surface-alt">
                  <UsersRound className="w-6 h-6 text-text-muted" />
                </div>
                <p className="font-sans text-sm text-text-muted">No recommendations yet. Search for collectors above.</p>
              </div>
            )}

            {searchTerm && (
              <div>
                <h2 className="font-display font-semibold text-xl mb-4 text-text-primary">Search results</h2>
                {users.length > 0 ? (
                  <div className="space-y-3">
                    {users.map((u) => <UserCard key={u._id} user={u} />)}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="font-sans text-sm text-text-muted">No users found for &quot;{searchTerm}&quot;</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Community;
