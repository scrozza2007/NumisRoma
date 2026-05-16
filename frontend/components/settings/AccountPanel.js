import React, { useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { AuthContext } from '../../context/AuthContext';
import { apiClient } from '../../utils/apiClient';
import { semantic } from '../../utils/tokens';

const validatePassword = (pw) => {
  const errs = {};
  if (pw.length < 8) errs.length = true;
  if (!/[A-Z]/.test(pw)) errs.uppercase = true;
  if (!/[a-z]/.test(pw)) errs.lowercase = true;
  if (!/[0-9]/.test(pw)) errs.number = true;
  if (!/[!@#$%^&*]/.test(pw)) errs.special = true;
  return errs;
};

const inputCls = (editing, errored) =>
  `w-full px-3.5 py-2.5 font-sans text-sm rounded-md outline-none focus:border-amber transition-colors duration-150 ${
    errored
      ? 'border border-[#fecaca] bg-card text-text-primary'
      : editing
      ? 'border border-border bg-card text-text-primary cursor-text'
      : 'border border-border bg-surface-alt text-text-muted cursor-not-allowed'
  }`;

export default function AccountPanel({ onSuccess }) {
  const { user, changePassword, changeUsername, updateProfile, checkUsernameAvailability } = useContext(AuthContext);
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [username, setUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [locationError, setLocationError] = useState('');
  const [usernameErrors, setUsernameErrors] = useState('');
  const [currentPasswordError, setCurrentPasswordError] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [passwordErrors, setPasswordErrors] = useState({});

  const [errors, setErrors] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `input:-webkit-autofill,input:-webkit-autofill:hover,input:-webkit-autofill:focus,input:-webkit-autofill:active{-webkit-box-shadow:0 0 0 30px white inset !important;-webkit-text-fill-color:inherit !important;transition:background-color 5000s ease-in-out 0s;}input.no-focus-outline:focus{outline:none !important;box-shadow:none !important;}`;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    if (!user) return;
    setName(user.fullName || '');
    setEmail(user.email || '');
    setLocation(user.location || '');
    setUsername(user.username || '');
  }, [user]);

  useEffect(() => {
    if (!user) return;
    apiClient.get('/api/auth/me').then(data => {
      setName(data.fullName || '');
      setEmail(data.email || '');
      setLocation(data.location || '');
      setUsername(data.username || '');
    }).catch(() => {});
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const removeFocusStates = () => {
    setTimeout(() => {
      const inputs = document.querySelectorAll('input');
      inputs.forEach(i => { i.classList.add('no-focus-outline'); i.blur(); });
      setTimeout(() => inputs.forEach(i => i.classList.remove('no-focus-outline')), 1000);
    }, 0);
  };

  const hasChanges = () =>
    (name !== '' && name !== user.fullName) ||
    (email !== '' && email !== user.email) ||
    (location !== '' && location !== user.location) ||
    (username !== '' && username !== user.username);

  const hasPasswordChanges = () => currentPassword && newPassword && confirmPassword;

  const handleNameChange = (e) => {
    const v = e.target.value; setName(v);
    if (!v.trim()) setNameError('Name cannot be empty');
    else if (v.length < 2) setNameError('Name must be at least 2 characters');
    else if (v.length > 50) setNameError('Name must be less than 50 characters');
    else setNameError('');
  };

  const handleEmailChange = (e) => {
    const v = e.target.value; setEmail(v);
    if (!v.trim()) { setEmailError('Email cannot be empty'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { setEmailError('Please enter a valid email address'); return; }
    setEmailError('');
    if (v === user.email) return;
    const timer = setTimeout(async () => {
      try {
        const data = await apiClient.post('/api/auth/check-email', { email: v });
        if (!data.available) setEmailError('This email is already registered to another account');
      } catch { setEmailError('This email is already registered to another account'); }
    }, 500);
    return () => clearTimeout(timer);
  };

  const handleLocationChange = (e) => {
    const v = e.target.value; setLocation(v);
    setLocationError(v.length > 100 ? 'Location must be less than 100 characters' : '');
  };

  const handleUsernameChange = async (e) => {
    const v = e.target.value; setUsername(v);
    if (!v.trim()) { setUsernameErrors('Username cannot be empty'); return; }
    if (v.length < 3) { setUsernameErrors('Username must be at least 3 characters'); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(v)) { setUsernameErrors('Username can only contain letters, numbers and underscores'); return; }
    if (v === user.username) { setUsernameErrors(''); return; }
    const timer = setTimeout(async () => {
      const result = await checkUsernameAvailability(v);
      setUsernameErrors(result.available ? '' : (result.error || 'Username is already taken'));
    }, 500);
    return () => clearTimeout(timer);
  };

  const handleCurrentPasswordChange = (e) => {
    setCurrentPassword(e.target.value);
    setCurrentPasswordError(e.target.value.trim() === '' ? 'Current password is required' : '');
  };

  const handleNewPasswordChange = (e) => {
    const v = e.target.value; setNewPassword(v);
    const errs = validatePassword(v);
    setPasswordErrors(prev => ({ ...prev, validation: errs }));
    setNewPasswordError(Object.keys(errs).length > 0 ? 'Please ensure password meets all requirements' : '');
    if (currentPassword && v === currentPassword) setNewPasswordError('New password must be different from current password');
    if (confirmPassword) setConfirmPasswordError(v !== confirmPassword ? 'Passwords do not match' : '');
  };

  const handleConfirmPasswordChange = (e) => {
    setConfirmPassword(e.target.value);
    setConfirmPasswordError(e.target.value !== newPassword ? 'Passwords do not match' : '');
  };

  const handleSaveChanges = async () => {
    setIsSubmitting(true); setErrors({}); removeFocusStates();
    if (hasPasswordChanges()) {
      setPasswordErrors({});
      let hasErrs = false; const newErrs = {};
      if (!currentPassword) { newErrs.currentPassword = 'Please enter your current password'; hasErrs = true; }
      if (newPassword) {
        const ve = validatePassword(newPassword);
        if (Object.keys(ve).length > 0) { newErrs.validation = ve; hasErrs = true; }
        if (newPassword === currentPassword) { newErrs.newPassword = 'New password must be different from current password'; hasErrs = true; }
      } else if (currentPassword) { newErrs.newPassword = 'Please enter a new password'; hasErrs = true; }
      if (newPassword !== confirmPassword) { newErrs.confirmPassword = 'Passwords do not match'; hasErrs = true; }
      if (hasErrs) { setPasswordErrors(newErrs); setIsSubmitting(false); return; }
      changePassword(currentPassword, newPassword, confirmPassword).then(result => {
        if (result.success) {
          setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
          onSuccess('Password changed successfully!');
        } else {
          if (result.details) { const ae = {}; result.details.forEach(d => { ae[d.field] = d.message; }); setPasswordErrors(ae); }
          else if (result.error === 'Current password is incorrect') setPasswordErrors({ currentPassword: 'Current password is incorrect' });
          else setPasswordErrors({ general: result.error || 'Error changing password' });
        }
        setIsSubmitting(false);
      });
      return;
    }
    try {
      const profileChanged = name !== user.fullName || email !== user.email || location !== user.location;
      if (profileChanged) {
        const res = await updateProfile({ fullName: name, email, location });
        if (!res.success) {
          if (res.error === 'Email already registered' || res.field === 'email' || res.details?.email) setEmailError('This email is already registered to another account');
          else setErrors(res.details || { general: res.error || 'Error updating profile' });
          setIsSubmitting(false); return;
        }
      }
      if (username !== user.username) {
        if (usernameErrors) { setIsSubmitting(false); return; }
        const res = await changeUsername(username);
        if (!res.success) { setUsernameErrors(res.error || 'Error updating username'); setIsSubmitting(false); return; }
      }
      localStorage.setItem('settingsFormData', JSON.stringify({ name, email, location, username, lastUpdated: new Date().toISOString() }));
      setIsSubmitting(false); setIsEditing(false); onSuccess('Settings saved successfully!'); removeFocusStates();
    } catch {
      setErrors({ general: 'An unexpected error occurred' }); setIsSubmitting(false);
    }
  };

  if (!user) return null;

  const FieldError = ({ msg }) => msg ? (
    <p className="mt-1.5 font-sans text-xs flex items-center gap-1" style={{ color: semantic.error.border }}>
      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      {msg}
    </p>
  ) : null;

  const SectionHeader = ({ title }) => (
    <h3 className="font-display font-semibold text-xl mb-4 text-text-primary">{title}</h3>
  );

  const Label = ({ children, htmlFor }) => (
    <label htmlFor={htmlFor} className="block font-sans text-sm font-medium mb-1.5 text-text-primary">{children}</label>
  );

  return (
    <div className="space-y-8">
      <h2 className="font-display font-semibold text-2xl text-text-primary">Account Settings</h2>

      {errors.general && (
        <div className="p-3.5 rounded-md flex items-start gap-3 text-sm" style={{ backgroundColor: semantic.error.bg, border: '1px solid #fecaca', color: semantic.error.text }}>
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span className="font-sans">{errors.general}</span>
        </div>
      )}

      {/* Personal Information */}
      <div>
        <SectionHeader title="Personal Information" />
        <div className="p-5 space-y-4 bg-card border border-border rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <input id="name" type="text" value={name} onChange={handleNameChange} placeholder="Your full name" disabled={!isEditing} className={inputCls(isEditing, !!nameError)} />
              <FieldError msg={nameError} />
            </div>
            <div>
              <Label htmlFor="username">Username</Label>
              <input id="username" type="text" value={username} onChange={handleUsernameChange} placeholder="Your username" disabled={!isEditing} className={inputCls(isEditing, !!usernameErrors)} />
              <FieldError msg={usernameErrors} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <input id="email" type="email" value={email} onChange={handleEmailChange} placeholder="you@example.com" disabled={!isEditing} className={inputCls(isEditing, !!emailError)} />
              <FieldError msg={emailError} />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <input id="location" type="text" value={location} onChange={handleLocationChange} placeholder="City, Country" disabled={!isEditing} className={inputCls(isEditing, !!locationError)} />
              <FieldError msg={locationError} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            {isEditing ? (
              <>
                <button
                  onClick={() => { setName(user.fullName||''); setEmail(user.email||''); setLocation(user.location||''); setUsername(user.username||''); setNameError(''); setEmailError(''); setLocationError(''); setUsernameErrors(''); setErrors({}); setIsEditing(false); }}
                  disabled={isSubmitting}
                  className="px-4 py-2 font-sans text-sm border border-border rounded-md bg-card text-text-secondary hover:border-border-strong transition-colors duration-150 disabled:opacity-40"
                >Cancel</button>
                <button
                  onClick={handleSaveChanges}
                  disabled={isSubmitting || !hasChanges()}
                  className="px-5 py-2 font-sans text-sm font-semibold flex items-center gap-2 rounded-md bg-amber text-[#fdf8f0] hover:bg-amber-hover transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? <><div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />Saving…</> : 'Save Changes'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-5 py-2 font-sans text-sm font-semibold flex items-center gap-1.5 rounded-md bg-amber text-[#fdf8f0] hover:bg-amber-hover transition-colors duration-150"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                Edit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Change Password — hidden for OAuth-only accounts */}
      {user.hasPassword && <div>
        <SectionHeader title="Change Password" />
        {passwordErrors.general && (
          <div className="mb-4 p-3.5 rounded-md flex items-start gap-3 text-sm" style={{ backgroundColor: semantic.error.bg, border: '1px solid #fecaca', color: semantic.error.text }}>
            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span className="font-sans">{passwordErrors.general}</span>
          </div>
        )}
        <div className="p-5 space-y-4 bg-card border border-border rounded-lg">
          <div>
            <Label htmlFor="current-password">Current Password</Label>
            <input id="current-password" type="password" value={currentPassword} onChange={handleCurrentPasswordChange} placeholder="Enter your current password" disabled={!isEditingPassword} className={inputCls(isEditingPassword, !!(passwordErrors.currentPassword || currentPasswordError))} />
            <FieldError msg={passwordErrors.currentPassword || currentPasswordError} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="new-password">New Password</Label>
              <input id="new-password" type="password" value={newPassword} onChange={handleNewPasswordChange} placeholder="Create new password" disabled={!isEditingPassword} className={inputCls(isEditingPassword, !!(passwordErrors.newPassword || newPasswordError || (passwordErrors.validation && Object.keys(passwordErrors.validation).length > 0)))} />
              <FieldError msg={passwordErrors.newPassword || newPasswordError} />
              {newPassword && isEditingPassword && (
                <div className="mt-2 grid grid-cols-1 gap-1">
                  {[
                    [passwordErrors.validation?.length,    'At least 8 characters'],
                    [passwordErrors.validation?.uppercase, 'One uppercase letter'],
                    [passwordErrors.validation?.lowercase, 'One lowercase letter'],
                    [passwordErrors.validation?.number,    'One number'],
                    [passwordErrors.validation?.special,   'One special character (!@#$%^&*)'],
                  ].map(([hasErr, label]) => (
                    <p key={label} className="font-sans text-xs flex items-center gap-1" style={{ color: hasErr ? semantic.error.border : semantic.success.text }}>
                      <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {hasErr
                          ? <circle cx="12" cy="12" r="2" fill="currentColor" />
                          : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/>}
                      </svg>
                      {label}
                    </p>
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <input id="confirm-password" type="password" value={confirmPassword} onChange={handleConfirmPasswordChange} placeholder="Confirm your new password" disabled={!isEditingPassword} className={inputCls(isEditingPassword, !!(passwordErrors.confirmPassword || confirmPasswordError))} />
              <FieldError msg={passwordErrors.confirmPassword || confirmPasswordError} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            {isEditingPassword ? (
              <>
                <button
                  onClick={() => { setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setPasswordErrors({}); setCurrentPasswordError(''); setNewPasswordError(''); setConfirmPasswordError(''); setIsEditingPassword(false); }}
                  disabled={isSubmitting}
                  className="px-4 py-2 font-sans text-sm border border-border rounded-md bg-card text-text-secondary hover:border-border-strong transition-colors duration-150 disabled:opacity-40"
                >Cancel</button>
                <button
                  onClick={handleSaveChanges}
                  disabled={isSubmitting || !hasPasswordChanges()}
                  className="px-5 py-2 font-sans text-sm font-semibold flex items-center gap-2 rounded-md bg-amber text-[#fdf8f0] hover:bg-amber-hover transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? <><div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />Updating…</> : 'Update Password'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditingPassword(true)}
                className="px-5 py-2 font-sans text-sm font-semibold flex items-center gap-1.5 rounded-md bg-amber text-[#fdf8f0] hover:bg-amber-hover transition-colors duration-150"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                Change Password
              </button>
            )}
          </div>
        </div>
      </div>}

      {/* Account Actions */}
      <div>
        <SectionHeader title="Account Actions" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 bg-card border border-border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              <h4 className="font-sans text-sm font-semibold text-text-primary">Download Your Data</h4>
            </div>
            <p className="font-sans text-sm mb-4 text-text-muted">Get a copy of your profile, activities, and preferences.</p>
            <button
              className="w-full py-2 font-sans text-sm font-medium border border-border rounded-md bg-canvas text-text-secondary hover:border-border-strong transition-colors duration-150"
              onClick={() => {}}
            >
              Download Data
            </button>
          </div>
          <div className="p-5 rounded-lg" style={{ backgroundColor: semantic.error.bg, border: '1px solid #fecaca' }}>
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: semantic.error.text }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              <h4 className="font-sans text-sm font-semibold" style={{ color: semantic.error.text }}>Delete Account</h4>
            </div>
            <p className="font-sans text-sm mb-4" style={{ color: semantic.error.text, opacity: 0.8 }}>Permanently delete your account. This cannot be undone.</p>
            <button
              className="w-full py-2 font-sans text-sm font-medium rounded-md transition-colors duration-150"
              style={{ border: '1px solid #fecaca', backgroundColor: semantic.error.bg, color: semantic.error.text }}
              onClick={() => router.push('/delete-account')}
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
