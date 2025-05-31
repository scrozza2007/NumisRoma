import React, { useEffect, useState, useContext } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { AuthContext } from '../context/AuthContext';
import Link from 'next/link';
import Image from 'next/image';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const ProfilePage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user, isLoading: authLoading } = useContext(AuthContext);

  const [profile, setProfile] = useState(null);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [activeTab, setActiveTab] = useState('collections');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioText, setBioText] = useState('');
  const [bioLoading, setBioLoading] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);

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
        setBioText(data.bio || '');
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

  // Recupera attività utente
  useEffect(() => {
    if (!id) return;
    const fetchActivities = async () => {
      setLoadingActivities(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/api/users/${id}/activity`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Error retrieving activities');
        const data = await res.json();
        setActivities(data);
      } catch (err) {
        console.error('Error loading activities:', err);
        setActivities([]);
      } finally {
        setLoadingActivities(false);
      }
    };
    fetchActivities();
  }, [id]);

  // Funzione per caricare i follower
  const loadFollowers = async () => {
    setLoadingFollowers(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token not found');
      }

      console.log('Fetching followers from:', `${API_URL}/api/users/${id}/followers`);
      
      const res = await fetch(`${API_URL}/api/users/${id}/followers`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await res.json();
          throw new Error(errorData.message || 'Error retrieving followers');
        } else {
          throw new Error(`Server error: ${res.status}`);
        }
      }

      const data = await res.json();
      console.log('Followers data:', data);
      setFollowers(data);
    } catch (err) {
      console.error('Error loading followers:', err);
      setNotification({
        show: true,
        message: err.message || 'Error loading followers',
        type: 'error'
      });
      setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
    } finally {
      setLoadingFollowers(false);
    }
  };

  // Funzione per caricare i following
  const loadFollowing = async () => {
    setLoadingFollowing(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token not found');
      }

      console.log('Fetching following from:', `${API_URL}/api/users/${id}/following`);
      
      const res = await fetch(`${API_URL}/api/users/${id}/following`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await res.json();
          throw new Error(errorData.message || 'Error retrieving following');
        } else {
          throw new Error(`Server error: ${res.status}`);
        }
      }

      const data = await res.json();
      console.log('Following data:', data);
      setFollowing(data);
    } catch (err) {
      console.error('Error loading following:', err);
      setNotification({
        show: true,
        message: err.message || 'Error loading following',
        type: 'error'
      });
      setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
    } finally {
      setLoadingFollowing(false);
    }
  };

  // Funzione per aprire la chat
  const handleOpenChat = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    setChatLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/messages/conversations/${id}`, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!res.ok) throw new Error('Error creating chat');
      
      const data = await res.json();
      // Redirect directly to specific chat using conversationId
      router.push(`/messages?conversationId=${data._id}`);
    } catch (err) {
      console.error('Error creating chat:', err);
      setNotification({ 
        show: true, 
        message: 'Error creating chat. Please try again.', 
        type: 'error' 
      });
      setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
    } finally {
      setChatLoading(false);
    }
  };

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
      
      // Aggiorna il profilo
      setProfile({ ...profile, isFollowing: !profile.isFollowing });
      
      // Se stiamo smettendo di seguire, rimuovi l'attività dalla lista
      if (profile.isFollowing) {
        setActivities(prevActivities => 
          prevActivities.filter(activity => activity.user._id !== user._id)
        );
      } else {
        // Se stiamo seguendo, aggiungi la nuova attività
        const newActivity = {
          type: 'follow',
          user: {
            _id: user._id,
            username: user.username,
            avatar: user.avatar
          },
          createdAt: new Date().toISOString()
        };
        setActivities(prevActivities => [newActivity, ...prevActivities]);
      }

      setNotification({ 
        show: true, 
        message: profile.isFollowing ? "You have stopped following this user" : "You have started following this user", 
        type: 'success' 
      });
      setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
    } catch (err) {
      setNotification({ show: true, message: 'Error. Please try again.', type: 'error' });
      setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
    } finally {
      setFollowLoading(false);
    }
  };

  // Handle bio update
  const saveBio = async () => {
    if (!user || user._id !== profile._id) return;
    
    setBioLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/auth/update-profile`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ bio: bioText })
      });
      
      if (!res.ok) {
        throw new Error('Failed to update biography');
      }
      
      setProfile({...profile, bio: bioText});
      setIsEditingBio(false);
      setNotification({ show: true, message: 'Biography updated successfully', type: 'success' });
      setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
    } catch (err) {
      console.error('Error updating bio:', err);
      setNotification({ show: true, message: 'Error updating biography. Please try again.', type: 'error' });
      setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
    } finally {
      setBioLoading(false);
    }
  };

  // Cancel bio editing
  const cancelBioEdit = () => {
    setBioText(profile.bio || '');
    setIsEditingBio(false);
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-500 border-t-transparent mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <svg className="w-20 h-20 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
        </svg>
        <p className="text-xl text-gray-700 font-medium">Profile not found</p>
        <p className="text-gray-500 mt-2">This user profile doesn&apos;t exist or may have been removed.</p>
        <Link href="/" className="mt-6 px-5 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors">
          Return to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>{profile.username} - NumisRoma Profile</title>
        <meta name="description" content={`Profile page of ${profile.username} on NumisRoma`} />
      </Head>

      {notification.show && (
        <div className={`fixed top-6 right-6 p-4 rounded-xl shadow-xl z-50 ${
          notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white transition-all duration-300 transform animate-fade-in flex items-center`}>
          <div className={`mr-3 p-1 rounded-full ${notification.type === 'success' ? 'bg-green-400' : 'bg-red-400'}`}>
            {notification.type === 'success' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            )}
          </div>
          {notification.message}
        </div>
      )}

      {/* Banner */}
      <div className="w-full h-64 md:h-80 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-yellow-50 via-yellow-50/50 to-gray-50"></div>
        <div className="absolute inset-0 bg-[url('/images/roman-pattern.png')] bg-repeat opacity-10"></div>
      </div>

      <div className="max-w-6xl mx-auto px-4 relative">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-xl -mt-24 md:-mt-32 overflow-hidden border border-gray-100">
          <div className="p-6 md:p-8 flex flex-col md:flex-row">
            {/* Profile Image */}
            <div className="flex justify-center md:justify-start">
              <div className="w-36 h-36 md:w-44 md:h-44 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                {profile.avatar ? (
                  <Image
                    src={profile.avatar}
                    alt={profile.username}
                    width={176}
                    height={176}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-yellow-50">
                    <span className="text-6xl text-yellow-500 font-bold">{profile.username.charAt(0).toUpperCase()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1 mt-6 md:mt-0 md:ml-8 flex flex-col items-center md:items-start">
              <div className="flex flex-col md:flex-row md:items-center w-full">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 text-center md:text-left">{profile.username}</h1>
                
                {/* Action Buttons */}
                {user && (
                  <div className="flex space-x-3 mt-4 md:mt-0 md:ml-auto">
                    {user._id === profile._id ? (
                      <Link
                        href="/settings"
                        className="px-5 py-2.5 rounded-xl font-medium bg-yellow-500 text-white hover:bg-yellow-600 shadow-sm transition-all duration-200 flex items-center cursor-pointer"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                        </svg>
                        Edit Profile
                      </Link>
                    ) : (
                      <>
                        <button 
                          onClick={handleFollow} 
                          disabled={followLoading} 
                          className={`px-5 py-2.5 rounded-xl font-medium text-white shadow-sm transition-all duration-200 flex items-center cursor-pointer ${
                            profile.isFollowing 
                              ? 'bg-gray-700 hover:bg-gray-800' 
                              : 'bg-yellow-500 hover:bg-yellow-600'
                          }`}
                        >
                          {followLoading ? (
                            <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                          ) : (
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              {profile.isFollowing ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                              )}
                            </svg>
                          )}
                          {profile.isFollowing ? 'Following' : 'Follow'}
                        </button>
                        <button 
                          onClick={handleOpenChat}
                          disabled={chatLoading}
                          className="px-5 py-2.5 rounded-xl font-medium bg-white text-gray-700 hover:bg-gray-100 shadow-sm border border-gray-200 transition-all duration-200 flex items-center cursor-pointer"
                        >
                          {chatLoading ? (
                            <div className="animate-spin w-5 h-5 border-2 border-gray-700 border-t-transparent rounded-full mr-2"></div>
                          ) : (
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
                            </svg>
                          )}
                          {chatLoading ? 'Apertura...' : 'Messaggio'}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Member Since */}
              <p className="text-gray-500 mt-2 text-center md:text-left">
                Member since {new Date(profile.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>

              {/* Stats */}
              <div className="flex justify-center md:justify-start space-x-12 mt-6 p-4 bg-gray-50 rounded-xl w-full md:w-auto">
                <div className="text-center cursor-pointer" onClick={() => {
                  setShowFollowersModal(true);
                  loadFollowers();
                }}>
                  <div className="font-bold text-2xl text-yellow-500">{profile.followersCount || 0}</div>
                  <div className="text-sm text-gray-500 uppercase tracking-wide font-medium">Followers</div>
                </div>
                <div className="text-center cursor-pointer" onClick={() => {
                  setShowFollowingModal(true);
                  loadFollowing();
                }}>
                  <div className="font-bold text-2xl text-yellow-500">{profile.followingCount || 0}</div>
                  <div className="text-sm text-gray-500 uppercase tracking-wide font-medium">Following</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-2xl text-yellow-500">{collections.length}</div>
                  <div className="text-sm text-gray-500 uppercase tracking-wide font-medium">Collections</div>
                </div>
              </div>

              {/* Bio */}
              <div className="mt-6 p-4 bg-gray-50 rounded-xl w-full">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium text-gray-900">Bio</h3>
                  {user && user._id === profile._id && !isEditingBio && (
                    <button 
                      onClick={() => setIsEditingBio(true)}
                      className="text-gray-500 hover:text-yellow-600 transition-colors cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                      </svg>
                    </button>
                  )}
                </div>
                
                {isEditingBio && user && user._id === profile._id ? (
                  <div>
                    <textarea
                      value={bioText}
                      onChange={(e) => setBioText(e.target.value)}
                      placeholder="Write something about yourself..."
                      className="w-full h-24 p-2 bg-gray-50 focus:outline-none focus:ring-0 border-none resize-none text-gray-700 leading-relaxed"
                      maxLength={500}
                    />
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-gray-500">{bioText.length}/500 characters</span>
                      <div className="flex space-x-2">
                        <button
                          onClick={cancelBioEdit}
                          disabled={bioLoading}
                          className="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={saveBio}
                          disabled={bioLoading}
                          className="px-3 py-1 text-sm text-white bg-yellow-500 rounded-lg hover:bg-yellow-600 transition-colors flex items-center cursor-pointer"
                        >
                          {bioLoading ? (
                            <>
                              <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full mr-1"></div>
                              Saving...
                            </>
                          ) : (
                            'Save'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-700 leading-relaxed">
                    <div dangerouslySetInnerHTML={{ __html: profile.bio || "This user hasn't added a bio yet." }} />
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-t border-gray-100 mt-4">
            <div className="flex">
              <button 
                className={`flex-1 py-4 px-6 font-medium text-center transition-all duration-200 cursor-pointer ${
                  activeTab === 'collections' 
                    ? 'text-yellow-500 border-b-2 border-yellow-500' 
                    : 'text-gray-500 hover:text-gray-800'
                }`}
                onClick={() => setActiveTab('collections')}
              >
                Collections
              </button>
              <button 
                className={`flex-1 py-4 px-6 font-medium text-center transition-all duration-200 cursor-pointer ${
                  activeTab === 'activity' 
                    ? 'text-yellow-500 border-b-2 border-yellow-500' 
                    : 'text-gray-500 hover:text-gray-800'
                }`}
                onClick={() => setActiveTab('activity')}
              >
                Activity
              </button>
            </div>
          </div>
        </div>

        {/* Collections Tab */}
        {activeTab === 'collections' && (
          <div className="mt-8 pb-16">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Collections</h2>
              {user && user._id === profile._id && (
                <Link href="/collections/new" className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                  </svg>
                  New Collection
                </Link>
              )}
            </div>
            
            {collections.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {collections.map((col) => (
                  <div key={col._id} className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden group">
                    <div className="h-48 bg-gray-100 relative overflow-hidden">
                      {col.image ? (
                        <Image
                          src={col.image}
                          alt={col.name}
                          width={192}
                          height={192}
                          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-yellow-50">
                          <Image
                            src="/images/coin-placeholder.jpg"
                            alt="Collection"
                            width={96}
                            height={96}
                            className="w-24 h-24 opacity-70"
                          />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
                        <div className="p-4 w-full">
                          <div className="text-white font-medium">{col.name}</div>
                          <div className="text-white/80 text-sm">{col.coins?.length || 0} coins</div>
                        </div>
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="font-bold text-gray-900">{col.name}</h3>
                      <p className="text-gray-500 text-sm mt-1 line-clamp-2">{col.description || "No description provided"}</p>
                      <Link 
                        href={`/collections/${col._id}`} 
                        className="mt-4 inline-flex items-center text-yellow-600 hover:text-yellow-700 font-medium"
                      >
                        View Collection
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center">
                <div className="w-20 h-20 mx-auto bg-yellow-50 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Collections Yet</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  {user && user._id === profile._id 
                    ? "Start your numismatic journey by creating your first collection."
                    : "This user hasn&apos;t created any collections yet."}
                </p>
                {user && user._id === profile._id && (
                  <Link href="/collections/new" className="mt-6 inline-block px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors">
                    Create Your First Collection
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="mt-8 pb-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Activities</h2>
            
            {loadingActivities ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-yellow-500 border-t-transparent mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading activities...</p>
              </div>
            ) : activities.length > 0 ? (
              <div className="space-y-6">
                {activities.map((activity, index) => (
                  <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-300">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 rounded-full bg-yellow-50 flex items-center justify-center ring-2 ring-yellow-100 flex-shrink-0">
                        {activity.user.avatar ? (
                          <Image
                            src={activity.user.avatar}
                            alt={activity.user.username}
                            width={48}
                            height={48}
                            className="rounded-full"
                          />
                        ) : (
                          <span className="text-xl font-bold text-yellow-500">{activity.user.username.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-gray-900 font-medium">
                              <span 
                                className="text-yellow-600 hover:text-yellow-700 cursor-pointer transition-colors duration-200"
                                onClick={() => router.push(`/profile?id=${activity.user._id}`)}
                              >
                                {activity.user.username}
                              </span> started following you
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              {new Date(activity.createdAt).toLocaleDateString('en-US', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <button 
                            onClick={() => router.push(`/profile?id=${activity.user._id}`)}
                            className="px-4 py-2 text-sm bg-yellow-50 text-yellow-600 hover:bg-yellow-100 rounded-lg font-medium transition-colors duration-200 flex items-center cursor-pointer"
                          >
                            <span>View Profile</span>
                            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center">
                <div className="w-24 h-24 mx-auto bg-yellow-50 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-12 h-12 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">No Recent Activities</h3>
                <p className="text-gray-500 max-w-md mx-auto text-lg">
                  There are no recent activities to show. Start following other users to see their activities here!
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modale Follower */}
      {showFollowersModal && (
        <div 
          className="fixed inset-0 backdrop-blur-sm bg-white/20 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowFollowersModal(false);
            }
          }}
        >
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-xl border border-white/20">
            <div className="p-4 border-b border-gray-200/50 flex justify-between items-center bg-white/80">
              <h3 className="text-xl font-bold text-gray-900">Followers</h3>
              <button 
                onClick={() => setShowFollowersModal(false)}
                className="text-gray-500 hover:text-gray-700 cursor-pointer transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(80vh-80px)] bg-white/80">
              {loadingFollowers ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-yellow-500 border-t-transparent mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading followers...</p>
                </div>
              ) : followers.length > 0 ? (
                <div className="divide-y divide-gray-100/50">
                  {followers.map((follower) => (
                    <div key={follower._id} className="p-4 flex items-center hover:bg-white/90 cursor-pointer transition-colors" onClick={() => {
                      setShowFollowersModal(false);
                      router.push(`/profile?id=${follower._id}`);
                    }}>
                      <div className="w-10 h-10 rounded-full bg-yellow-50 flex items-center justify-center mr-3 ring-1 ring-white/50">
                        {follower.avatar ? (
                          <Image
                            src={follower.avatar}
                            alt={follower.username}
                            width={40}
                            height={40}
                            className="rounded-full"
                          />
                        ) : (
                          <span className="text-lg font-bold text-yellow-500">{follower.username.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{follower.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  No followers yet
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modale Following */}
      {showFollowingModal && (
        <div 
          className="fixed inset-0 backdrop-blur-sm bg-white/20 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowFollowingModal(false);
            }
          }}
        >
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-xl border border-white/20">
            <div className="p-4 border-b border-gray-200/50 flex justify-between items-center bg-white/80">
              <h3 className="text-xl font-bold text-gray-900">Following</h3>
              <button 
                onClick={() => setShowFollowingModal(false)}
                className="text-gray-500 hover:text-gray-700 cursor-pointer transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(80vh-80px)] bg-white/80">
              {loadingFollowing ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-yellow-500 border-t-transparent mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading following...</p>
                </div>
              ) : following.length > 0 ? (
                <div className="divide-y divide-gray-100/50">
                  {following.map((followed) => (
                    <div key={followed._id} className="p-4 flex items-center hover:bg-white/90 cursor-pointer transition-colors" onClick={() => {
                      setShowFollowingModal(false);
                      router.push(`/profile?id=${followed._id}`);
                    }}>
                      <div className="w-10 h-10 rounded-full bg-yellow-50 flex items-center justify-center mr-3 ring-1 ring-white/50">
                        {followed.avatar ? (
                          <Image
                            src={followed.avatar}
                            alt={followed.username}
                            width={40}
                            height={40}
                            className="rounded-full"
                          />
                        ) : (
                          <span className="text-lg font-bold text-yellow-500">{followed.username.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{followed.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  Not following anyone yet
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;