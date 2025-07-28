import { useState } from 'react';
import { pbkdf2, unwrapDEK, aesGcmDecrypt, safeBase64Decode } from '../lib/client-crypto';

interface SettingsAccountSectionProps {
  isDeleting: boolean;
  handleDeleteAccount: () => void;
}

export default function SettingsAccountSection({ isDeleting, handleDeleteAccount }: SettingsAccountSectionProps) {
  const [showUnlock, setShowUnlock] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Helper to decrypt all fields in the export
  async function decryptExportedData(exportData: any, password: string) {
    console.log('Starting decryption...', { hasUser: !!exportData.user, hasDekSalt: !!exportData.user?.dekSalt, hasEncryptedDEK: !!exportData.user?.encryptedDEK_password });
    // Derive DEK from password and dekSalt
    const dekSalt = exportData.user?.dekSalt;
    const encryptedDEK = exportData.user?.encryptedDEK_password;
    if (!dekSalt || !encryptedDEK) throw new Error('Missing DEK or salt');
    console.log('DEK salt and encrypted DEK found, deriving key...');
    const dekKey = await pbkdf2(password, dekSalt);
    console.log('Key derived, unwrapping DEK...');
    // Unwrap DEK using the correct format
    const dek = await unwrapDEK(encryptedDEK, dekKey);
    console.log('DEK unwrapped successfully, length:', dek.length);
    // Now use dek as the key to decrypt all encrypted fields
    const dekCryptoKey = await window.crypto.subtle.importKey(
      'raw',
      safeBase64Decode(dek),
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    console.log('DEK imported as CryptoKey, decrypting journal entries...');
    // Decrypt journal entries
    const journalEntries = await Promise.all(
      (exportData.journalEntries || []).map(async (entry: any) => ({
        ...entry,
        // Keep original encrypted data
        encryptedData: entry.encryptedData,
        // Add decrypted version
        decryptedData: await aesGcmDecrypt(entry.encryptedData, dekCryptoKey).catch(() => '[decryption failed]'),
      }))
    );
    console.log('Journal entries decrypted, decrypting future letters...');
    // Decrypt future letters
    const futureLetters = await Promise.all(
      (exportData.futureLetters || []).map(async (letter: any) => ({
        ...letter,
        // Keep original encrypted content
        content: letter.content,
        // Add decrypted version
        decryptedContent: await aesGcmDecrypt(letter.content, dekCryptoKey).catch(() => '[decryption failed]'),
      }))
    );
    // Decrypt goals
    const goals = await Promise.all(
      (exportData.goals || []).map(async (goal: any) => ({
        ...goal,
        // Keep original encrypted fields
        title: goal.title,
        description: goal.description,
        // Add decrypted versions
        decryptedTitle: await aesGcmDecrypt(goal.title, dekCryptoKey).catch(() => '[decryption failed]'),
        decryptedDescription: goal.description ? await aesGcmDecrypt(goal.description, dekCryptoKey).catch(() => '[decryption failed]') : null,
      }))
    );
    // Decrypt milestones
    const milestones = await Promise.all(
      (exportData.milestones || []).map(async (milestone: any) => ({
        ...milestone,
        // Keep original encrypted fields
        title: milestone.title,
        description: milestone.description,
        // Add decrypted versions
        decryptedTitle: await aesGcmDecrypt(milestone.title, dekCryptoKey).catch(() => '[decryption failed]'),
        decryptedDescription: milestone.description ? await aesGcmDecrypt(milestone.description, dekCryptoKey).catch(() => '[decryption failed]') : null,
      }))
    );
    console.log('Future letters decrypted, returning result...');
    // Return a new object with decrypted fields
    return {
      ...exportData,
      journalEntries,
      futureLetters,
      goals,
      milestones,
      note: 'This file contains your decrypted data. Keep it safe!'
    };
  }

  const handleExportData = () => {
    setShowUnlock(true);
    setExportError(null);
    setPassword('');
  };

  const handleUnlock = async (password: string) => {
    setIsExporting(true);
    setExportError(null);
    try {
      console.log('Fetching export data...');
      const res = await fetch('/api/user/export-data');
      if (!res.ok) throw new Error('Failed to export data');
      const exportData = await res.json();
      console.log('Export data fetched, starting decryption...');
      // Decrypt all fields
      const decrypted = await decryptExportedData(exportData, password);
      console.log('Decryption completed, creating download...');
      // Download as JSON
      const blob = new Blob([JSON.stringify(decrypted, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'my_data_decrypted.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setShowUnlock(false);
      setIsExporting(false);
      return true;
    } catch (err) {
      console.error('Export/decryption error:', err);
      setExportError('Failed to decrypt or download data. Please check your password and try again.');
      setIsExporting(false);
      return false;
    }
  };

  const handleSubmitPassword = async () => {
    if (!password.trim()) {
      setExportError('Please enter your password.');
      return;
    }
    const success = await handleUnlock(password);
    if (!success) {
      setPassword('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmitPassword();
    }
  };

  return (
    <div className="space-y-8">
      {/* Data Export Section */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6 font-['Nanum_Myeongjo']">
          Export Your Data
        </h2>
        <p className="text-gray-600 font-['Nanum_Myeongjo'] mb-6">
          Download a complete copy of all your data in a readable format
        </p>
        
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 mb-6">
          <h3 className="font-semibold text-gray-900 font-['Nanum_Myeongjo'] mb-3">
            What&apos;s included in your export:
          </h3>
          <ul className="text-sm text-gray-600 space-y-1 font-['Nanum_Myeongjo']">
            <li>• All your journal entries</li>
            <li>• Your goals and milestones</li>
            <li>• Future letters to yourself</li>
            <li>• Account preferences and settings</li>
            <li>• AI Companion conversation history</li>
          </ul>
        </div>
        
        <button
          type="button"
          onClick={handleExportData}
          disabled={isExporting}
          className="w-full inline-flex items-center justify-center rounded-lg px-8 h-14 text-lg font-semibold text-white bg-gray-900 hover:bg-gray-800 active:bg-black transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-['Nanum_Myeongjo']"
        >
          {isExporting ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Preparing Download...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download My Data
            </>
          )}
        </button>
        {exportError && (
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-gray-700 font-['Nanum_Myeongjo']">{exportError}</p>
          </div>
        )}
      </div>

      {/* Account Deletion Section */}
      <div className="pt-6 border-t border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 font-['Nanum_Myeongjo']">
          Delete Account
        </h2>
        <p className="text-gray-600 font-['Nanum_Myeongjo'] mb-6">
          Permanently remove your account and all associated data
        </p>

        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 mb-6">
          <div className="flex items-start space-x-3 mb-4">
            <svg className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h3 className="font-semibold text-gray-800 font-['Nanum_Myeongjo'] mb-2">
                This action cannot be undone
              </h3>
              <p className="text-sm text-gray-700 font-['Nanum_Myeongjo']">
                All your data will be permanently deleted from our servers, including:
              </p>
            </div>
          </div>

          <ul className="text-sm text-gray-700 space-y-1 font-['Nanum_Myeongjo']">
            <li>• All your goals and milestones</li>
            <li>• Your AI assistant preferences and coaching history</li>
            <li>• Your academic information and profile</li>
            <li>• All journal entries and future letters</li>
            <li>• Your account settings and preferences</li>
          </ul>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-gray-800 font-['Nanum_Myeongjo']">
              <p className="font-medium mb-1">Google Calendar Integration</p>
              <p>
                If you connected Google Calendar, you must also remove this app from your 
                <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="underline ml-1">
                  Google Account permissions
                </a> 
                to fully disconnect.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDeleteAccount}
          disabled={isDeleting}
          className="w-full inline-flex items-center justify-center rounded-lg px-8 h-14 text-lg font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-['Nanum_Myeongjo']"
        >
          {isDeleting ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Deleting Account...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete My Account
            </>
          )}
        </button>
      </div>

      {/* Password Modal */}
      {showUnlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 border border-gray-200">
            {/* Header */}
            <div className="px-6 py-6 text-center border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 font-['Nanum_Myeongjo'] mb-2">
                Re-enter Your Password
              </h3>
              <p className="text-gray-600 font-['Nanum_Myeongjo'] text-sm">
                Enter your encryption password to download your data
              </p>
            </div>

            {/* Content */}
            <div className="px-6 py-6">
              <form onSubmit={(e) => { e.preventDefault(); handleSubmitPassword(); }}>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 font-['Nanum_Myeongjo'] mb-2">
                    Encryption Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base font-['Nanum_Myeongjo'] focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all duration-200 pr-12"
                      disabled={isExporting}
                      autoComplete="current-password"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100 transition-colors"
                      tabIndex={-1}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 font-['Nanum_Myeongjo']">
                    This is the password you set during account creation
                  </p>
                </div>

                {/* Error Message */}
                {exportError && (
                  <div className="mb-6 p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <div className="flex items-start space-x-2">
                      <svg className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-sm text-gray-700 font-['Nanum_Myeongjo']">
                        {exportError}
                      </div>
                    </div>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={isExporting || !password.trim()}
                    className="flex-1 inline-flex items-center justify-center rounded-lg px-6 h-11 text-base font-semibold text-white bg-gray-900 hover:bg-black active:bg-gray-800 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed font-['Nanum_Myeongjo']"
                  >
                    {isExporting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Decrypting...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Decrypt & Download
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUnlock(false)}
                    disabled={isExporting}
                    className="px-6 h-11 rounded-lg text-base font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 font-['Nanum_Myeongjo']"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 