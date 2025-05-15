import React, { useEffect, useState, useContext } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { AuthContext } from '../../context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const ProfilePage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user, isLoading: authLoading } = useContext(AuthContext);

  const [profile, setProfile] = useState(null);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  // Recupera dati utente
  useEffect(() => {
    if (!id) return;
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/api/users/${id}/profile`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Errore nel recupero del profilo');
        const data = await res.json();
        setProfile(data);
      } catch (err) {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id]);

  // Recupera collezioni utente
  useEffect(() => {
    if (!id) return;
    const fetchCollections = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/api/collections/user/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Errore nel recupero delle collezioni');
        const data = await res.json();
        setCollections(data);
      } catch (err) {
        setCollections([]);
      }
    };
    fetchCollections();
  }, [id]);

  // Logica follow/unfollow
  const handleFollow = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    setFollowLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/users/${id}/${profile.isFollowing ? 'unfollow' : 'follow'}`, {
        method: profile.isFollowing ? 'DELETE' : 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Errore nel follow/unfollow');
      setProfile({ ...profile, isFollowing: !profile.isFollowing });
      setNotification({ show: true, message: profile.isFollowing ? "Non segui più l'utente" : "Ora segui l'utente", type: 'success' });
      setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
    } catch (err) {
      setNotification({ show: true, message: 'Errore. Riprova.', type: 'error' });
      setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-yellow-50 to-white">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-yellow-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Profilo non trovato.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-white flex flex-col">
      <Head>
        <title>{profile.username} - Profilo</title>
      </Head>

      {notification.show && (
        <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white transition-all duration-300`}>{notification.message}</div>
      )}

      {/* Avatar, username, bio, stats, pulsanti */}
      <div className="max-w-4xl mx-auto flex flex-col items-center mt-12 z-10 relative">
        <div className="w-40 h-40 rounded-full bg-gray-100 border-2 border-gray-300 shadow-lg overflow-hidden flex items-center justify-center">
          {profile.avatar ? (
            <img src={profile.avatar} alt={profile.username} className="w-full h-full object-cover" />
          ) : (
            <span className="text-6xl text-gray-400 font-bold">{profile.username.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mt-6 text-center">{profile.username}</h1>
        {user && user.userId !== profile._id && (
          <div className="flex space-x-3 mt-4 justify-center">
            <button onClick={handleFollow} disabled={followLoading} className="px-6 py-1.5 rounded-full font-medium text-sm bg-gray-200 text-gray-700 hover:bg-gray-300 shadow-sm border border-gray-300">{profile.isFollowing ? 'Segui già' : 'Segui'}</button>
            <button className="px-6 py-1.5 rounded-full font-medium text-sm bg-gray-200 text-gray-700 hover:bg-gray-300 shadow-sm border border-gray-300">Messaggio</button>
          </div>
        )}
        <div className="flex space-x-12 mt-6 justify-center">
          <div className="text-center">
            <div className="font-bold text-2xl text-gray-900">{profile.coinsCount || 0}</div>
            <div className="text-xs text-gray-500 mt-1">Coins</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-2xl text-gray-900">{profile.followersCount || 0}</div>
            <div className="text-xs text-gray-500 mt-1">Follower</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-2xl text-gray-900">{profile.followingCount || 0}</div>
            <div className="text-xs text-gray-500 mt-1">Following</div>
          </div>
        </div>
        <div className="mt-6 text-gray-700 text-center w-full max-w-xl">{profile.bio || <span className="italic text-gray-400">Nessuna bio</span>}</div>
      </div>

      {/* Separatore */}
      <div className="border-b border-gray-200 my-10 max-w-4xl mx-auto"></div>

      {/* Collezioni */}
      <div className="max-w-4xl mx-auto px-4 mt-0 w-full">
        <h2 className="text-2xl font-semibold mb-8 text-center">My Collections</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          {collections.length > 0 ? collections.map((col) => (
            <div key={col._id} className="bg-white rounded-xl shadow p-6 flex flex-col items-center border border-gray-200">
              <div className="w-28 h-28 rounded-full bg-yellow-100 flex items-center justify-center mb-4 overflow-hidden border border-gray-200">
                {col.image ? (
                  <img src={col.image} alt={col.name} className="w-full h-full object-cover" />
                ) : (
                  <img src="/coin-placeholder.png" alt="placeholder" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="font-medium text-gray-900 text-center mt-2">{col.name}</div>
            </div>
          )) : (
            <div className="col-span-3 text-center text-gray-400">Nessuna collezione trovata.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;