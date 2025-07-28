'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Roadmap from '@/components/RoadmapDisplay';
import JournalSummary from '@/components/JournalSummary';
import AICompanion from '@/components/AICompanion';
import { useDEK } from '@/components/DEKProvider';
import { aesGcmDecrypt, aesGcmEncrypt, safeBase64Decode, validateDEK } from '@/lib/client-crypto';
import UnlockDEKModal from '@/components/UnlockDEKModal';
import ReactMarkdown from 'react-markdown';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useSession, signOut } from 'next-auth/react';

import PastDueMilestoneModal from '@/components/PastDueMilestoneModal';
import { getJournalDate, getUserTimeZone } from '@/lib/date-utils';

interface Milestone {
  id: string
  title: string
  description: string | null
  dueDate: string | null
  completed: boolean
  syncEnabled?: boolean
}

interface Goal {
  id: string
  title: string
  description: string | null
  status: string
  milestones: Milestone[]
}

type CompanionMessage = {
  role: 'user' | 'companion';
  content: string;
};

export default function DashboardPage() {
  const { status } = useSession();
  const router = useRouter()
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const { dek, setDek } = useDEK();

  // Add assistantName state
  const [assistantName, setAssistantName] = useState<string>('');

  // Journal state
  const [journalContent, setJournalContent] = useState('');
  const [journalPrompt, setJournalPrompt] = useState('');
  const [journalEntryId, setJournalEntryId] = useState<string | null>(null);
  const [isSavingJournal, setIsSavingJournal] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // AI Companion state
  const [companionMessages, setCompanionMessages] = useState<CompanionMessage[]>([]);
  const [companionLoading, setCompanionLoading] = useState(false);
  const [companionError, setCompanionError] = useState<string | null>(null);
  const [companionStarted, setCompanionStarted] = useState(false);

  // Upcoming milestones state
  const [upcomingMilestones, setUpcomingMilestones] = useState<Array<{
    id: string;
    title: string;
    dueDate: string;
    goalTitle: string;
  }>>([]);

  // Future Letters state
  const [futureLetters, setFutureLetters] = useState<Array<{
    id: string;
    title?: string;
    unlockDate: string;
    delivered: boolean;
    createdAt: string;
  }>>([]);
  const [showLetterCompose, setShowLetterCompose] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [letterContent, setLetterContent] = useState('');
  const [letterTitle, setLetterTitle] = useState('');
  const [letterUnlockDate, setLetterUnlockDate] = useState('');
  const [isSavingLetter, setIsSavingLetter] = useState(false);

  // Decrypted goals state
  const [decryptedGoals, setDecryptedGoals] = useState<Goal[]>([]);
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);
  const [syncEnabledMap, setSyncEnabledMap] = useState<Record<string, boolean>>({});



  // Mood Analytics state
  const [moodData, setMoodData] = useState<{ mood: string | null; _count: { mood: number } }[]>([]);
  const [moodLoading, setMoodLoading] = useState(false);
  const [moodError, setMoodError] = useState<string | null>(null);

  // Add state for past-due milestone modal
  const [pastDueMilestones, setPastDueMilestones] = useState<Array<{
    id: string;
    title: string;
    dueDate: string;
    goalTitle: string;
  }>>([]);
  const [currentPastDueIndex, setCurrentPastDueIndex] = useState(0);
  const [showPastDueModal, setShowPastDueModal] = useState(false);

  // Add state for journal entry count
  const [journalEntryCount, setJournalEntryCount] = useState<number | null>(null);



  // Auto-clear update errors
  useEffect(() => {
    if (updateError) {
      const timer = setTimeout(() => setUpdateError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [updateError]);



  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [status, router])

  // Listen for unlock modal events
  useEffect(() => {
    const handleOpenUnlock = () => {
      setShowUnlockModal(true)
    }
    
    window.addEventListener('openUnlockModal', handleOpenUnlock)
    return () => window.removeEventListener('openUnlockModal', handleOpenUnlock)
  }, [])

  // Fetch goals with proper cleanup
  useEffect(() => {
    let isMounted = true;
    let abortController: AbortController | null = null;
    
    const fetchGoals = async () => {
      if (status !== 'authenticated') return;
      
      try {
        setLoading(true);
        abortController = new AbortController();
        
        const response = await fetch('/api/goals', {
          signal: abortController.signal
        });
        
        if (!isMounted) return;
        
        if (response.ok) {
          const data = await response.json();
          setGoals(data.goals || []);
        } else {
          console.error('Failed to fetch goals:', response.status);
        }
      } catch (err) {
        if (!isMounted) return;
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        console.error('Error fetching goals:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchGoals();
    
    return () => {
      isMounted = false;
      if (abortController) {
        abortController.abort();
      }
    };
  }, [status]);

  // Check for calendar connection success
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('calendar') === 'connected' && urlParams.get('success') === 'true') {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Fetch journal prompt with proper cleanup
  useEffect(() => {
    let isMounted = true;
    let abortController: AbortController | null = null;
    
    const fetchPrompt = async () => {
      if (!dek) return;
      
      // Cancel any existing request
      if (abortController) {
        abortController.abort();
      }
      
      abortController = new AbortController();
      
      try {
        const timeZone = getUserTimeZone();
        const response = await fetch(`/api/journal/ai/prompt?tz=${encodeURIComponent(timeZone)}`, {
          signal: abortController.signal
        });
        
        if (!isMounted) return;
        
        if (response.ok) {
          const data = await response.json();
          setJournalPrompt(data.prompt);
        } else if (response.status === 429) {
          let errorData = { error: 'AI service is busy' };
          try { errorData = await response.json(); } catch {}
          console.warn('AI service is busy, will retry later:', errorData.error);
        } else {
          let errorText = '';
          try { errorText = await response.text(); } catch {}
          console.error('Failed to fetch journal prompt:', response.status, errorText);
          setJournalPrompt('');
        }
      } catch (error) {
        if (!isMounted) return;
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        console.error('Error fetching journal prompt:', error);
        setJournalPrompt('');
      }
    };
    
    fetchPrompt();
    
    return () => {
      isMounted = false;
      if (abortController) {
        abortController.abort();
      }
    };
  }, [dek]);

  // Fetch today's journal entry
  useEffect(() => {
    let isMounted = true;
    let abortController: AbortController | null = null;
    
    const fetchTodayJournal = async () => {
      if (!dek) return;
      
      // Validate DEK format before using it
      const dekValidation = validateDEK(dek);
      if (!dekValidation.isValid) {
        console.error('Invalid DEK format for journal:', dekValidation.error);
        setJournalContent('Unable to decrypt journal entry. Please unlock your data again.');
        return;
      }
      
      const today = getJournalDate(getUserTimeZone());
      
      try {
        abortController = new AbortController();
        const res = await fetch(`/api/journal?from=${today}&to=${today}`, {
          signal: abortController.signal
        });
        
        if (!isMounted) return;
        
        if (res.ok) {
          const data = await res.json();
          if (data.entries && data.entries.length > 0) {
            const entry = data.entries[0];
            setJournalEntryId(entry.id);
            
            // Decrypt the journal content
            let dekKey: CryptoKey;
            try {
              dekKey = await window.crypto.subtle.importKey(
                'raw',
                safeBase64Decode(dek),
                { name: 'AES-GCM' },
                false,
                ['decrypt']
              );
            } catch (e) {
              console.error('Failed to import DEK for journal decryption:', e);
              setJournalContent('Unable to decrypt journal entry. Please unlock your data again.');
              return;
            }
            const decrypted = await aesGcmDecrypt(entry.encryptedData, dekKey);
            setJournalContent(decrypted);
            setLastSaved(new Date(entry.updatedAt));
          }
        } else {
          console.error('Failed to fetch journal entry:', res.status);
        }
      } catch (error) {
        if (!isMounted) return;
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        console.error('Error fetching journal entry:', error);
      }
    };
    
    fetchTodayJournal();
    
    return () => {
      isMounted = false;
      if (abortController) {
        abortController.abort();
      }
    };
  }, [dek]);

  // Auto-save journal with proper cleanup
  useEffect(() => {
    if (!journalContent || !dek) return;
    
    let isMounted = true;
    
    const autoSave = async () => {
      if (!isMounted) return;
      
      // Validate DEK format before using it
      const dekValidation = validateDEK(dek);
      if (!dekValidation.isValid) {
        console.error('Invalid DEK format for auto-save:', dekValidation.error);
        return;
      }
      
      setIsSavingJournal(true);
      try {
        const dekKey = await window.crypto.subtle.importKey(
          'raw',
          safeBase64Decode(dek),
          { name: 'AES-GCM' },
          false,
          ['encrypt']
        );
        
        const encryptedData = await aesGcmEncrypt(journalContent, dekKey);
        const today = getJournalDate(getUserTimeZone());
        
        let response;
        if (journalEntryId) {
          // Update existing entry
          response = await fetch(`/api/journal/${journalEntryId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              encryptedData,
              dekId: 'user-dek',
              date: today
            })
          });
        } else {
          // Create new entry
          response = await fetch('/api/journal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              encryptedData,
              dekId: 'user-dek',
              date: today
            })
          });
        }
        
        if (response.ok && isMounted) {
          const data = await response.json();
          if (!journalEntryId) {
            setJournalEntryId(data.entry.id);
          }
          setLastSaved(new Date());
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error saving journal:', error);
        }
      } finally {
        if (isMounted) {
          setIsSavingJournal(false);
        }
      }
    };

    const timer = setTimeout(autoSave, 2000);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [journalContent, dek, journalEntryId]);

  // Set default unlock date for new letters
  useEffect(() => {
    if (!letterUnlockDate) {
      const sixMonthsFromNow = new Date();
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
      setLetterUnlockDate(sixMonthsFromNow.toISOString().split('T')[0]);
    }
  }, [letterUnlockDate]);

  // Decrypt goals and milestones when dek or goals change
  useEffect(() => {
    let isMounted = true;
    
    const decryptGoals = async () => {
      if (!dek) {
        setDecryptedGoals([]);
        return;
      }
      
      // Validate DEK format before using it
      const dekValidation = validateDEK(dek);
      if (!dekValidation.isValid) {
        console.error('Invalid DEK format for goals:', dekValidation.error);
        setDecryptedGoals([]);
        return;
      }
      if (goals.length === 0) {
        setDecryptedGoals([]);
        return;
      }
      
      try {
        let dekKey: CryptoKey;
        try {
          dekKey = await window.crypto.subtle.importKey(
            'raw',
            safeBase64Decode(dek),
            { name: 'AES-GCM' },
            false,
            ['encrypt', 'decrypt']
          );
        } catch (e) {
          console.error('Failed to import DEK for goals decryption:', e);
          setDecryptedGoals([]);
          return;
        }
        
        const decrypted = await Promise.all(
          goals.map(async (goal) => {
            try {
              const decryptedMilestones = await Promise.all(
                goal.milestones.map(async (milestone) => {
                  try {
                    return {
                      ...milestone,
                      title: await aesGcmDecrypt(milestone.title, dekKey),
                      description: milestone.description ? await aesGcmDecrypt(milestone.description, dekKey) : null,
                    };
                  } catch (milestoneError) {
                    console.error('Error decrypting milestone:', {
                      milestoneId: milestone.id,
                      error: milestoneError
                    });
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
            } catch (error) {
              console.error('Error decrypting goal:', {
                goalId: goal.id,
                error
              });
              throw new Error(`Failed to decrypt goal: ${error instanceof Error ? error.message : String(error)}`);
            }
          })
        );
        
        if (isMounted) {
          setDecryptedGoals(decrypted);
          // If the expandedGoalId no longer exists, clear it
          if (expandedGoalId && !decrypted.some(g => g.id === expandedGoalId)) {
            setExpandedGoalId(null);
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error('Decryption error:', error);
        }
      }
    };
    
    decryptGoals();
    
    return () => {
      isMounted = false;
    };
  }, [dek, goals, expandedGoalId]);

  // Update Upcoming Milestones section to use decryptedGoals
  useEffect(() => {
    const getUpcomingMilestones = () => {
      if (!dek || decryptedGoals.length === 0) {
        setUpcomingMilestones([]);
        return;
      }
      
      const allMilestones = decryptedGoals.flatMap(goal =>
        goal.milestones.map(milestone => ({
          milestone,
          goalTitle: goal.title,
        }))
      );
      
      const upcoming = allMilestones
        .filter(({ milestone }) => !milestone.completed && milestone.dueDate)
        .sort((a, b) => (a.milestone.dueDate ?? '').localeCompare(b.milestone.dueDate ?? ''))
        .slice(0, 3)
        .map(({ milestone, goalTitle }) => ({
          id: milestone.id,
          title: milestone.title,
          dueDate: milestone.dueDate!,
          goalTitle,
        }));
      
      setUpcomingMilestones(upcoming);
    };
    
    getUpcomingMilestones();
  }, [dek, decryptedGoals]);

  // Update syncEnabledMap when decryptedGoals change
  useEffect(() => {
    if (decryptedGoals.length === 0) return;
    
    setSyncEnabledMap(prev => {
      const next = { ...prev };
      decryptedGoals.forEach(goal => {
        goal.milestones.forEach(milestone => {
          if (!(milestone.id in next)) {
            next[milestone.id] = milestone.syncEnabled !== false;
          }
        });
      });
      // Remove keys for milestones that no longer exist
      Object.keys(next).forEach(id => {
        if (!decryptedGoals.some(goal => goal.milestones.some(m => m.id === id))) {
          delete next[id];
        }
      });
      return next;
    });
  }, [decryptedGoals]);

  // Fetch assistantName on mount
  useEffect(() => {
    let isMounted = true;
    let abortController: AbortController | null = null;
    
    const fetchAssistantName = async () => {
      if (status !== 'authenticated') return;
      
      try {
        abortController = new AbortController();
        const res = await fetch('/api/user/me', {
          signal: abortController.signal
        });
        
        if (!isMounted) return;
        
        if (res.ok) {
          const data = await res.json();
          setAssistantName(data.assistantName || '');
        } else {
          console.error('Failed to fetch assistant name:', res.status);
        }
      } catch (err) {
        if (!isMounted) return;
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        console.error('Error fetching assistant name:', err);
      }
    };
    
    fetchAssistantName();
    
    return () => {
      isMounted = false;
      if (abortController) {
        abortController.abort();
      }
    };
  }, [status]);

  // Fetch companion messages with proper cleanup
  useEffect(() => {
    let isMounted = true;
    let abortController: AbortController | null = null;
    
    const fetchCompanionMessages = async () => {
      if (!journalEntryId || !dek) return;
      
      // Validate DEK format before using it
      const dekValidation = validateDEK(dek);
      if (!dekValidation.isValid) {
        console.error('Invalid DEK format:', dekValidation.error);
        setCompanionMessages([]);
        setCompanionStarted(false);
        return;
      }
      
      try {
        abortController = new AbortController();
        const res = await fetch(`/api/journal/${journalEntryId}/companion`, {
          signal: abortController.signal
        });
        
        if (!isMounted) return;
        
        if (res.ok) {
          const data = await res.json();
          const messages = data.messages || [];
          
          if (!dek) {
            setCompanionMessages([]);
            setCompanionStarted(false);
            return;
          }
          
          let dekKey: CryptoKey;
          try {
            dekKey = await window.crypto.subtle.importKey(
              'raw',
              safeBase64Decode(dek),
              { name: 'AES-GCM' },
              false,
              ['decrypt']
            );
          } catch (e) {
            console.error('Failed to import DEK:', e);
            // If DEK is invalid, clear the messages and show error
            setCompanionMessages([]);
            setCompanionStarted(false);
            return;
          }
          
          // Decrypt messages for UI display
          const decryptedMessages = await Promise.all(
            messages.map(async (msg: any) => {
              try {
                return {
                  ...msg,
                  content: await aesGcmDecrypt(msg.content, dekKey)
                };
              } catch (e) {
                console.error('Failed to decrypt message:', e);
                return {
                  ...msg,
                  content: '[Unable to decrypt]'
                };
              }
            })
          );
          
          if (isMounted) {
            setCompanionMessages(decryptedMessages);
            const hasExistingMessages = decryptedMessages.length > 0;
            setCompanionStarted(hasExistingMessages);
            // If there are existing messages, automatically show the chat interface
            if (hasExistingMessages) {
              // Chat interface will be shown automatically by the component
            }
          }
        } else {
          console.error('Failed to fetch companion messages:', res.status);
        }
      } catch (error) {
        if (!isMounted) return;
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        console.error('Error fetching companion messages:', error);
      }
    };
    
    if (journalEntryId) fetchCompanionMessages();
    
    return () => {
      isMounted = false;
      if (abortController) {
        abortController.abort();
      }
    };
  }, [journalEntryId, dek]);

  // Fetch journal entry count with proper cleanup
  useEffect(() => {
    let isMounted = true;
    let abortController: AbortController | null = null;
    
    const fetchJournalCount = async () => {
      if (status !== 'authenticated') return;
      
      try {
        abortController = new AbortController();
        const res = await fetch('/api/journal', {
          signal: abortController.signal
        });
        
        if (!isMounted) return;
        
        if (res.ok) {
          const data = await res.json();
          setJournalEntryCount(data.entries?.length || 0);
        } else {
          console.error('Failed to fetch journal count:', res.status);
        }
      } catch (err) {
        if (!isMounted) return;
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        console.error('Error fetching journal count:', err);
      }
    };
    
    fetchJournalCount();
    
    return () => {
      isMounted = false;
      if (abortController) {
        abortController.abort();
      }
    };
  }, [status]);

  // Fetch mood analytics with proper cleanup
  useEffect(() => {
    let isMounted = true;
    let abortController: AbortController | null = null;
    
    const fetchMoodAnalytics = async () => {
      if (status !== 'authenticated') return;
      
      setMoodLoading(true);
      setMoodError(null);
      
      try {
        abortController = new AbortController();
        const res = await fetch('/api/journal/analytics', {
          signal: abortController.signal
        });
        
        if (!isMounted) return;
        
        if (!res.ok) throw new Error('Failed to fetch mood analytics');
        
        const data = await res.json();
        setMoodData(data.moods || []);
      } catch (err) {
        if (!isMounted) return;
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        setMoodError('Could not load mood analytics');
      } finally {
        if (isMounted) {
          setMoodLoading(false);
        }
      }
    };
    
    fetchMoodAnalytics();
    
    return () => {
      isMounted = false;
      if (abortController) {
        abortController.abort();
      }
    };
  }, [status]);

  // Detect past-due, incomplete milestones after decryption
  useEffect(() => {
    if (!dek || decryptedGoals.length === 0) {
      setPastDueMilestones([]);
      setShowPastDueModal(false);
      return;
    }
    
    const now = new Date();
    const allPastDue = decryptedGoals.flatMap(goal =>
      goal.milestones
        .filter(milestone => {
          if (milestone.completed || !milestone.dueDate) return false;
          const due = new Date(milestone.dueDate);
          if (isNaN(due.getTime())) return false;
          // Only show if due date is in the past
          if (due >= now) return false;
          // Only show if not already shown this session
          const sessionKey = `pastDueMilestone_${milestone.id}`;
          return !sessionStorage.getItem(sessionKey);
        })
        .map(milestone => ({
          id: milestone.id,
          title: milestone.title,
          dueDate: milestone.dueDate!,
          goalTitle: goal.title,
        }))
    );
    
    setPastDueMilestones(allPastDue);
    setCurrentPastDueIndex(0);
    setShowPastDueModal(allPastDue.length > 0);
  }, [dek, decryptedGoals]);

  // Improved companion message sending with better error handling
  const sendCompanionMessage = async (message: string) => {
    if (!journalEntryId || companionLoading || !dek) return;
    
    // Validate DEK format before using it
    const dekValidation = validateDEK(dek);
    if (!dekValidation.isValid) {
      console.error('Invalid DEK format:', dekValidation.error);
      setCompanionError('Encryption key is invalid. Please unlock your data again.');
      return;
    }
    
    setCompanionLoading(true);
    setCompanionError(null);
    
    // Create abort controller for this specific request
    const abortController = new AbortController();
    
    const timeoutId = setTimeout(() => {
      abortController.abort();
      setCompanionLoading(false);
      setCompanionError('Request timed out. Please try again.');
    }, 30000);
    
    // Immediately add user message to the conversation
    const newUserMessage = {
      role: 'user' as const,
      content: message,
      id: `temp-${Date.now()}-user`,
      createdAt: new Date().toISOString()
    };
    
    setCompanionMessages(prev => [...prev, newUserMessage]);
    setCompanionStarted(true);
    
    try {
      let dekKey: CryptoKey;
      try {
        dekKey = await window.crypto.subtle.importKey(
          'raw',
          safeBase64Decode(dek),
          { name: 'AES-GCM' },
          false,
          ['encrypt', 'decrypt']
        );
      } catch (e) {
        console.error('Failed to import DEK for message sending:', e);
        setCompanionError('Encryption key is invalid. Please unlock your data again.');
        return;
      }
      
      // 1. Decrypt existing conversation history (excluding the just-added user message)
      const conversationHistory = await Promise.all(
        companionMessages.map(async (msg) => {
          try {
            const decryptedContent = await aesGcmDecrypt(msg.content, dekKey);
            return {
              role: msg.role,
              content: decryptedContent
            };
          } catch (e) {
            console.error('Failed to decrypt message:', e);
            return {
              role: msg.role,
              content: '[Unable to decrypt]'
            };
          }
        })
      );
      
      // Add the current user message to conversation history
      conversationHistory.push({
        role: 'user',
        content: message
      });
      
      // 2. Send to AI service
      const res = await fetch(`/api/journal/${journalEntryId}/companion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: message,
          conversationHistory: conversationHistory
        }),
        signal: abortController.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        if (res.status === 429) {
          setCompanionError('AI service is busy. Please try again in a moment.');
        } else {
          setCompanionError('Failed to send message.');
        }
        return;
      }
      
      const data = await res.json();
      const aiResponse = data.aiResponse;
      
      if (!aiResponse) {
        setCompanionError('No response received from AI service.');
        return;
      }
      
      // Create the AI response message
      const newCompanionMessage = {
        role: 'companion' as const,
        content: aiResponse,
        id: `temp-${Date.now()}-companion`,
        createdAt: new Date().toISOString()
      };
      
      // 3. Encrypt both messages for storage
      const encryptedUserMessage = await aesGcmEncrypt(newUserMessage.content, dekKey);
      const encryptedCompanionMessage = await aesGcmEncrypt(newCompanionMessage.content, dekKey);
      
      // 4. Store encrypted version
      try {
        await fetch(`/api/journal/${journalEntryId}/companion`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: message,
            conversationHistory: conversationHistory,
            encryptedMessages: [
              { role: 'user', content: encryptedUserMessage },
              { role: 'companion', content: encryptedCompanionMessage }
            ]
          }),
          signal: abortController.signal
        });
      } catch (storageError) {
        console.error('Error storing encrypted messages:', storageError);
        // Don't fail the UI update if storage fails
      }
      
      // 5. Add AI response to the conversation
      setCompanionMessages(prev => [...prev, newCompanionMessage]);
      
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Request was cancelled
      }
      console.error('Error sending companion message:', err);
      setCompanionError('Failed to send message.');
    } finally {
      setCompanionLoading(false);
    }
  };

  // Reset companion state if stuck
  const resetCompanionState = () => {
    setCompanionLoading(false);
    setCompanionError(null);
  };

  // Future Letters handlers
  const handleSaveLetter = async (data: { title: string; content: string; unlockDate: string }) => {
    if (!dek) return;
    
    // Validate DEK format before using it
    const dekValidation = validateDEK(dek);
    if (!dekValidation.isValid) {
      console.error('Invalid DEK format for letter save:', dekValidation.error);
      return;
    }
    
    setIsSavingLetter(true);
    try {
      let dekKey: CryptoKey;
      try {
        dekKey = await window.crypto.subtle.importKey(
          'raw',
          safeBase64Decode(dek),
          { name: 'AES-GCM' },
          false,
          ['encrypt']
        );
      } catch (e) {
        console.error('Failed to import DEK for journal encryption:', e);
        return;
      }

      const encryptedTitle = data.title.trim() ? await aesGcmEncrypt(data.title.trim(), dekKey) : null;
      const encryptedContent = await aesGcmEncrypt(data.content, dekKey);

      const response = await fetch('/api/future-letters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: encryptedTitle || '',
          content: encryptedContent,
          unlockDate: data.unlockDate
        })
      });

      if (response.ok) {
        setShowLetterCompose(false);
        setLetterContent('');
        setLetterTitle('');
        setLetterUnlockDate('');
        // Refresh letters
        const res = await fetch('/api/future-letters');
        if (res.ok) {
          const data = await res.json();
          setFutureLetters(data || []);
        } else {
          console.error('Failed to refresh letters:', res.status);
        }
      }
    } catch (error) {
      console.error('Error saving letter:', error);
    } finally {
      setIsSavingLetter(false);
    }
  };

  const handleReadLetter = async (letterId: string) => {
    if (!dek) return;
    
    // Validate DEK format before using it
    const dekValidation = validateDEK(dek);
    if (!dekValidation.isValid) {
      console.error('Invalid DEK format for letter read:', dekValidation.error);
      return;
    }
    
    try {
      const res = await fetch(`/api/future-letters/${letterId}`);
      if (res.ok) {
        const letter = await res.json();
        
        // Decrypt the content
        let dekKey: CryptoKey;
        try {
          dekKey = await window.crypto.subtle.importKey(
            'raw',
            safeBase64Decode(dek),
            { name: 'AES-GCM' },
            false,
            ['decrypt']
          );
        } catch (e) {
          console.error('Failed to import DEK for letter decryption:', e);
          return;
        }

        const decryptedContent = await aesGcmDecrypt(letter.content, dekKey);
        const decryptedTitle = letter.title ? await aesGcmDecrypt(letter.title, dekKey) : '';

        setSelectedLetter(letterId);
        setLetterContent(decryptedContent);
        setLetterTitle(decryptedTitle);
        setLetterUnlockDate(letter.unlockDate);
      } else {
        console.error('Failed to read letter:', res.status);
      }
    } catch (error) {
      console.error('Error reading letter:', error);
    }
  };

  const handleDeleteLetter = async (letterId: string) => {
    if (!confirm('Are you sure you want to delete this letter? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/future-letters/${letterId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setFutureLetters(prev => prev.filter(letter => letter.id !== letterId));
        if (selectedLetter === letterId) {
          setSelectedLetter(null);
          setLetterContent('');
          setLetterTitle('');
          setLetterUnlockDate('');
        }
      }
    } catch (error) {
      console.error('Error deleting letter:', error);
    }
  };

  // Goal handlers
  const refreshGoals = async () => {
    try {
      const response = await fetch('/api/goals');
      if (response.ok) {
        const data = await response.json();
        setGoals(data.goals || []);
      }
    } catch (error) {
      console.error('Error refreshing goals:', error);
    }
  };

  const handleMilestoneToggle = async (milestoneId: string, completed: boolean) => {
    const originalGoals = [...goals];
    
    setGoals(prevGoals => prevGoals.map(goal => ({
      ...goal,
      milestones: goal.milestones.map(milestone =>
        milestone.id === milestoneId ? { ...milestone, completed } : milestone
      )
    })));

    try {
      const response = await fetch('/api/milestones', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ milestoneId, updates: { completed } }),
      });

      if (!response.ok) {
        setGoals(originalGoals);
        setUpdateError('Failed to update milestone completion status');
      }
    } catch (error) {
      console.error('Error updating milestone:', error);
      setGoals(originalGoals);
      setUpdateError('Network error: Failed to update milestone');
    }
  };

  const handleGoalUpdate = async (goalId: string, updates: Partial<Goal>) => {
    try {
      const response = await fetch('/api/goals', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ goalId, updates }),
      });
      
      if (response.ok) {
        await refreshGoals();
      } else {
        setUpdateError('Failed to update goal');
      }
    } catch (error) {
      console.error('Error updating goal:', error);
      setUpdateError('Failed to update goal');
    }
  };

  const handleGoalDelete = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this goal? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/api/goals', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ goalId }),
      });

      if (response.ok) {
        await refreshGoals();
      } else {
        setUpdateError('Failed to delete goal');
      }
    } catch (error) {
      console.error('Error deleting goal:', error);
      setUpdateError('Failed to delete goal');
    }
  };

  const handleMilestoneUpdate = async (goalId: string, milestoneId: string, updates: Partial<Milestone>) => {
    const originalGoals = [...goals];
    
    setGoals(prevGoals => prevGoals.map(goal => {
      if (goal.id !== goalId) return goal;
      return {
        ...goal,
        milestones: goal.milestones.map(milestone =>
          milestone.id === milestoneId ? { ...milestone, ...updates } : milestone
        )
      };
    }));
    
    try {
      // Re-encrypt title/description if present in updates
      const encryptedUpdates = { ...updates };
      if ((updates.title || updates.description) && dek) {
        const dekKey = await window.crypto.subtle.importKey(
          'raw',
          safeBase64Decode(dek),
          { name: 'AES-GCM' },
          false,
          ['encrypt']
        );
        if (typeof updates.title === 'string') {
          encryptedUpdates.title = await aesGcmEncrypt(updates.title, dekKey);
        }
        if (typeof updates.description === 'string') {
          encryptedUpdates.description = await aesGcmEncrypt(updates.description, dekKey);
        }
      }
      // If dek is missing, do not send title/description updates
      if (!dek) {
        if ('title' in encryptedUpdates) delete encryptedUpdates.title;
        if ('description' in encryptedUpdates) delete encryptedUpdates.description;
      }
      const response = await fetch('/api/milestones', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ milestoneId, updates: encryptedUpdates }),
      });
      
      if (!response.ok) {
        setGoals(originalGoals);
        setUpdateError('Failed to update milestone settings');
      } else {
        // Re-fetch goals to ensure UI is in sync
        await refreshGoals();
      }
    } catch (error) {
      console.error('Error updating milestone:', error);
      setGoals(originalGoals);
      setUpdateError('Network error: Failed to update milestone settings');
    }
  };

  const handleMilestoneDelete = async (goalId: string, milestoneId: string) => {
    if (!confirm('Are you sure you want to delete this milestone? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/api/milestones', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ milestoneId }),
      });

      if (response.ok) {
        await refreshGoals();
      } else {
        setUpdateError('Failed to delete milestone');
      }
    } catch (error) {
      console.error('Error deleting milestone:', error);
      setUpdateError('Failed to delete milestone');
    }
  };

  const handleSyncEnabledChange = (milestoneId: string, enabled: boolean) => {
    setSyncEnabledMap(prev => ({ ...prev, [milestoneId]: enabled }));
    // Find the goalId for this milestone
    const goal = decryptedGoals.find(g => g.milestones.some(m => m.id === milestoneId));
    if (goal) {
      handleMilestoneUpdate(goal.id, milestoneId, { syncEnabled: enabled });
    }
  };

  // Handler: Mark as completed
  const handlePastDueComplete = async () => {
    const milestone = pastDueMilestones[currentPastDueIndex];
    if (!milestone) return;
    // Mark as completed via API
    const goal = decryptedGoals.find(g => g.milestones.some(m => m.id === milestone.id));
    if (goal) {
      await handleMilestoneUpdate(goal.id, milestone.id, { completed: true });
    }
    // Congratulate (simple alert for now)
    alert('Congratulations on completing your milestone! 🎉');
    // Mark as shown in session
    sessionStorage.setItem(`pastDueMilestone_${milestone.id}`, 'shown');
    // Move to next
    showNextPastDue();
  };

  // Handler: Reflect in journal
  const handlePastDueJournal = () => {
    const milestone = pastDueMilestones[currentPastDueIndex];
    if (!milestone) return;
    // Mark as shown in session
    sessionStorage.setItem(`pastDueMilestone_${milestone.id}`, 'shown');
    // Open today's journal with pre-filled prompt
    const prompt = `I didn't complete the milestone "${milestone.title}" (due ${milestone.dueDate}) for my goal "${milestone.goalTitle}". Why not? How do I feel about it? What can I do next?`;
    // Assuming journal is at /journal and can accept a prompt via query param
    router.push(`/journal?prompt=${encodeURIComponent(prompt)}`);
    // Move to next
    showNextPastDue();
  };

  // Handler: Close modal
  const handlePastDueClose = () => {
    const milestone = pastDueMilestones[currentPastDueIndex];
    if (milestone) {
      sessionStorage.setItem(`pastDueMilestone_${milestone.id}`, 'shown');
    }
    showNextPastDue();
  };

  function showNextPastDue() {
    if (currentPastDueIndex + 1 < pastDueMilestones.length) {
      setCurrentPastDueIndex(currentPastDueIndex + 1);
    } else {
      setShowPastDueModal(false);
    }
  }

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7f50', '#a4de6c', '#d0ed57', '#8dd1e1', '#d88884'];

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-xl font-['Nanum_Myeongjo']">Loading...</div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="text-2xl font-extrabold tracking-tight text-gray-900 font-['Nanum_Myeongjo']">
            ToPhD
          </div>
          <div className="flex items-center space-x-6">
            {dek && (
              <div className="relative group">
                <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-max bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  Data encrypted
                </div>
              </div>
            )}
            <Link href="/settings" className="text-sm text-gray-600 hover:text-gray-900 font-['Nanum_Myeongjo']">
              Settings
            </Link>
            <button 
              onClick={() => signOut()}
              className="text-sm text-gray-600 hover:text-gray-900 font-['Nanum_Myeongjo']"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* LEFT COLUMN: Welcome + Reflection */}
          <div className="space-y-8">
            {/* Welcome/Overview Card */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col gap-2">
              <div className="text-xl font-bold text-gray-900 font-['Nanum_Myeongjo'] mb-1">Welcome back!</div>
              <div className="text-gray-600 font-['Nanum_Myeongjo'] mb-2">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
              <div className="flex flex-wrap gap-4 mt-2">
                <div className="flex flex-col items-center">
                  <span className="text-lg font-semibold text-gray-900">{goals.length}</span>
                  <span className="text-xs text-gray-500">Goals</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-lg font-semibold text-gray-900">
                    {journalEntryCount !== null ? journalEntryCount : '—'}
                  </span>
                  <span className="text-xs text-gray-500">Journal entries</span>
                </div>
              </div>
            </div>

            {/* Reflection Tools: Journal + AI Companion */}
            <div className="flex flex-col gap-8">
              {/* Journal Card */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 font-['Nanum_Myeongjo']">Today&apos;s Journal</h2>
                </div>
                {!dek ? (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <h3 className="mt-4 text-lg font-medium text-gray-900 font-['Nanum_Myeongjo']">Unlock your data to start journaling</h3>
                    <p className="mt-2 text-gray-500 font-['Nanum_Myeongjo']">Your journal entries are encrypted for privacy</p>
                    <button
                      onClick={() => setShowUnlockModal(true)}
                      className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800 font-['Nanum_Myeongjo']"
                    >
                      Unlock Data
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {journalPrompt && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="text-gray-700 font-medium font-['Nanum_Myeongjo'] prose prose-sm max-w-none">
                          <ReactMarkdown>{journalPrompt}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                    <textarea
                      value={journalContent}
                      onChange={(e) => setJournalContent(e.target.value)}
                      placeholder="How are you feeling today? What's on your mind about your academic journey?"
                      className="w-full h-64 p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none font-['Nanum_Myeongjo'] text-gray-900"
                    />
                    <div className="flex justify-end text-sm text-gray-500">
                      {isSavingJournal && (
                        <span>Saving...</span>
                      )}
                      {lastSaved && !isSavingJournal && (
                        <span>Saved {lastSaved.toLocaleTimeString()}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* AI Companion Card */}
              <AICompanion
                assistantName={assistantName}
                journalContent={journalContent}
                journalEntryId={journalEntryId}
                dek={dek}
                onSendMessage={sendCompanionMessage}
                messages={companionMessages}
                loading={companionLoading}
                error={companionError}
                started={companionStarted}
                onReset={resetCompanionState}
              />
            </div>

            {/* Data Security Status */}
            {!dek && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                <div className="flex items-center mb-3">
                  <svg className="w-5 h-5 text-orange-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <h3 className="font-medium text-gray-800 font-['Nanum_Myeongjo']">Data Locked</h3>
                </div>
                <p className="text-sm text-gray-700 mb-3 font-['Nanum_Myeongjo']">
                  Your data is encrypted. Unlock to access all features.
                </p>
                <button 
                  onClick={() => setShowUnlockModal(true)}
                  className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded-lg transition font-['Nanum_Myeongjo']"
                >
                  Unlock Now
                </button>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Progress & Overview */}
          <div className="space-y-8">
            {/* Goals Section: Add Goal, Roadmap */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col gap-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 font-['Nanum_Myeongjo']">Your Goals</h2>
                <Link 
                  href="/create-goal"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800 font-['Nanum_Myeongjo']"
                >
                  Add Goal
                </Link>
              </div>
              {decryptedGoals.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-gray-800 font-['Nanum_Myeongjo']">No goals found. Add one to get started!</span>
                  </div>
                </div>
              ) : (
                <Roadmap
                  goals={decryptedGoals}
                  expandedGoalId={expandedGoalId}
                  onExpandedGoalChange={setExpandedGoalId}
                  onMilestoneToggle={handleMilestoneToggle}
                  onGoalUpdate={handleGoalUpdate}
                  onGoalDelete={handleGoalDelete}
                  onMilestoneUpdate={handleMilestoneUpdate}
                  onMilestoneDelete={handleMilestoneDelete}
                  syncEnabledMap={syncEnabledMap}
                  onSyncEnabledChange={handleSyncEnabledChange}
                />
              )}
              <div className="mt-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4 font-['Nanum_Myeongjo']">Coming Up</h3>
                {!dek ? (
                  <div className="text-center py-6">
                    <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-500 font-['Nanum_Myeongjo']">Unlock data to see milestones</p>
                  </div>
                ) : upcomingMilestones.length === 0 ? (
                  <div className="text-center py-6">
                    <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-500 font-['Nanum_Myeongjo']">No upcoming milestones</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingMilestones.map((milestone) => (
                      <div key={milestone.id} className="border-l-4 border-gray-900 pl-3">
                        <div className="font-medium text-gray-900 text-sm font-['Nanum_Myeongjo']">
                          {milestone.title}
                        </div>
                        <div className="text-xs text-gray-500 font-['Nanum_Myeongjo']">
                          {milestone.dueDate} • {milestone.goalTitle}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Mood Analytics Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 font-['Nanum_Myeongjo']">Mood Analytics</h3>
              {moodLoading ? (
                <div className="text-center py-6 text-gray-500 font-['Nanum_Myeongjo']">Loading mood data...</div>
              ) : moodError ? (
                <div className="text-center py-6 text-gray-400 font-['Nanum_Myeongjo']">{moodError}</div>
              ) : !moodData.length ? (
                <div className="text-center py-6 text-gray-500 font-['Nanum_Myeongjo']">No mood data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={moodData}
                      dataKey={(entry) => entry._count.mood}
                      nameKey="mood"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, value }) => `${name || 'N/A'}: ${value}`}
                    >
                      {moodData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`${value} entries`, 'Count']} />
                    <Legend formatter={(value) => value || 'N/A'} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Future Letters Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 font-['Nanum_Myeongjo']">Future Letters</h3>
                <button
                  onClick={() => setShowLetterCompose(true)}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 font-['Nanum_Myeongjo']"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New
                </button>
              </div>
              
              {!dek ? (
                <div className="text-center py-6">
                  <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500 font-['Nanum_Myeongjo']">Unlock data to see letters</p>
                </div>
              ) : futureLetters.length === 0 ? (
                <div className="text-center py-6">
                  <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 7.89a2 2 0 002.83 0L21 9M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500 font-['Nanum_Myeongjo']">No letters yet</p>
                  <button
                    onClick={() => setShowLetterCompose(true)}
                    className="mt-2 text-sm text-gray-600 hover:text-gray-900 font-['Nanum_Myeongjo'] underline"
                  >
                    Write your first letter
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {futureLetters.slice(0, 3).map((letter) => {
                    const now = new Date();
                    const unlockDate = new Date(letter.unlockDate);
                    const isUnlocked = now >= unlockDate;
                    const canRead = isUnlocked || letter.delivered;
                    
                    const formatDate = (dateString: string) => {
                      return new Date(dateString).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      });
                    };

                    const getTimeUntilUnlock = (unlockDate: string) => {
                      const now = new Date();
                      const unlock = new Date(unlockDate);
                      const diffTime = unlock.getTime() - now.getTime();
                      
                      if (diffTime <= 0) return 'Ready';
                      
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      if (diffDays > 30) {
                        const months = Math.floor(diffDays / 30);
                        return `${months}m`;
                      } else if (diffDays > 0) {
                        return `${diffDays}d`;
                      } else {
                        return 'Ready';
                      }
                    };

                    return (
                      <div
                        key={letter.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-all hover:shadow-sm ${
                          canRead 
                            ? 'border-gray-200 bg-gray-50 hover:bg-gray-100' 
                            : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                        }`}
                        onClick={() => canRead ? handleReadLetter(letter.id) : null}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 font-['Nanum_Myeongjo']">
                              Letter from {formatDate(letter.createdAt)}
                            </div>
                            <div className="text-xs text-gray-500 font-['Nanum_Myeongjo']">
                              {getTimeUntilUnlock(letter.unlockDate)}
                            </div>
                          </div>
                          {canRead && (
                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {futureLetters.length > 3 && (
                    <div className="text-center pt-2">
                      <Link
                        href="/future-letters"
                        className="text-sm text-gray-600 hover:text-gray-900 font-['Nanum_Myeongjo'] underline"
                      >
                        View all {futureLetters.length} letters
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Journal Summary Card (bottom) */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <JournalSummary />
            </div>
          </div>
        </div>

        {/* Letter Compose Modal */}
        {showLetterCompose && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900 font-['Nanum_Myeongjo']">Write to Your Future Self</h2>
                  <button
                    onClick={() => setShowLetterCompose(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-['Nanum_Myeongjo']">
                    Title (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Give your letter a title..."
                    value={letterTitle}
                    onChange={(e) => setLetterTitle(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors font-['Nanum_Myeongjo']"
                    disabled={isSavingLetter}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-['Nanum_Myeongjo']">
                    Your Letter <span className="text-gray-500">*</span>
                  </label>
                  <textarea
                    placeholder="Dear future me..."
                    value={letterContent}
                    onChange={(e) => setLetterContent(e.target.value)}
                    rows={8}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors resize-none font-['Nanum_Myeongjo']"
                    disabled={isSavingLetter}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-['Nanum_Myeongjo']">
                    Unlock Date <span className="text-gray-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={letterUnlockDate}
                    onChange={(e) => setLetterUnlockDate(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors font-['Nanum_Myeongjo']"
                    disabled={isSavingLetter}
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500 font-['Nanum_Myeongjo']">
                    Your letter will be encrypted until this date
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => setShowLetterCompose(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 font-['Nanum_Myeongjo']"
                  disabled={isSavingLetter}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveLetter({ title: letterTitle, content: letterContent, unlockDate: letterUnlockDate })}
                  disabled={!letterContent.trim() || !letterUnlockDate || isSavingLetter}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-50 font-['Nanum_Myeongjo']"
                >
                  {isSavingLetter ? 'Saving...' : 'Save Letter'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Letter Read Modal */}
        {selectedLetter && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900 font-['Nanum_Myeongjo']">
                    {letterTitle || `Letter from ${new Date(letterUnlockDate).toLocaleDateString()}`}
                  </h2>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleDeleteLetter(selectedLetter)}
                      className="text-red-600 hover:text-red-800"
                      title="Delete letter"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedLetter(null);
                        setLetterContent('');
                        setLetterTitle('');
                        setLetterUnlockDate('');
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="prose prose-gray max-w-none font-['Nanum_Myeongjo']">
                  <ReactMarkdown>{letterContent}</ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        )}

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
                  const data = await res.json();
                  setDek(data.dek);
                  setShowUnlockModal(false);
                  return true;
                } else {
                  console.error('Failed to unlock DEK:', res.status);
                  return false;
                }
              } catch (error) {
                console.error('Error unlocking DEK:', error);
                return false;
              }
            }}
            mode="unlock"
            onSkip={() => setShowUnlockModal(false)}
          />
        )}

        {/* Past Due Milestone Modal */}
        <PastDueMilestoneModal
          open={showPastDueModal && !!pastDueMilestones[currentPastDueIndex]}
          milestoneTitle={pastDueMilestones[currentPastDueIndex]?.title || ''}
          dueDate={pastDueMilestones[currentPastDueIndex]?.dueDate || ''}
          goalTitle={pastDueMilestones[currentPastDueIndex]?.goalTitle || ''}
          onComplete={handlePastDueComplete}
          onJournal={handlePastDueJournal}
          onClose={handlePastDueClose}
        />
      </main>
    </div>
  );
}