import { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { getCsrfHeader, invalidateCsrfToken, ensureCsrfToken } from '../utils/csrf';
import {
  generateIdentityBundle,
  restoreIdentityBundle,
  relockBundle,
  clearStoredBundle,
  hasStoredBundle,
  replenishOTPKs,
  computeSafetyNumber,
  getIdentityBundle,
} from '../utils/e2ee';

export const AuthContext = createContext();

const authFetch = async (url, options = {}, retry = false) => {
  const method = (options.method || 'GET').toUpperCase();
  const csrfHeader = await getCsrfHeader(method);

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.headers || {}),
      ...csrfHeader
    }
  });

  if (response.status === 403 && !retry) {
    const cloned = response.clone();
    const peek = await cloned.json().catch(() => ({}));
    if (peek?.code === 'CSRF_INVALID') {
      invalidateCsrfToken();
      return authFetch(url, options, true);
    }
  }

  return response;
};

export const AuthProvider = ({ children }) => {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionTerminated, setSessionTerminated] = useState(false);
  const [terminationReason, setTerminationReason] = useState(null);

  // E2EE — Signal Protocol (X3DH + Double Ratchet).
  // Private keys stored only in IndexedDB, never in Web Storage.
  // e2eeReady = true once the identity bundle is initialised for this session.
  const [e2eeReady, setE2eeReady] = useState(false);

  // Placeholder hook for instrumenting auth state transitions. No-op in
  // production; kept for future diagnostic wiring.
  const logState = (action) => {};

  /**
   * Sanitize user data from localStorage to prevent XSS
   * @param {Object} userData - Raw user data from localStorage
   * @returns {Object|null} - Sanitized user data or null if invalid
   */
  const sanitizeUserData = (userData) => {
    if (!userData || typeof userData !== 'object') return null;
    
    // Only include expected fields with type validation and length limits
    const sanitized = {};
    
    if (userData._id && typeof userData._id === 'string') {
      sanitized._id = String(userData._id).slice(0, 24); // MongoDB ObjectId length
    }
    
    if (userData.id && typeof userData.id === 'string') {
      sanitized.id = String(userData.id).slice(0, 24);
    }
    
    if (userData.username && typeof userData.username === 'string') {
      sanitized.username = String(userData.username).slice(0, 50);
    }
    
    if (userData.email && typeof userData.email === 'string') {
      sanitized.email = String(userData.email).slice(0, 100);
    }
    
    if (userData.fullName && typeof userData.fullName === 'string') {
      sanitized.fullName = String(userData.fullName).slice(0, 100);
    }
    
    if (userData.location && typeof userData.location === 'string') {
      sanitized.location = String(userData.location).slice(0, 100);
    }
    
    if (userData.bio && typeof userData.bio === 'string') {
      sanitized.bio = String(userData.bio).slice(0, 500);
    }
    
    if (userData.avatar && typeof userData.avatar === 'string') {
      sanitized.avatar = String(userData.avatar).slice(0, 500);
    }

    sanitized.hasPassword = Boolean(userData.hasPassword);

    // Ensure at least _id or id exists
    if (!sanitized._id && !sanitized.id) {
      return null;
    }
    
    return sanitized;
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // The httpOnly auth cookie is the source of truth — verify it first.
        // We intentionally do NOT pre-populate user from localStorage here because
        // that caused the profile icon to flash when the cookie was invalid/expired.
        // localStorage is only used as a cache AFTER the cookie is confirmed valid.
        await fetchUserData();
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
        logState('After initialization');
      }
    };

    initializeAuth();
  }, []);

  const fetchUserData = useCallback(async () => {
    try {
      const response = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`,
        {}
      );

      const userData = await response.json();
      if (response.ok) {
        const sanitizedUser = sanitizeUserData(userData);
        if (sanitizedUser) {
          setUser(sanitizedUser);
          setToken(userData.token || true); // truthy sentinel; real token stays in-memory only
          localStorage.setItem('user', JSON.stringify(sanitizedUser));
          initE2EE(null).catch(() => {});
          logState('After setting user data');
        } else {
          console.warn('Invalid user data from API');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        }
      } else {
        // Any non-OK response means we can't confirm the session — clear auth state.
        // Invalidate the CSRF token too so the next login fetches a fresh one.
        localStorage.removeItem('user');
        invalidateCsrfToken();
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      // Network errors don't mean the session is invalid, just unreachable.
      // Leave existing state intact so a brief connectivity blip doesn't log the user out.
      console.error('Network error fetching user data:', error);
    }
  }, []);

  // Re-verify the session on every client-side route change so protected pages
  // never render with stale auth state after a session expiry.
  useEffect(() => {
    const handleRouteChange = () => {
      setIsLoading(true);
      fetchUserData().finally(() => setIsLoading(false));
    };
    router.events.on('routeChangeComplete', handleRouteChange);
    return () => router.events.off('routeChangeComplete', handleRouteChange);
  }, [router.events, fetchUserData]);

  // Detect when another tab logs in as a different user (or logs out).
  // localStorage.user is written on every login/logout, so a storage event
  // fires in all other same-origin tabs. If the identity changed, redirect
  // to login immediately so the stale tab can't keep acting as the old user.
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key !== 'user') return;
      const prev = user?._id || user?.id;
      let nextId = null;
      try { nextId = e.newValue ? JSON.parse(e.newValue)?._id : null; } catch {}
      if (prev && nextId !== prev) {
        // Different user (or logged out) in another tab — clean up and redirect.
        invalidateCsrfToken();
        setToken(null);
        setUser(null);
        window.location.href = '/login?message=' + encodeURIComponent('You were signed out because another account was used in a different tab.');
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [user]);

  // Initialise the Signal Protocol identity bundle.
  // Called after every successful login with the plaintext password.
  // No raw key bytes ever touch Web Storage — all material lives in IndexedDB.
  const initE2EE = useCallback(async (password) => {
    try {
      let bundle = null;

      // 1. Try to restore local bundle from IndexedDB (same device, no password needed).
      if (await hasStoredBundle()) {
        bundle = await restoreIdentityBundle(null, null);
      }

      // 2. If we have a local bundle but no password, mark ready and verify server
      //    registration in the background (handles page reloads, SSE re-auths).
      if (bundle && !password) {
        setE2eeReady(true);
        _ensureServerRegistered(bundle).catch(() => {});
        return;
      }

      // 3. If we have a password, always ensure the server record is up-to-date.
      if (password) {
        if (!bundle) {
          // 3a. Try restoring from server blob (new device).
          invalidateCsrfToken();
          await ensureCsrfToken();
          const res = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/e2ee/identity/me`);
          if (res.ok) {
            const data = await res.json();
            if (data.registered && data.encryptedKeyBundle) {
              bundle = await restoreIdentityBundle(password, data.encryptedKeyBundle);
            }
          }
        }

        if (!bundle) {
          // 3b. First ever login on any device — generate a brand new bundle.
          const result = await generateIdentityBundle(password);
          bundle = await restoreIdentityBundle(null, null); // read it back from IDB
          await _registerBundle(result.publicBundle, result.encryptedKeyBundle, result.identityPublicKey);
          setE2eeReady(true);
          return;
        }

        // Bundle exists locally — make sure server registration is current.
        await _ensureServerRegistered(bundle);
        setE2eeReady(true);
      }
    } catch (err) {
      console.warn('E2EE init failed — messages will not be encrypted', err);
    }
  }, []);

  // Upload/re-upload the identity bundle to the server if not yet registered.
  const _ensureServerRegistered = async (bundle) => {
    try {
      invalidateCsrfToken();
      await ensureCsrfToken();
      const check = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/e2ee/identity/me`);
      if (check.ok) {
        const data = await check.json();
        if (data.registered) {
          _replenishIfNeeded().catch(() => {});
          return; // already registered
        }
      }
      // Not registered — upload now.
      const stored = await getIdentityBundle();
      if (!stored) return;

      // Old bundles (pre-fix) are missing encryptedKeyBundle or spkSig.
      // They cannot be registered without a password — clear them so the user
      // regenerates a proper bundle on next login.
      if (!stored.encryptedKeyBundle || !stored.spkSig) {
        await clearStoredBundle();
        setE2eeReady(false);
        return;
      }

      await _registerBundle(
        {
          identityDhPublicKey: stored.ikDhPub,
          signedPreKey: { keyId: stored.spkId, publicKey: stored.spkPub, signature: stored.spkSig },
          oneTimePreKeys: stored.otpks.map(k => ({ keyId: k.keyId, publicKey: k.pub })),
        },
        stored.encryptedKeyBundle,
        stored.ikSignPub
      );
    } catch { /* non-fatal */ }
  };

  const _registerBundle = async (publicBundle, encryptedKeyBundle, identityPublicKey) => {
    invalidateCsrfToken();
    await ensureCsrfToken();
    await authFetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/e2ee/identity`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identityPublicKey,
          identityDhPublicKey: publicBundle.identityDhPublicKey,
          encryptedKeyBundle,
          signedPreKey: publicBundle.signedPreKey,
          oneTimePreKeys: publicBundle.oneTimePreKeys,
        }),
      }
    );
    _replenishCheckedRef.current = false; // allow replenish check after fresh registration
    _replenishIfNeeded().catch(() => {});
  };

  // Track whether we've already checked OTPK supply this session.
  const _replenishCheckedRef = useRef(false);

  // Check OTPK count once per session and silently replenish if below threshold.
  const _replenishIfNeeded = async () => {
    if (_replenishCheckedRef.current) return;
    _replenishCheckedRef.current = true;
    try {
      const res = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/e2ee/pre-keys/count`);
      if (!res.ok) return; // 404 = no bundle registered yet, nothing to replenish
      const { count } = await res.json();
      if (count >= 20) return;

      const newKeys = await replenishOTPKs(50);
      if (!newKeys.length) return;
      await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/e2ee/pre-keys/replenish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oneTimePreKeys: newKeys }),
        }
      );
    } catch { /* non-fatal */ }
  };

  const login = async (newToken, userData, password) => {
    if (!newToken) return;

    setToken(newToken); // memory only — never persisted to localStorage

    if (userData) {
      // Ensure consistent user ID field (some endpoints return _id, others return id)
      const normalizedUserData = {
        ...userData,
        _id: userData._id || userData.id, // Ensure _id exists
        id: userData._id || userData.id   // Ensure id exists
      };
      const sanitizedUser = sanitizeUserData(normalizedUserData);
      if (sanitizedUser) {
        setUser(sanitizedUser);
        localStorage.setItem('user', JSON.stringify(sanitizedUser));
        logState('After login with user data');
      }
    } else {
      await fetchUserData();
    }

    // Initialise E2EE keypair in the background — non-blocking.
    if (password) initE2EE(password).catch(() => {});
  };

  // Function to check if a response indicates session was terminated
  const isSessionTerminatedResponse = (response) => {
    if (response && response.status === 401) {
      return response.json().then(data => {
        return data && data.code === 'SESSION_TERMINATED';
      }).catch(() => false);
    }
    return false;
  };

  // Handle API requests with session verification
  const makeAuthenticatedRequest = async (url, options = {}) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const response = await authFetch(url, options);

      // Check if session was terminated
      if (response.status === 401) {
        const data = await response.json();
        if (data.code === 'SESSION_TERMINATED' || data.sessionTerminated) {
          // Force logout if session was terminated
          const reason = 'Your session has been terminated from another device';
          setSessionTerminated(true);
          setTerminationReason(reason);
          await logout(true, reason);
          return { sessionTerminated: true, error: data.msg || 'Session terminated' };
        }

        return { error: data.msg || 'Unauthorized' };
      }

      return response;
    } catch (error) {
      throw error;
    }
  };

  const logout = async (skipApiCall = false, logoutReason = null) => {
    try {
      if (!skipApiCall && user) {
        await authFetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`,
          { method: 'POST' }
        );
      }
    } catch (error) {
      // Continue with logout even if API call fails
    } finally {
      localStorage.removeItem('user');
      invalidateCsrfToken();
      // E2EE session state cleared on logout. IndexedDB bundle persists for next login on same device.
      setE2eeReady(false);

      if (logoutReason) {
        // Hard redirect so the entire app re-initialises cleanly — no stale
        // React state (user, token, CSRF) can survive a full page load.
        window.location.href = `/login?message=${encodeURIComponent(logoutReason)}`;
      } else {
        setToken(null);
        setUser(null);
        setSessions([]);
      }
    }
  };

  // Verify current session status
  const checkSession = async () => {
    if (!user) return { active: false };
    
    try {
      const response = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/session-check`,
        {}
      );
      
      if (response.ok) {
        return { active: true };
      }
      
      // Check if session was terminated
      if (response.status === 401) {
        const data = await response.json();
        if (data.code === 'SESSION_TERMINATED' || data.sessionTerminated) {
          const reason = 'Your session has been terminated from another device';
          setSessionTerminated(true);
          setTerminationReason(reason);
          await logout(true, reason);
          return { active: false, terminated: true, reason: data.msg };
        }
        
        // Session is invalid for other reasons
        await logout(true);
        return { active: false, error: data.msg };
      }
      
      return { active: false };
    } catch (error) {
      return { active: false, error: error.message };
    }
  };

  // Session management
  const fetchSessions = async () => {
    if (!user) return;
    
    setSessionsLoading(true);
    try {
      const response = await makeAuthenticatedRequest(`${process.env.NEXT_PUBLIC_API_URL}/api/sessions`);
      
      // If session was terminated, response will contain sessionTerminated flag
      if (response.sessionTerminated) {
        setSessions([]);
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        // Keep only active sessions
        const activeSessions = data.sessions?.filter(session => session.isActive !== false) || [];
        setSessions(activeSessions);
      } else {
        setSessions([]);
      }
    } catch (error) {
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  };
  
  const terminateSession = async (sessionId) => {
    if (!user) return { success: false, error: 'Not authenticated' };
    
    try {
      const response = await makeAuthenticatedRequest(`${process.env.NEXT_PUBLIC_API_URL}/api/sessions/${sessionId}`, {
        method: 'DELETE'
      });
      
      // If session was terminated, response will contain sessionTerminated flag
      if (response.sessionTerminated) {
        return { success: false, error: 'Your session has been terminated' };
      }
      
      if (response.ok) {
        // Return success without fetching sessions again
        return { success: true };
      } else {
        const errorData = await response.json();
        return { 
          success: false, 
          error: errorData.error || 'Error terminating session' 
        };
      }
    } catch (error) {
      return { success: false, error: 'Network error while terminating session' };
    }
  };
  
  const terminateAllOtherSessions = async () => {
    if (!user) return { success: false, error: 'Not authenticated' };
    
    try {
      const response = await makeAuthenticatedRequest(`${process.env.NEXT_PUBLIC_API_URL}/api/sessions`, {
        method: 'DELETE'
      });
      
      // If session was terminated, response will contain sessionTerminated flag
      if (response.sessionTerminated) {
        return { success: false, error: 'Your session has been terminated' };
      }
      
      if (response.ok) {
        // Return success without fetching sessions again
        return { success: true };
      } else {
        const errorData = await response.json();
        return { 
          success: false, 
          error: errorData.error || 'Error terminating sessions' 
        };
      }
    } catch (error) {
      return { success: false, error: 'Network error while terminating sessions' };
    }
  };

  const changePassword = async (currentPassword, newPassword, confirmPassword) => {
    try {
      if (!user) throw new Error('User not authenticated');

      const response = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/change-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error,
          details: data.details
        };
      }

      // Re-wrap the identity bundle under the new password and re-upload the blob
      // so any new device restore also uses the new password.
      if (await hasStoredBundle()) {
        try {
          const newBlob = await relockBundle(currentPassword, newPassword);
          const bundle = await getIdentityBundle();
          if (newBlob && bundle) {
            await authFetch(
              `${process.env.NEXT_PUBLIC_API_URL}/api/e2ee/identity`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  identityPublicKey: bundle.ikSignPub,
                  identityDhPublicKey: bundle.ikDhPub,
                  encryptedKeyBundle: newBlob,
                  signedPreKey: {
                    keyId: bundle.spkId,
                    publicKey: bundle.spkPub,
                    // Signature was stored in IndexedDB on generation — re-send existing
                    signature: bundle.spkSig ?? '',
                  },
                  oneTimePreKeys: [],
                }),
              }
            );
          }
        } catch {
          // Non-fatal — E2EE restore on new device may require re-registration.
        }
      }

      return {
        success: true,
        message: data.message
      };
    } catch (error) {
      return {
        success: false,
        error: 'Error during password change'
      };
    }
  };

  const deleteAccount = async (password) => {
    try {
      if (!user) throw new Error('User not authenticated');

      const response = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/delete-account`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error,
          details: data.details
        };
      }

      // Return success without auto logout
      // The calling component will handle redirection before calling logout
      return {
        success: true,
        message: data.message
      };
    } catch (error) {
      return {
        success: false,
        error: 'Error deleting account'
      };
    }
  };

  const checkUsernameAvailability = async (username) => {
    try {
      if (!user) throw new Error('User not authenticated');

      const response = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/check-username`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username })
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        return {
          available: false,
          error: data.error
        };
      }

      return {
        available: true
      };
    } catch (error) {
      return {
        available: false,
        error: 'Error during username availability check'
      };
    }
  };

  const changeUsername = async (username) => {
    try {
      if (!user) throw new Error('User not authenticated');

      const response = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/change-username`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username })
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error,
          field: data.field
        };
      }

      // Update user in context and localStorage
      const updatedUser = { ...user, username: data.user.username };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      return {
        success: true,
        message: data.message,
        user: data.user
      };
    } catch (error) {
      return {
        success: false,
        error: 'Error during username change'
      };
    }
  };

  const updateProfile = async (userData) => {
    try {
      if (!user) throw new Error('User not authenticated');

      const response = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/update-profile`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData)
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error,
          details: data.details
        };
      }

      // Update user in context and localStorage
      const updatedUser = { ...user, ...data.user };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      return {
        success: true,
        message: data.message,
        user: data.user
      };
    } catch (error) {
      return {
        success: false,
        error: 'Error during profile update'
      };
    }
  };

  // Function to reset session termination state
  const resetSessionTermination = () => {
    setSessionTerminated(false);
    setTerminationReason(null);
  };

  // Log state changes
  useEffect(() => {
    logState('State changed');
  }, [token, user, isLoading]);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isLoading,
      isInitialized,
      login,
      logout,
      refreshAuth: fetchUserData,
      changePassword,
      deleteAccount,
      checkUsernameAvailability,
      changeUsername,
      updateProfile,
      sessions,
      sessionsLoading,
      fetchSessions,
      terminateSession,
      terminateAllOtherSessions,
      setSessions,
      checkSession,
      sessionTerminated,
      terminationReason,
      resetSessionTermination,
      // E2EE — Signal Protocol
      e2eeReady,           // true once identity bundle is ready for this session
      initE2EE,            // call with plaintext password to unlock/generate identity bundle
      computeSafetyNumber, // (myIKPub, theirIKPub) => "123456 789012 …"
    }}>
      {children}
    </AuthContext.Provider>
  );
};