import React, { useContext, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { AuthContext } from '../context/AuthContext';

const ReasonDropdown = ({ value, onChange, options, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const selected = options.find(o => o.value === value);
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-left px-3 py-2.5 pr-8 font-sans text-sm bg-card border border-border rounded-md outline-none transition-colors duration-150 ${selected ? 'text-text-primary' : 'text-text-muted'}`}
      >
        {selected ? selected.label : placeholder}
      </button>
      <svg className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
      </svg>
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 overflow-hidden border border-border rounded-md bg-card shadow-md">
          {options.map((opt) => (
            <div key={opt.value} onClick={() => { onChange(opt.value); setIsOpen(false); }}
              className={`px-3 py-2 cursor-pointer font-sans text-sm transition-colors duration-100 hover:bg-surface-alt ${opt.value === value ? 'text-text-primary' : 'text-text-secondary'}`}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const DeleteAccount = () => {
  const { user, isLoading, deleteAccount } = useContext(AuthContext);
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const reasonOptions = [
    { value: 'no-longer-use',    label: "I no longer use this account" },
    { value: 'not-useful',       label: "I don't find the platform useful" },
    { value: 'found-alternative',label: "I found a better alternative" },
    { value: 'other',            label: "Other reason" },
  ];

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [user, isLoading, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (user.hasPassword && !password) { setError('Password is required to delete your account.'); return; }
    setIsSubmitting(true);
    setError('');
    try {
      const result = await deleteAccount(password, reason);
      if (result.success) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/register';
      } else {
        setError(result.error || 'Failed to delete account. Please try again.');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-canvas">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-canvas">
      <Head>
        <title>Delete Account — NumisRoma</title>
      </Head>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display font-semibold text-3xl mb-2 text-text-primary">Delete Account</h1>
          <p className="font-sans text-sm text-text-muted">This action is permanent and cannot be undone.</p>
        </div>

        <div className="p-3.5 rounded-md mb-6 flex items-start gap-3 bg-error-bg border border-error-border text-error-text">
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span className="font-sans text-sm">All your collections, coins, and account data will be permanently deleted.</span>
        </div>

        <div className="bg-card border border-border rounded-lg">
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div>
              <label className="block font-sans text-sm font-medium mb-1.5 text-text-primary">
                Reason <span className="font-normal text-text-muted">(optional)</span>
              </label>
              <ReasonDropdown value={reason} onChange={setReason} options={reasonOptions} placeholder="Select a reason…" />
              <p className="mt-1.5 font-sans text-xs text-text-muted">Your feedback helps us improve.</p>
            </div>

            {user.hasPassword && (
              <div>
                <label htmlFor="password" className="block font-sans text-sm font-medium mb-1.5 text-text-primary">Password</label>
                <input
                  type="password" id="password" placeholder="Enter your current password"
                  value={password} onChange={e => setPassword(e.target.value)}
                  className={`w-full px-3.5 py-2.5 font-sans text-sm bg-card rounded-md outline-none transition-colors duration-150 text-text-primary focus:border-amber ${error ? 'border border-error-border' : 'border border-border'}`}
                />
                {error && (
                  <p className="mt-1.5 font-sans text-xs flex items-center gap-1 text-error-border">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    {error}
                  </p>
                )}
              </div>
            )}
            {!user.hasPassword && error && (
              <p className="font-sans text-xs flex items-center gap-1 text-error-border">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                {error}
              </p>
            )}

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox" checked={isConfirmed} onChange={e => setIsConfirmed(e.target.checked)} required
                className="mt-0.5 accent-error-border"
              />
              <span className="font-sans text-sm text-text-primary">
                Yes, I want to permanently delete my NumisRoma account.
              </span>
            </label>

            <div className="flex gap-3 pt-2">
              <button
                type="button" onClick={() => router.push('/settings')}
                className="flex-1 py-2.5 font-sans text-sm border border-border rounded-md bg-card text-text-secondary hover:border-border-strong transition-colors duration-150"
              >
                Cancel
              </button>
              <button
                type="submit" disabled={(user.hasPassword && !password) || !isConfirmed || isSubmitting}
                className="flex-1 py-2.5 font-sans text-sm font-semibold flex items-center justify-center gap-2 rounded-md text-white bg-error-text transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />Deleting…</>
                ) : 'Delete Account'}
              </button>
            </div>
          </form>
        </div>

        <p className="mt-6 text-center font-sans text-xs text-text-muted">
          Need help? Email{' '}
          <a href="mailto:support@numisroma.com" className="text-amber hover:text-amber-hover transition-colors duration-150">
            support@numisroma.com
          </a>
        </p>
      </div>
    </div>
  );
};

export default DeleteAccount;
