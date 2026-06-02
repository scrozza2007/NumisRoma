import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { apiClient } from '../../utils/apiClient';

const formatLastActive = (date) => {
  try {
    const diffMs = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);
    if (mins < 1) return 'a few seconds ago';
    if (mins < 60) return `${mins} minutes ago`;
    if (hours < 24) return `${hours} hours ago`;
    return `${days} days ago`;
  } catch { return 'unknown date'; }
};

const formatSessionLocation = (session) => {
  const source = session.geoLocation?.source;
  if (source === 'unavailable' || source === 'private_network' || source === 'local_development') return 'Unknown location';
  return session.location || 'Unknown location';
};
const formatSessionIp = (session) => session.ipAddress || 'Unavailable';
const getLocationHelp = (session) => {
  const source = session.geoLocation?.source;
  if (source === 'unavailable' || source === 'private_network' || source === 'local_development') {
    return 'Approximate location could not be determined from our local geolocation data.';
  }
  return null;
};
const formatDateTime = (date) => date
  ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date))
  : 'Unknown';
const formatRiskFlag = (flag) => ({
  new_device: 'New device',
  new_country: 'New country',
  impossible_travel: 'Impossible travel',
  anonymous_network: 'Anonymous network',
  vpn_detected: 'VPN detected',
  proxy_detected: 'Proxy detected',
  tor_detected: 'Tor detected',
  ip_changed: 'IP changed',
  user_agent_changed: 'Device signature changed'
}[flag] || flag);

const DeviceIcon = ({ type }) => {
  const iconPath = type === 'mobile'
    ? 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z'
    : type === 'tablet'
    ? 'M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z'
    : 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z';
  return (
    <div className="w-8 h-8 flex items-center justify-center rounded-md shrink-0 bg-surface-alt">
      <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={iconPath} />
      </svg>
    </div>
  );
};

const PrivacyPanel = ({ onSuccess }) => {
  const { user, logout, sessions, sessionsLoading, fetchSessions, terminateSession, terminateAllOtherSessions, setSessions } = useContext(AuthContext);
  const [terminatingSession, setTerminatingSession] = useState(null);
  const [terminatingAllSessions, setTerminatingAllSessions] = useState(false);
  const [sessionError, setSessionError] = useState(null);
  const [isPrivate, setIsPrivate] = useState(user?.isPrivate ?? false);
  const [privacyLoading, setPrivacyLoading] = useState(false);

  useEffect(() => { fetchSessions(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePrivacyToggle = async () => {
    const next = !isPrivate;
    setPrivacyLoading(true);
    try {
      await apiClient.put('/api/users/me/privacy', { isPrivate: next });
      setIsPrivate(next);
      onSuccess(next ? 'Account set to private.' : 'Account set to public. All pending follow requests accepted.');
    } catch {
      setSessionError('Error updating privacy setting');
      setTimeout(() => setSessionError(null), 3000);
    } finally {
      setPrivacyLoading(false);
    }
  };

  const showError = (msg) => { setSessionError(msg); setTimeout(() => setSessionError(null), 3000); };

  const handleTerminateSession = async (sessionId) => {
    setTerminatingSession(sessionId);
    try {
      const result = await terminateSession(sessionId);
      if (result.success) {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        onSuccess('Session terminated. The device will be logged out.');
      } else showError(result.error || 'Error terminating session');
    } catch { showError('A network error occurred'); }
    finally { setTerminatingSession(null); }
  };

  const handleTerminateAllSessions = async () => {
    setTerminatingAllSessions(true);
    try {
      const result = await terminateAllOtherSessions();
      if (result.success) {
        setSessions(prev => prev.filter(s => s.isCurrentSession));
        onSuccess('All other sessions terminated.');
      } else showError(result.error || 'Error terminating sessions');
    } catch { showError('A network error occurred'); }
    finally { setTerminatingAllSessions(false); }
  };

  const handleTerminateCurrentSession = async () => {
    setTerminatingSession('current');
    await logout();
  };

  return (
    <div className="space-y-8">
      <h2 className="font-display font-semibold text-2xl text-text-primary">Privacy &amp; Security</h2>

      {/* Private Account Toggle */}
      <div className="p-5 bg-surface-alt border border-border rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center rounded-md bg-amber-bg">
              <svg className="w-4 h-4 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h3 className="font-sans font-semibold text-sm text-text-primary">Private Account</h3>
              <p className="font-sans text-xs text-text-muted mt-0.5">
                {isPrivate
                  ? 'Only approved followers can see your collection.'
                  : 'Anyone can follow you and see your collection.'}
              </p>
            </div>
          </div>
          <button
            onClick={handlePrivacyToggle}
            disabled={privacyLoading}
            className={`relative inline-flex items-center h-6 rounded-full w-11 shrink-0 transition-colors duration-200 disabled:opacity-50 ${isPrivate ? 'bg-amber' : 'bg-border'}`}
            aria-label="Toggle private account"
          >
            <span
              className={`inline-block w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${isPrivate ? 'translate-x-[26px]' : 'translate-x-[4px]'}`}
            />
          </button>
        </div>
      </div>

      {/* Session Management */}
      <div className="p-6 bg-card border border-border rounded-lg">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h3 className="font-display font-semibold text-xl text-text-primary">Your active sessions</h3>
            <p className="font-sans text-xs text-text-muted mt-1">
              Review devices signed in to your account. Locations are approximate and based on network information.
            </p>
          </div>
          <button
            onClick={handleTerminateAllSessions}
            disabled={terminatingAllSessions || !sessions || sessions.length <= 1}
            className="flex items-center gap-1.5 px-3 py-1.5 font-sans text-xs font-medium rounded-md border border-error-border text-error-text bg-error-bg transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {terminatingAllSessions
              ? <><div className="animate-spin rounded-full h-3 w-3 border border-t-transparent border-red-600" />Logging out…</>
              : 'Logout all other devices'
            }
          </button>
        </div>

        {sessionError && (
          <div className="mb-4 p-3 rounded-md flex items-start gap-2 bg-error-bg border border-error-border text-error-text">
            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <p className="font-sans text-sm">{sessionError}</p>
          </div>
        )}

        {sessionsLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-7 w-7 border-2 border-amber border-t-transparent" />
          </div>
        ) : sessions && sessions.length > 0 ? (
          <div className="space-y-2">
            {sessions.map(session => (
              <div key={session.id} className="flex items-start justify-between gap-4 p-4 rounded-md bg-surface-alt border border-border">
                <div className="flex items-start gap-3">
                  <DeviceIcon type={session.deviceInfo.type} />
                  <div>
                    <p className="font-sans text-sm font-medium text-text-primary">
                      {session.isCurrentSession ? 'Current session' : session.deviceInfo.deviceName}
                    </p>
                    <p className="font-sans text-xs mt-0.5 text-text-muted">
                      {session.deviceInfo.operatingSystem} · {session.deviceInfo.browser} · {formatSessionLocation(session)}
                    </p>
                    <p className="font-sans text-xs mt-0.5 text-text-muted">
                      {session.isCurrentSession ? 'Active now' : `Last active ${formatLastActive(session.lastActive)}`} · Signed in {formatDateTime(session.createdAt)}
                    </p>
                    {getLocationHelp(session) && (
                      <p className="font-sans text-xs mt-0.5 text-text-muted">
                        {getLocationHelp(session)}
                      </p>
                    )}
                    <p className="font-sans text-xs mt-0.5 text-text-muted">
                      IP address: {formatSessionIp(session)}
                    </p>
                    {session.geoLocation?.timezone && (
                      <p className="font-sans text-xs mt-0.5 text-text-muted">
                        Timezone: {session.geoLocation.timezone}{session.geoLocation.isp ? ` · Network: ${session.geoLocation.isp}` : ''}
                      </p>
                    )}
                    {session.riskFlags?.length > 0 && (
                      <p className="font-sans text-xs mt-1 text-error-text">
                        Review recommended: {session.riskFlags.map(formatRiskFlag).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
                {session.isCurrentSession ? (
                  <div className="flex flex-col items-end gap-2">
                    <span className="flex items-center gap-1 font-sans text-xs px-2 py-0.5 rounded-full bg-success-bg text-success-text">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />Current
                    </span>
                    <button
                      onClick={handleTerminateCurrentSession}
                      disabled={terminatingSession === 'current'}
                      className="font-sans text-xs px-2.5 py-1 rounded-md border border-error-border text-error-text bg-error-bg disabled:opacity-50"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleTerminateSession(session.id)}
                    disabled={terminatingSession === session.id}
                    className="font-sans text-xs px-2.5 py-1 rounded-md border border-error-border text-error-text bg-error-bg transition-colors duration-150 disabled:opacity-50"
                  >
                    {terminatingSession === session.id
                      ? <span className="flex items-center gap-1"><div className="animate-spin rounded-full h-3 w-3 border border-t-transparent border-red-600" />…</span>
                      : 'Logout'}
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="font-sans text-sm text-center py-6 text-text-muted">No active sessions found.</p>
        )}
      </div>
    </div>
  );
};

export default PrivacyPanel;
