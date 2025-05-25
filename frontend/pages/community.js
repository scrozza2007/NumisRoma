import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const Community = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [recommendedUsers, setRecommendedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const { user, isLoading: authLoading } = useContext(AuthContext);
  const router = useRouter();

  // Check authentication on startup
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Load recommended users on startup
  const fetchRecommendedUsers = useCallback(async () => {
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
        if (response.status === 404) {
          console.warn('Endpoint recommended users not found, showing empty list');
          setRecommendedUsers([]);
          setUsers([]);
          return;
        }
        
        const data = await response.json();
        throw new Error(data.message || 'Error retrieving recommended users');
      }
      
      const data = await response.json();
      setRecommendedUsers(data);
      setUsers([]);
    } catch (error) {
      console.error('Error retrieving recommended users:', error);
      
      setRecommendedUsers([]);
      setUsers([]);
      
      if (error.message === 'You are not authenticated') {
        router.push('/login');
      } else {
        setNotification({
          show: true,
          message: 'Unable to load recommended users. Please refresh the page.',
          type: 'error'
        });
        
        setTimeout(() => {
          setNotification({ show: false, message: '', type: '' });
        }, 5000);
      }
    } finally {
      setLoading(false);
    }
  }, [user, router]);

  // Search users when search term changes
  const searchUsers = useCallback(async () => {
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
  }, [searchTerm, router]);

  // Update useEffect dependencies
  useEffect(() => {
    if (!searchTerm && user && !authLoading) {
      fetchRecommendedUsers();
    }
  }, [user, authLoading, searchTerm, fetchRecommendedUsers]);

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
  }, [searchTerm, user, authLoading, searchUsers, fetchRecommendedUsers]);

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

      // Show success notification
      setNotification({
        show: true,
        message: isFollowing ? 'Successfully unfollowed user' : 'Successfully followed user',
        type: 'success'
      });

      // Hide notification after 3 seconds
      setTimeout(() => {
        setNotification({ show: false, message: '', type: '' });
      }, 3000);

    } catch (error) {
      console.error('Error following/unfollowing user:', error);
      if (error.message === 'You are not authenticated') {
        router.push('/login');
      }
      // Show error notification
      setNotification({
        show: true,
        message: 'An error occurred. Please try again later.',
        type: 'error'
      });
      
      // Hide error notification after 3 seconds
      setTimeout(() => {
        setNotification({ show: false, message: '', type: '' });
      }, 3000);
    }
  };

  const UserCard = ({ user: profileUser }) => {
    const initials = profileUser.username.charAt(0).toUpperCase();
    const router = useRouter();

    return (
      <div
        className="bg-white rounded-xl shadow-lg p-6 transform transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer"
        onClick={() => router.push(`/profile/${profileUser._id}`)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {profileUser.avatar ? (
              <Image
                src={profileUser.avatar}
                alt={profileUser.username}
                width={56}
                height={56}
                className="w-14 h-14 rounded-full object-cover border-2 border-gray-100 shadow-lg transition-all duration-300 ease-in-out transform group-hover:scale-110 group-hover:border-yellow-300 group-hover:shadow-xl"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-yellow-50 text-yellow-500 flex items-center justify-center font-semibold text-2xl border-2 border-gray-100 shadow-lg transition-all duration-300 ease-in-out transform group-hover:scale-110 group-hover:bg-gray-50 group-hover:shadow-xl">
                {initials}
              </div>
            )}
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">@{profileUser.username}</h3>
              <p className="text-sm text-gray-500">{profileUser.email}</p>
            </div>
          </div>
          <button
            onClick={e => { e.stopPropagation(); toggleFollow(profileUser._id, profileUser.isFollowing); }}
            className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105 cursor-pointer ${
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-yellow-500 border-t-transparent"></div>
      </div>
    );
  }

  // If there's no authenticated user, show nothing (will be redirected)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Community - NumisRoma</title>
        <meta name="description" content="Connect with other numismatic enthusiasts on NumisRoma" />
      </Head>

      {notification.show && (
        <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white transition-all duration-300 transform`}>
          {notification.message}
        </div>
      )}

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
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 focus:outline-none transition-all duration-300 bg-white"
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

            {!searchTerm && recommendedUsers.length === 0 && !loading && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Community</h2>
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 mb-2">No recommended users at the moment</p>
                  <p className="text-sm text-gray-400">Use the search bar to find other collectors</p>
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
                      No users found for &quot;{searchTerm}&quot;
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

