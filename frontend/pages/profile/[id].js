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
        if (!res.ok) throw new Error('Error retrieving profile');
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
        if (!res.ok) throw new Error('Error retrieving collections');
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
      if (!res.ok) throw new Error('Error in follow/unfollow');
      setProfile({ ...profile, isFollowing: !profile.isFollowing });
      setNotification({ show: true, message: profile.isFollowing ? "You no longer follow this user" : "You now follow this user", type: 'success' });
      setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
    } catch (err) {
      setNotification({ show: true, message: 'Error. Please try again.', type: 'error' });
      setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-yellow-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-gray-500">Profile not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Head>
        <title>{profile.username} - Profile</title>
      </Head>

      {notification.show && (
        <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white transition-all duration-300`}>
          {notification.message}
        </div>
      )}

      {/* Banner grande */}
      <div className="w-full h-56 md:h-64 bg-gradient-to-b from-yellow-50 to-white relative flex items-end">
        {/* Qui puoi mettere un'immagine di copertina se vuoi */}
      </div>

      {/* Card profilo sovrapposta */}
      <div className="max-w-6xl mx-auto px-4 relative">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 -mt-20 md:-mt-24 p-4 md:p-8 flex flex-col md:flex-row items-center md:items-end">
          {/* Foto profilo */}
          <div className="relative z-10 -mt-20 md:-mt-24 md:ml-4">
            <div className="w-36 h-36 md:w-40 md:h-40 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gray-100 flex items-center justify-center">
              {profile.avatar ? (
                <img src={profile.avatar} alt={profile.username} className="w-full h-full object-cover" />
              ) : (
                <span className="text-5xl text-gray-400 font-bold">{profile.username.charAt(0).toUpperCase()}</span>
              )}
            </div>
          </div>

          {/* Info utente e stats */}
          <div className="flex-1 flex flex-col md:flex-row items-center md:items-end md:justify-between w-full md:ml-8 mt-4 md:mt-0">
            <div className="flex flex-col items-center md:items-start">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{profile.username}</h1>
              <div className="flex space-x-8 mt-2">
                <div className="text-center md:text-left">
                  <div className="font-bold text-lg text-gray-900">{profile.followersCount || 0}</div>
                  <div className="text-sm text-gray-500">Followers</div>
                </div>
                <div className="text-center md:text-left">
                  <div className="font-bold text-lg text-gray-900">{profile.followingCount || 0}</div>
                  <div className="text-sm text-gray-500">Following</div>
                </div>
              </div>
            </div>
            {/* Pulsanti azione */}
            {user && user.userId !== profile._id && (
              <div className="flex space-x-3 mt-4 md:mt-0 md:ml-auto">
                <button 
                  onClick={handleFollow} 
                  disabled={followLoading} 
                  className="px-6 py-2 rounded-full font-medium text-sm bg-yellow-500 text-white hover:bg-yellow-600 shadow-sm transition-colors cursor-pointer"
                >
                  {profile.isFollowing ? 'Following' : 'Follow'}
                </button>
                <button className="px-6 py-2 rounded-full font-medium text-sm bg-gray-200 text-gray-700 hover:bg-gray-300 shadow-sm border border-gray-300 transition-colors cursor-pointer">
                  Message
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bio */}
        <div className="bg-white rounded-xl shadow border border-gray-200 mt-4 p-4 text-center md:text-left">
          {profile.bio || <span className="italic text-gray-400">No bio</span>}
        </div>

        {/* Sezione collezioni */}
        <div className="mt-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Collections</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {collections.length > 0 ? (
              collections.map((col) => (
                <div key={col._id} className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 flex flex-col items-center border border-gray-200">
                  <div className="w-28 h-28 rounded-full bg-yellow-100 flex items-center justify-center mb-4 overflow-hidden border border-gray-200">
                    {col.image ? (
                      <img src={col.image} alt={col.name} className="w-full h-full object-cover" />
                    ) : (
                      <img src="/coin-placeholder.png" alt="placeholder" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="font-medium text-gray-900 text-center">{col.name}</div>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-gray-500">No collections available.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;