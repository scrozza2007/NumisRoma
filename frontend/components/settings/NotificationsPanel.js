import React, { useState } from 'react';

const STORAGE_KEY = 'settingsFormData';
const DEFAULTS = { email: true, app: true, marketing: false };

const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={onChange}
    className={`relative inline-flex items-center h-5 rounded-full w-10 transition-colors ease-in-out duration-200 focus:outline-none ${checked ? 'bg-amber' : 'bg-border'}`}
  >
    <span
      className={`inline-block w-3.5 h-3.5 transform transition ease-in-out duration-200 rounded-full bg-white ${checked ? 'translate-x-[22px]' : 'translate-x-[3px]'}`}
    />
  </button>
);

const NOTIFICATION_ITEMS = [
  { key: 'email',     label: 'Email Notifications', description: 'Receive email notifications about account activity' },
  { key: 'app',       label: 'App Notifications',   description: 'Receive in-app notifications' },
  { key: 'marketing', label: 'Marketing Emails',    description: 'Receive updates about new features and promotions' },
];

const NotificationsPanel = ({ onSuccess }) => {
  const [notifications, setNotifications] = useState(() => {
    if (typeof window === 'undefined') return DEFAULTS;
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return saved.notifications ?? DEFAULTS;
    } catch { return DEFAULTS; }
  });
  const [saved, setSaved] = useState(() => {
    if (typeof window === 'undefined') return DEFAULTS;
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return data.notifications ?? DEFAULTS;
    } catch { return DEFAULTS; }
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasChanges = NOTIFICATION_ITEMS.some(({ key }) => notifications[key] !== saved[key]);

  const handleToggle = (key) => setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  const handleReset  = () => setNotifications(saved);

  const handleSave = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      try {
        const formData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...formData, notifications, lastUpdated: new Date().toISOString() }));
        setSaved(notifications);
        onSuccess('Notification preferences saved!');
      } finally {
        setIsSubmitting(false);
      }
    }, 800);
  };

  return (
    <div>
      <h2 className="font-display font-semibold text-2xl mb-6 text-text-primary">Notification Preferences</h2>

      <div className="space-y-3 mb-6">
        {NOTIFICATION_ITEMS.map(({ key, label, description }) => (
          <div key={key} className="flex items-center justify-between p-4 bg-surface-alt border border-border rounded-md">
            <div>
              <p className="font-sans text-sm font-medium text-text-primary">{label}</p>
              <p className="font-sans text-xs mt-0.5 text-text-muted">{description}</p>
            </div>
            <Toggle checked={notifications[key]} onChange={() => handleToggle(key)} />
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3 pt-5 border-t border-border">
        <button
          onClick={handleReset}
          disabled={isSubmitting || !hasChanges}
          className="px-4 py-2 font-sans text-sm border border-border rounded-md bg-card text-text-secondary hover:border-border-strong transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Reset
        </button>
        <button
          onClick={handleSave}
          disabled={isSubmitting || !hasChanges}
          className="px-5 py-2 font-sans text-sm font-semibold flex items-center gap-2 rounded-md bg-amber text-[#fdf8f0] hover:bg-amber-hover transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSubmitting
            ? <><div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />Saving…</>
            : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
};

export default NotificationsPanel;
