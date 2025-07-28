'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useDEK } from '@/components/DEKProvider';
import LetterList from '@/components/LetterList';
import LetterCompose from '@/components/LetterCompose';
import LetterRead from '@/components/LetterRead';
import UnlockDEKModal from '@/components/UnlockDEKModal';
import CalendarNotification from '@/components/CalendarNotification';

type Letter = {
  id: string;
  title?: string;
  content?: string;
  unlockDate: string;
  delivered: boolean;
  createdAt: string;
};

export default function FutureLettersPage() {
  const { status } = useSession();
  const router = useRouter();
  const { dek } = useDEK();
  
  const [letters, setLetters] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockPopup, setUnlockPopup] = useState<{ id: string; title?: string; } | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  // Listen for unlock modal events
  useEffect(() => {
    const handleOpenUnlock = () => {
      setShowUnlockModal(true);
    };
    
    window.addEventListener('openUnlockModal', handleOpenUnlock);
    return () => window.removeEventListener('openUnlockModal', handleOpenUnlock);
  }, []);

  // Fetch letters
  useEffect(() => {
    const fetchLetters = async () => {
      if (!dek) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/future-letters');
        if (response.ok) {
          const data = await response.json();
          setLetters(data || []);
        } else {
          setError('Failed to fetch letters');
        }
      } catch (err) {
        console.error('Error fetching letters:', err);
        setError('Failed to fetch letters');
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated' && dek) {
      fetchLetters();
    }
  }, [status, dek]);

  // Show pop-up when a letter is ready to unlock (only once per letter per session)
  useEffect(() => {
    if (!letters.length) return;
    const now = new Date();
    // Track shown popups in sessionStorage
    let shownIds = new Set<string>();
    try {
      const storedPopups = sessionStorage.getItem('unlockedLetterPopups');
      if (storedPopups) {
        shownIds = new Set(JSON.parse(storedPopups));
      }
    } catch (error) {
      console.error('Failed to parse unlocked letter popups from sessionStorage:', error);
      // Clear invalid data
      sessionStorage.removeItem('unlockedLetterPopups');
    }
    
    const readyLetter = letters.find(
      (l) => new Date(l.unlockDate) <= now && !shownIds.has(l.id)
    );
    if (readyLetter) {
      setUnlockPopup({ id: readyLetter.id, title: readyLetter.title });
      shownIds.add(readyLetter.id);
      try {
        sessionStorage.setItem('unlockedLetterPopups', JSON.stringify(Array.from(shownIds)));
      } catch (error) {
        console.error('Failed to save unlocked letter popups to sessionStorage:', error);
      }
    }
  }, [letters]);

  const handleLetterSelect = async (letterId: string) => {
    try {
      const response = await fetch(`/api/future-letters/${letterId}`);
      if (response.ok) {
        await response.json();
        setSelectedLetter(letterId);
      }
    } catch (error) {
      console.error('Error fetching letter:', error);
    }
  };

  const handleLetterDelete = async (letterId: string) => {
    if (!confirm('Are you sure you want to delete this letter? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/future-letters/${letterId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setLetters(prev => prev.filter(letter => letter.id !== letterId));
        if (selectedLetter === letterId) {
          setSelectedLetter(null);
        }
      }
    } catch (error) {
      console.error('Error deleting letter:', error);
    }
  };

  const handleSaveLetter = async (data: { title: string; content: string; unlockDate: string }) => {
    if (!dek) return;
    
    try {
      const response = await fetch('/api/future-letters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        setShowCompose(false);
        // Refresh letters
        const res = await fetch('/api/future-letters');
        if (res.ok) {
          const data = await res.json();
          setLetters(data || []);
        }
      }
    } catch (error) {
      console.error('Error saving letter:', error);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-xl font-['Nanum_Myeongjo']">Loading...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Unlock pop-up notification */}
      {unlockPopup && (
        <CalendarNotification
          message={`A letter to your future self${unlockPopup.title ? ` — "${unlockPopup.title}"` : ''} is ready to unlock. Take a moment to reflect on your journey and see what your past self wanted to share!`}
          type="success"
          onClose={() => setUnlockPopup(null)}
          duration={7000}
        />
      )}
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-600 hover:text-gray-900"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-2xl font-extrabold tracking-tight text-gray-900 font-['Nanum_Myeongjo']">
              Letters to Future Self
            </div>
          </div>
          <button
            onClick={() => setShowCompose(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800 font-['Nanum_Myeongjo']"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Write New Letter
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {error && (
                  <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="ml-3 text-sm font-medium text-gray-800 font-['Nanum_Myeongjo']">{error}</p>
          </div>
        </div>
        )}

        {!dek ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900 font-['Nanum_Myeongjo']">Unlock your data to access letters</h3>
            <p className="mt-2 text-gray-500 font-['Nanum_Myeongjo']">Your letters are encrypted for privacy</p>
            <button
              onClick={() => setShowUnlockModal(true)}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800 font-['Nanum_Myeongjo']"
            >
              Unlock Data
            </button>
          </div>
        ) : selectedLetter ? (
          <LetterRead
            title={letters.find(letter => letter.id === selectedLetter)?.title || ''}
            content={letters.find(letter => letter.id === selectedLetter)?.content || ''}
            unlockDate={letters.find(letter => letter.id === selectedLetter)?.unlockDate || ''}
            createdAt={letters.find(letter => letter.id === selectedLetter)?.createdAt || ''}
            onBack={() => {
              setSelectedLetter(null);
            }}
          />
        ) : showCompose ? (
          <LetterCompose
            onSave={handleSaveLetter}
            onCancel={() => setShowCompose(false)}
          />
        ) : (
          <LetterList
            letters={letters}
            onSelect={handleLetterSelect}
            onDelete={handleLetterDelete}
          />
        )}
      </main>

      {/* Unlock Modal */}
      {showUnlockModal && (
        <UnlockDEKModal 
          onUnlock={async (password) => {
            try {
              const res = await fetch('/api/user/encryption/unlock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
              });
              if (res.ok) {
                await res.json();
                // Note: We can't set dek here as it's managed by DEKProvider
                setShowUnlockModal(false);
                return true;
              }
              return false;
            } catch (error) {
              console.error('Error unlocking DEK:', error);
              return false;
            }
          }}
          mode="unlock"
          onSkip={() => setShowUnlockModal(false)}
        />
      )}
    </div>
  );
} 