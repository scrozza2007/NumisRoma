import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useRouter } from 'next/router';
import Head from 'next/head';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const Community = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [recommendedUsers, setRecommendedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user, isLoading: authLoading } = useContext(AuthContext);
  const router = useRouter();

  // Check authentication on startup
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Load recommended users on startup
  useEffect(() => {
    if (!searchTerm && user && !authLoading) {
      fetchRecommendedUsers();
    }
  }, [user, authLoading]);

  // Search users when search term changes
  useEffect(() => {
    if (!user || authLoading) return;

    const delayDebounceFn = setTimeout(() => {
      if (searchTerm) {
        searchUsers();
      } else {
        fetchRecommendedUsers();
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, user, authLoading]);

  const searchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('You are not authenticated');
      }
      
      const response = await fetch(`${API_URL}/api/users?search=${encodeURIComponent(searchTerm)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Error searching for users');
      }

      const data = await response.json();
      setUsers(data);
      setRecommendedUsers([]);
    } catch (error) {
      console.error('Error searching for users:', error);
      if (error.message === 'You are not authenticated') {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendedUsers = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('You are not authenticated');
      }

      const response = await fetch(`${API_URL}/api/users/recommended`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Error retrieving recommended users');
      }
      
      const data = await response.json();
      setRecommendedUsers(data);
      setUsers([]);
    } catch (error) {
      console.error('Error retrieving recommended users:', error);
      if (error.message === 'You are not authenticated') {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleFollow = async (userId, isFollowing) => {
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('You are not authenticated');
      }

      const response = await fetch(`${API_URL}/api/users/${userId}/${isFollowing ? 'unfollow' : 'follow'}`, {
        method: isFollowing ? 'DELETE' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Error following/unfollowing user');
      }

      // Update users state
      const updateUsers = (userList) =>
        userList.map((u) =>
          u._id === userId ? { ...u, isFollowing: !isFollowing } : u
        );

      setUsers(updateUsers(users));
      setRecommendedUsers(updateUsers(recommendedUsers));
    } catch (error) {
      console.error('Error following/unfollowing user:', error);
      if (error.message === 'You are not authenticated') {
        router.push('/login');
      }
    }
  };

  const UserCard = ({ user: profileUser }) => {
    const initials = profileUser.username.charAt(0).toUpperCase();

    return (
      <div className="bg-white rounded-xl shadow-lg p-6 transform transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {profileUser.avatar ? (
              <img
                src={profileUser.avatar}
                alt={profileUser.username}
                className="w-14 h-14 rounded-full object-cover border-2 border-white transition-all duration-300 ease-in-out transform group-hover:scale-110 group-hover:border-yellow-300 group-hover:shadow-xl"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center font-semibold text-2xl border-2 border-gray-100 transition-all duration-300 ease-in-out transform group-hover:scale-110 group-hover:bg-gray-50 group-hover:shadow-xl">
                {initials}
              </div>
            )}
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">@{profileUser.username}</h3>
              <p className="text-sm text-gray-500">{profileUser.email}</p>
            </div>
          </div>
          <button
            onClick={() => toggleFollow(profileUser._id, profileUser.isFollowing)}
            className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105 ${
              profileUser.isFollowing
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-yellow-500 text-black hover:bg-yellow-400'
            }`}
          >
            {profileUser.isFollowing ? (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Following</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Follow</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  // If we're still loading the authentication state, show a loader
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-yellow-500 border-t-transparent"></div>
      </div>
    );
  }

  // If there's no authenticated user, show nothing (will be redirected)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-white">
      <Head>
        <title>Community - NumisRoma</title>
        <meta name="description" content="Connect with other numismatic enthusiasts on NumisRoma" />
      </Head>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Community</h1>
          <p className="text-gray-600">Connect with other numismatic enthusiasts</p>
        </div>

        <div className="mb-8">
          <div className="relative">
            <svg 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <input
              type="text"
              placeholder="Search users by username or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-300"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-yellow-500 border-t-transparent"></div>
          </div>
        ) : (
          <>
            {!searchTerm && recommendedUsers.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Recommended Users</h2>
                <div className="grid gap-4">
                  {recommendedUsers.map((user) => (
                    <UserCard key={user._id} user={user} />
                  ))}
                </div>
              </div>
            )}

            {searchTerm && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Search Results</h2>
                <div className="grid gap-4">
                  {users.map((user) => (
                    <UserCard key={user._id} user={user} />
                  ))}
                </div>
                {users.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <p className="text-gray-500">
                      No users found for "{searchTerm}"
                    </p>
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

