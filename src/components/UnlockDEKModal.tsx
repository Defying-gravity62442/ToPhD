import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Info } from 'lucide-react';

// Rename to UnlockDEKPage and refactor to be a full-page component

type UnlockDEKPageProps = {
  onUnlock: (password: string) => Promise<boolean>;
  onSetPassword?: (password: string, recoveryCode: string) => Promise<boolean>;
  mode: 'unlock' | 'set';
  error?: string;
  onSkip?: () => void;
  allowSkip?: boolean;
  sessionReady?: boolean;
};

export default function UnlockDEKPage({ onUnlock, onSetPassword, mode, error, sessionReady = true }: UnlockDEKPageProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showRecoveryInfo, setShowRecoveryInfo] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showRecovery, setShowRecovery] = useState(false); // NEW: recovery mode
  const [recoveryNewPassword, setRecoveryNewPassword] = useState('');
  const [recoveryConfirm, setRecoveryConfirm] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoverySuccess, setRecoverySuccess] = useState(false);

  const calculatePasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 8) strength += 25;
    if (pwd.length >= 12) strength += 25;
    if (/[A-Z]/.test(pwd)) strength += 15;
    if (/[a-z]/.test(pwd)) strength += 15;
    if (/[0-9]/.test(pwd)) strength += 10;
    if (/[^A-Za-z0-9]/.test(pwd)) strength += 10;
    return Math.min(strength, 100);
  };

  useEffect(() => {
    if (mode === 'set') {
      setPasswordStrength(calculatePasswordStrength(password));
    }
  }, [password, mode]);

  const getPasswordStrengthText = (strength: number) => {
    if (strength < 40) return 'Weak';
    if (strength < 70) return 'Good';
    return 'Strong';
  };

  const handleUnlock = async () => {
    setLoading(true);
    setLocalError(null);
    try {
      const ok = await onUnlock(password);
      if (!ok) setLocalError('Incorrect password.');
    } catch {
      setLocalError('An error occurred. Please try again.');
    }
    setLoading(false);
  };

  const handleSet = async () => {
    setLoading(true);
    setLocalError(null);
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters.');
      setLoading(false);
      return;
    }
    if (password !== confirm) {
      setLocalError('Passwords do not match.');
      setLoading(false);
      return;
    }
    if (!recoveryCode || recoveryCode.length < 6) {
      setLocalError('Recovery code must be at least 6 characters.');
      setLoading(false);
      return;
    }
    if (!onSetPassword) {
      setLocalError('Password setup not available.');
      setLoading(false);
      return;
    }
    try {
      const ok = await onSetPassword(password, recoveryCode);
      if (!ok) setLocalError('Failed to set password.');
    } catch {
      setLocalError('An error occurred. Please try again.');
    }
    setLoading(false);
  };

  const handleRecovery = async () => {
    setRecoveryLoading(true);
    setRecoveryError(null);
    if (!recoveryCode || recoveryCode.length < 6) {
      setRecoveryError('Recovery code must be at least 6 characters.');
      setRecoveryLoading(false);
      return;
    }
    if (recoveryNewPassword.length < 8) {
      setRecoveryError('New password must be at least 8 characters.');
      setRecoveryLoading(false);
      return;
    }
    if (recoveryNewPassword !== recoveryConfirm) {
      setRecoveryError('Passwords do not match.');
      setRecoveryLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/user/encryption/recovery/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: recoveryCode, newPassword: recoveryNewPassword })
      });
      if (res.ok) {
        setRecoverySuccess(true);
        // Optionally auto-unlock with new password
        if (onUnlock) {
          await onUnlock(recoveryNewPassword);
        }
      } else {
        const data = await res.json();
        setRecoveryError(data.error || 'Failed to reset password.');
      }
    } catch {
      setRecoveryError('An error occurred. Please try again.');
    }
    setRecoveryLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (mode === 'unlock' && password) {
        handleUnlock();
      } else if (mode === 'set' && password && confirm && recoveryCode && password === confirm) {
        handleSet();
      }
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="text-2xl font-extrabold tracking-tight text-gray-900 font-['Nanum_Myeongjo']">
            ToPhD
          </div>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-6 lg:px-8 py-20">
        <div className="max-w-xl mx-auto w-full">
          {mode === 'unlock' && showRecovery ? (
            <>
              <h1 className="text-3xl font-black text-gray-900 font-['Nanum_Myeongjo'] mb-6 text-center">Recover Encryption Access</h1>
              {recoverySuccess ? (
                <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded text-gray-800 text-center">
                  Password reset! You can now unlock your data with your new password.
                  <button
                    className="block mt-4 mx-auto px-6 py-2 rounded bg-gray-900 text-white hover:bg-gray-800"
                    onClick={() => { setShowRecovery(false); setPassword(''); }}
                  >Back to Unlock</button>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2 font-['Nanum_Myeongjo']">Recovery Code</label>
                    <input
                      type="text"
                      placeholder="Enter your recovery code"
                      value={recoveryCode}
                      onChange={e => setRecoveryCode(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg text-base font-['Nanum_Myeongjo'] focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors"
                      disabled={recoveryLoading}
                      autoComplete="off"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2 font-['Nanum_Myeongjo']">New Password (min 8 characters)</label>
                    <input
                      type="password"
                      placeholder="Enter a new password"
                      value={recoveryNewPassword}
                      onChange={e => setRecoveryNewPassword(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg text-base font-['Nanum_Myeongjo'] focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors"
                      disabled={recoveryLoading}
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2 font-['Nanum_Myeongjo']">Confirm New Password</label>
                    <input
                      type="password"
                      placeholder="Confirm new password"
                      value={recoveryConfirm}
                      onChange={e => setRecoveryConfirm(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg text-base font-['Nanum_Myeongjo'] focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors"
                      disabled={recoveryLoading}
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="flex gap-3 mb-4">
                    <button
                      onClick={handleRecovery}
                      disabled={recoveryLoading}
                      className="flex-1 rounded-lg px-8 h-12 text-lg font-semibold text-white bg-gray-900 hover:bg-gray-800 transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {recoveryLoading ? 'Resetting...' : 'Reset Password'}
                    </button>
                    <button
                      onClick={() => { setShowRecovery(false); setRecoveryError(null); setRecoverySuccess(false); }}
                      disabled={recoveryLoading}
                      className="flex-1 rounded-lg px-8 h-12 text-lg font-semibold text-gray-900 bg-gray-100 hover:bg-gray-200 transition-all duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                  {recoveryError && (
                    <div className="mt-2 p-3 rounded-md text-sm bg-gray-50 text-gray-800 border border-gray-200 text-center">
                      {recoveryError}
                    </div>
                  )}
                </>
              )}
            </>
          ) : mode === 'unlock' ? (
            <>
              <h1 className="text-3xl font-black text-gray-900 font-['Nanum_Myeongjo'] mb-6 text-center">Enter Encryption Password</h1>
              <div className="mb-6">
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="w-full p-3 border border-gray-300 rounded-lg text-base font-['Nanum_Myeongjo'] focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors pr-12"
                    disabled={loading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              <button
                onClick={handleUnlock}
                disabled={loading || !password}
                className="w-full flex items-center justify-center rounded-lg px-8 h-12 text-lg font-semibold text-white bg-gray-900 hover:bg-gray-800 active:bg-black transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 shadow-lg hover:shadow-xl disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Unlocking...
                  </>
                ) : (
                  'Unlock'
                )}
              </button>
              <div className="mt-4 text-center">
                <button
                  type="button"
                  className="text-sm text-gray-500 hover:text-gray-900 underline"
                  onClick={() => { setShowRecovery(true); setLocalError(null); }}
                >
                  Forgot password? Recover with code
                </button>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-black text-gray-900 font-['Nanum_Myeongjo'] mb-6 text-center">Set Encryption Password</h1>
              <div className="mb-6 text-gray-700 text-base font-['Nanum_Myeongjo'] text-center">
                <p>
                  To protect your privacy, we use <b>end-to-end encryption</b> for your journals, goals, milestones, and letters to yourself. This means <b>only you</b> can read them—even our developers cannot access your private data. Feel free to write as openly as you would in a physical journal.
                </p>
                <p className="mt-4 text-gray-600 text-sm">
                  <strong>Recovery code:</strong> Please set a recovery code (like a passphrase or PIN). <b>If you lose both your password and this recovery code, your encrypted data cannot be recovered.</b> <span className="text-gray-400">We cannot help you recover your data if you lose both.</span>
                </p>
              </div>
              {/* Password field */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2 font-['Nanum_Myeongjo']">Password (minimum 8 characters)</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter a strong password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="w-full p-3 border border-gray-300 rounded-lg text-base font-['Nanum_Myeongjo'] focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors pr-12"
                    disabled={loading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {/* Password strength indicator */}
                {password && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Password strength</span>
                      <span className={passwordStrength >= 70 ? 'text-gray-900' : 'text-gray-400'}>
                        {getPasswordStrengthText(passwordStrength)}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded">
                      <div
                        className={`h-2 rounded transition-all duration-300 ${
                          passwordStrength >= 70
                            ? 'bg-gray-900'
                            : passwordStrength >= 40
                            ? 'bg-gray-500'
                            : 'bg-gray-300'
                        }`}
                        style={{ width: `${passwordStrength}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              {/* Confirm password */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2 font-['Nanum_Myeongjo']">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="w-full p-3 border border-gray-300 rounded-lg text-base font-['Nanum_Myeongjo'] focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors pr-12"
                    disabled={loading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {confirm && password !== confirm && (
                  <div className="text-xs text-gray-400 mt-1">&#9888; Passwords don&apos;t match</div>
                )}
                {confirm && password === confirm && password.length >= 8 && (
                  <div className="text-xs text-gray-700 mt-1">&#10003; Passwords match</div>
                )}
              </div>
              {/* Recovery code */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700 font-['Nanum_Myeongjo']">Recovery Code</label>
                  <button
                    type="button"
                    onClick={() => setShowRecoveryInfo(!showRecoveryInfo)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                  >
                    <Info size={14} /> Why needed?
                  </button>
                </div>
                {showRecoveryInfo && (
                  <div className="bg-gray-50 border border-gray-200 rounded p-3 mb-2 text-sm text-gray-700">
                    <strong>Important:</strong> If you forget your password, this recovery code is the only way to access your encrypted data. Save it somewhere safe—we cannot recover your data without it.
                  </div>
                )}
                <input
                  type="text"
                  placeholder="Create a memorable recovery phrase (min 6 characters)"
                  value={recoveryCode}
                  onChange={e => setRecoveryCode(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full p-3 border border-gray-300 rounded-lg text-base font-['Nanum_Myeongjo'] focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors"
                  disabled={loading}
                  autoComplete="off"
                />
              </div>
              <button
                onClick={handleSet}
                disabled={loading || !password || !confirm || !recoveryCode || password !== confirm || password.length < 8 || !sessionReady}
                className="w-full flex items-center justify-center rounded-lg px-8 h-12 text-lg font-semibold text-white bg-gray-900 hover:bg-gray-800 active:bg-black transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 shadow-lg hover:shadow-xl disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Setting up...
                  </>
                ) : (
                  'Set Password & Recovery Code'
                )}
              </button>
              {!sessionReady && (
                <div className="mt-2 text-sm text-gray-500 text-center">Session not ready. Please wait...</div>
              )}
            </>
          )}
          {/* Error display */}
          {(localError || error) && (
            <div className="mt-6 p-3 rounded-md text-sm bg-gray-50 text-gray-800 border border-gray-200 text-center">
              {localError || error}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}