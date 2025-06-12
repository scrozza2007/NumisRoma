import { useEffect, useContext } from 'react';
import { useRouter } from 'next/router';
import { AuthContext } from '../context/AuthContext';

const CollectionsRedirect = () => {
  const router = useRouter();
  const { user, isLoading } = useContext(AuthContext);

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        // Redirect to user's profile
        router.replace(`/profile?id=${user._id}`);
      } else {
        // Redirect to login if not authenticated
        router.replace('/login');
      }
    }
  }, [user, isLoading, router]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-500 border-t-transparent mb-4"></div>
        <p className="text-gray-600">Redirecting to your profile...</p>
      </div>
    </div>
  );
};

export default CollectionsRedirect; 