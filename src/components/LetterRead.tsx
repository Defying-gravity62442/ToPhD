import React, { useEffect, useState } from 'react';
import { useDEK } from './DEKProvider';
import { aesGcmDecrypt, safeBase64Decode } from '../lib/client-crypto';
import ReactMarkdown from 'react-markdown';

type LetterReadProps = {
  title?: string; // encrypted
  content: string; // encrypted
  unlockDate: string;
  createdAt: string;
  onBack?: () => void;
};

export default function LetterRead({ title, content, unlockDate, createdAt, onBack }: LetterReadProps) {
  const { dek } = useDEK();
  const [decryptedTitle, setDecryptedTitle] = useState<string>('');
  const [decryptedContent, setDecryptedContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    
    async function decrypt() {
      setLoading(true);
      setError(null);
      
      if (!dek) {
        setError('Encryption key not available. Please unlock your data first.');
        setLoading(false);
        return;
      }

      try {
        const dekKey = await window.crypto.subtle.importKey(
          'raw',
          safeBase64Decode(dek),
          { name: 'AES-GCM' },
          false,
          ['decrypt']
        );

        // Decrypt content (always present)
        const plainContent = await aesGcmDecrypt(content, dekKey);
        if (!cancelled) setDecryptedContent(plainContent);

        // Decrypt title if present
        if (title) {
          const plainTitle = await aesGcmDecrypt(title, dekKey);
          if (!cancelled) setDecryptedTitle(plainTitle);
        } else {
          if (!cancelled) setDecryptedTitle('');
        }
      } catch (e) {
        console.error('Decryption error:', e);
        if (!cancelled) setError('Failed to decrypt letter. Please check your encryption key.');
      }
      
      if (!cancelled) setLoading(false);
    }

    decrypt();
    
    return () => { 
      cancelled = true; 
    };
  }, [content, title, dek]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!dek) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Data Encryption Required</h3>
            <p className="text-gray-500 mb-4">Please unlock your encryption key to read this letter</p>
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
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {loading ? (
                  <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                ) : error ? (
                  'Encrypted Letter'
                ) : (
                  decryptedTitle || `Letter from ${formatDate(createdAt)}`
                )}
              </h1>
              
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 5v2m4-7v3m0 6v1m0-7h-4m4 0v1" />
                  </svg>
                  Written: {formatDate(createdAt)}
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                  Unlocked: {formatDate(unlockDate)}
                </div>
              </div>
            </div>
            
            {onBack && (
              <button
                onClick={onBack}
                className="text-gray-500 hover:text-gray-700 transition-colors p-1"
                title="Back to letters"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

                          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Encrypted & Unlocked
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-4/6"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-3/6"></div>
            </div>
          ) : error ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-gray-700 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-gray-800 font-medium">{error}</span>
              </div>
            </div>
          ) : (
            <div 
              className="prose prose-gray max-w-none"
              style={{ 
                lineHeight: 1.6,
                fontSize: '16px',
                color: '#374151'
              }}
            >
              <ReactMarkdown>{decryptedContent}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              This letter was encrypted with your personal key
            </div>
            {onBack && (
              <button
                onClick={onBack}
                className="inline-flex items-center text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Letters
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}