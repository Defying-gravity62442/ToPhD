'use client'

import React, { useEffect, useState, useContext, createContext } from 'react';
import { useDEK } from '@/components/DEKProvider';
import { aesGcmDecrypt, safeBase64Decode } from '@/lib/client-crypto';
import { SessionProvider, useSession } from 'next-auth/react';
import UnlockDEKModal from '@/components/UnlockDEKModal';
import { DEKProvider } from '@/components/DEKProvider';

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  completed: boolean;
  syncEnabled?: boolean;
}

interface Goal {
  id: string;
  title: string;
  description: string | null;
  status: string;
  milestones: Milestone[];
}

interface DecryptedGoalsContextType {
  decryptedGoals: Goal[];
  setDecryptedGoals: (goals: Goal[]) => void;
  refreshDecryptedGoals: () => Promise<void>;
}

const DecryptedGoalsContext = createContext<DecryptedGoalsContextType | undefined>(undefined);

function DEKGate({ children }: { children: React.ReactNode }) {
  const { status } = useSession()
  const { dek, setDek } = useDEK()
  const [showModal, setShowModal] = useState(false)
  const [mode, setMode] = useState<'unlock' | 'set'>('unlock')
  const [loading, setLoading] = useState(true)
  const [userHasE2EE, setUserHasE2EE] = useState(false)
  const [allowSkip, setAllowSkip] = useState(false)

  useEffect(() => {
    if (status === 'authenticated') {
      // Check E2EE status
      fetch('/api/user/me')
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch user')
          return res.json()
        })
        .then(user => {
          setUserHasE2EE(user.hasE2EE)
          
          if (user.hasE2EE) {
            // User has E2EE set up, they need to unlock
            setMode('unlock')
            setShowModal(true)
            setAllowSkip(false) // Can't skip if E2EE is already set up
          } else {
            // New user without E2EE - let them use the app but offer to set up E2EE
            setMode('set')
            setShowModal(false) // Don't force modal for new users
            setAllowSkip(true) // Allow skipping E2EE setup
          }
          setLoading(false)
        })
        .catch(error => {
          console.error('Error checking user status:', error)
          // On error, allow access without E2EE
          setLoading(false)
          setAllowSkip(true)
        })
    } else if (status === 'unauthenticated') {
      setShowModal(false)
      setLoading(false)
    } else if (status === 'loading') {
      // Keep loading while session is loading
      setLoading(true)
    }
  }, [status])

  const handleUnlock = async (password: string) => {
    try {
      const res = await fetch('/api/user/encryption/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })
      if (res.ok) {
        const data = await res.json()
        setDek(data.dek)
        setShowModal(false)
        return true
      }
      return false
    } catch (error) {
      console.error('Error unlocking DEK:', error)
      return false
    }
  }

  const handleSetPassword = async (password: string, recoveryCode: string) => {
    try {
      const res = await fetch('/api/user/encryption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, recoveryCode })
      })
      if (res.ok) {
        setUserHasE2EE(true)
        // Now unlock
        return await handleUnlock(password)
      }
      return false
    } catch (error) {
      console.error('Error setting up E2EE:', error)
      return false
    }
  }

  const handleSkip = () => {
    setShowModal(false)
    // User can use app without E2EE for now
  }

  if (loading) {
    return <div>Loading...</div>
  }

  // If user has E2EE set up but hasn't unlocked yet, block access
  if (userHasE2EE && !dek && showModal) {
    return (
      <UnlockDEKModal
        mode={mode}
        onUnlock={handleUnlock}
        onSetPassword={handleSetPassword}
        allowSkip={false} // Can't skip if E2EE is already enabled
      />
    )
  }

  // If new user wants to set up E2EE
  if (!userHasE2EE && showModal) {
    return (
      <UnlockDEKModal
        mode={mode}
        onUnlock={handleUnlock}
        onSetPassword={handleSetPassword}
        onSkip={allowSkip ? handleSkip : undefined}
      />
    )
  }

  // Render app with optional E2EE setup button for new users
  return (
    <>
      {children}
      {/* Removed floating Set up Encryption button */}
    </>
  )
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <DEKProvider>
        <DecryptedGoalsProvider>
          <DEKGate>
            {children}
          </DEKGate>
        </DecryptedGoalsProvider>
      </DEKProvider>
    </SessionProvider>
  )
}

export function DecryptedGoalsProvider({ children }: { children: React.ReactNode }) {
  const { dek } = useDEK();
  const [decryptedGoals, setDecryptedGoals] = useState<Goal[]>([]);

  const refreshDecryptedGoals = async () => {
    if (!dek) {
      setDecryptedGoals([]);
      return;
    }
    try {
      const res = await fetch('/api/goals');
      if (!res.ok) return setDecryptedGoals([]);
      const data = await res.json();
      const goals = data.goals || [];
      const dekKey = await window.crypto.subtle.importKey(
        'raw',
        safeBase64Decode(dek),
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
      );
      const decrypted = await Promise.all(
        goals.map(async (goal: Goal) => {
          try {
            const decryptedMilestones = await Promise.all(
              goal.milestones.map(async (milestone: Milestone) => {
                try {
                  return {
                    ...milestone,
                    title: await aesGcmDecrypt(milestone.title, dekKey),
                    description: milestone.description ? await aesGcmDecrypt(milestone.description, dekKey) : null,
                  };
                } catch {
                  return {
                    ...milestone,
                    title: 'Unable to decrypt',
                    description: 'Unable to decrypt',
                  };
                }
              })
            );
            return {
              ...goal,
              title: await aesGcmDecrypt(goal.title, dekKey),
              description: goal.description ? await aesGcmDecrypt(goal.description, dekKey) : null,
              milestones: decryptedMilestones,
            };
          } catch {
            return {
              ...goal,
              title: 'Unable to decrypt',
              description: 'Unable to decrypt',
              milestones: [],
            };
          }
        })
      );
      setDecryptedGoals(decrypted);
    } catch {
      setDecryptedGoals([]);
    }
  };

  useEffect(() => {
    refreshDecryptedGoals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dek]);

  return (
    <DecryptedGoalsContext.Provider value={{ decryptedGoals, setDecryptedGoals, refreshDecryptedGoals }}>
      {children}
    </DecryptedGoalsContext.Provider>
  );
}

export function useDecryptedGoals() {
  const ctx = useContext(DecryptedGoalsContext);
  if (!ctx) throw new Error('useDecryptedGoals must be used within a DecryptedGoalsProvider');
  return ctx;
}