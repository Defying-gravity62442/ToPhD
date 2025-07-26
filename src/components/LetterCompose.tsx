import React, { useState } from 'react';
import { useDEK } from './DEKProvider';
import { aesGcmEncrypt, safeBase64Decode } from '../lib/client-crypto';

type LetterComposeProps = {
  onSave: (data: { title: string; content: string; unlockDate: string }) => void;
  onCancel?: () => void;
};

export default function LetterCompose({ onSave, onCancel }: LetterComposeProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [unlockDate, setUnlockDate] = useState('');
  const [encrypting, setEncrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { dek } = useDEK();

  const handleSave = async () => {
    setError(null);
    
    if (!content.trim() || !unlockDate) {
      setError('Content and unlock date are required.');
      return;
    }

    if (!dek) {
      setError('Encryption key not available. Please unlock your data first.');
      return;
    }

    setEncrypting(true);
    
    try {
      // Import DEK as CryptoKey
      const dekKey = await window.crypto.subtle.importKey(
        'raw',
        safeBase64Decode(dek),
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      );

      // Encrypt both title and content
      const encryptedTitle = title.trim() ? await aesGcmEncrypt(title.trim(), dekKey) : null;
      const encryptedContent = await aesGcmEncrypt(content, dekKey);

      onSave({ 
        title: encryptedTitle || '', 
        content: encryptedContent, 
        unlockDate 
      });

      // Clear form after successful save
      setTitle('');
      setContent('');
      setUnlockDate('');
    } catch (e) {
      console.error('Encryption error:', e);
      setError('Failed to encrypt letter. Please try again.');
    } finally {
      setEncrypting(false);
    }
  };

  // Set default unlock date to 6 months from now
  React.useEffect(() => {
    if (!unlockDate) {
      const sixMonthsFromNow = new Date();
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
      setUnlockDate(sixMonthsFromNow.toISOString().split('T')[0]);
    }
  }, [unlockDate]);

  const inspiringPlaceholders = [
    "Dear future me...",
    "What are your hopes and dreams for the next year?",
    "What advice would you give your future self?",
    "What challenges are you facing now that you hope to overcome?",
    "What are you grateful for today?",
    "Describe the person you hope to become.",
    "What do you want to remember about this moment in your life?",
    "What are your biggest goals right now?",
    "What would make your future self proud?"
  ];
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  React.useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIdx((idx) => (idx + 1) % inspiringPlaceholders.length);
    }, 5000); // Change every 5 seconds
    return () => clearInterval(interval);
  }, [inspiringPlaceholders.length]);

  if (!dek) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl border border-gray-200">
        <div className="text-center py-8">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Data Encryption Required</h3>
          <p className="text-gray-500 mb-4">Please unlock your encryption key to write a letter to your future self</p>
          <button
            onClick={() => {
              const event = new CustomEvent('openUnlockModal');
              window.dispatchEvent(event);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800"
          >
            Unlock Data
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl border border-gray-200">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Write to Your Future Self</h2>
        <p className="text-gray-600">
          Capture your current thoughts, hopes, and dreams. Your letter will be securely encrypted until the unlock date.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Title (optional)
          </label>
          <input
            type="text"
            placeholder="Give your letter a title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors"
            disabled={encrypting}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Your Letter <span className="text-gray-500">*</span>
          </label>
          <textarea
            placeholder={inspiringPlaceholders[placeholderIdx]}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors resize-none"
            disabled={encrypting}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Unlock Date <span className="text-gray-500">*</span>
          </label>
          <input
            type="date"
            value={unlockDate}
            onChange={(e) => setUnlockDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors"
            disabled={encrypting}
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Your letter will be unlocked and delivered on this date
          </p>
        </div>

        {error && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-gray-800 text-sm">{error}</span>
          </div>
        </div>
        )}

        <div className="flex gap-3 pt-4">
          <button
            onClick={handleSave}
            disabled={!content.trim() || !unlockDate || encrypting}
            className="flex-1 inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {encrypting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Encrypting & Saving...
              </>
            ) : (
              'Save Letter 🔒'
            )}
          </button>
          
          {onCancel && (
            <button
              onClick={onCancel}
              disabled={encrypting}
              className="px-6 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}