import React, { useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { CircleCheck, LockKeyhole, UserRound } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import AccountPanel from '../components/settings/AccountPanel';
import PrivacyPanel from '../components/settings/PrivacyPanel';

const TABS = [
  {
    id: 'account',
    label: 'Account',
    Icon: UserRound,
  },
  {
    id: 'privacy',
    label: 'Privacy & Security',
    Icon: LockKeyhole,
  },
];

const Settings = () => {
  const { user, isLoading } = useContext(AuthContext);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('account');
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [user, isLoading, router]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('settingsActiveTab');
    if (TABS.some(({ id }) => id === saved)) setActiveTab(saved);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('settingsActiveTab', activeTab);
  }, [activeTab]);

  const showSuccessMessage = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  if (isLoading || !user) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-canvas">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <Head>
        <title>Settings — NumisRoma</title>
      </Head>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="font-display font-semibold text-4xl mb-8 text-text-primary">Settings</h1>

        {successMessage && (
          <div className="mb-6 p-3.5 rounded-md flex items-start gap-3 text-sm animate-fade-in bg-success-bg border border-success-border text-success-text">
            <CircleCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-sans">{successMessage}</span>
          </div>
        )}

        {/* Mobile tab strip — scrollable pills, hidden on desktop */}
        <div className="flex md:hidden overflow-x-auto gap-2 pb-1 mb-6 -mx-1 px-1">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-sans text-sm font-medium whitespace-nowrap shrink-0 transition-colors duration-150 border ${
                activeTab === id
                  ? 'bg-amber-bg border-amber text-amber'
                  : 'bg-card border-border text-text-secondary hover:border-border-strong'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar — desktop only */}
          <div className="hidden md:block md:col-span-1">
            <nav className="p-2 bg-card border border-border rounded-lg">
              {TABS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`w-full text-left px-3 py-2.5 rounded-md flex items-center gap-3 transition-colors duration-150 font-sans text-sm mb-0.5 ${
                    activeTab === id
                      ? 'bg-amber-bg text-amber'
                      : 'text-text-secondary hover:bg-surface-alt'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Panel */}
          <div className="md:col-span-3 p-5 sm:p-6 bg-card border border-border rounded-lg">
            {activeTab === 'account'       && <AccountPanel onSuccess={showSuccessMessage} />}
            {activeTab === 'privacy'       && <PrivacyPanel onSuccess={showSuccessMessage} />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
