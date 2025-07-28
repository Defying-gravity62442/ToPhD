'use client'

import { useState, useEffect, useRef } from 'react'

interface CalendarIntegrationProps {
  milestoneId: string
  goalId: string
  goalTitle: string // NEW
  milestoneTitle: string
  milestoneDescription: string | null // NEW
  dueDate: string         // now required, not optional
  onSync?: (eventId: string, eventUrl: string) => void
}

// Validate date format (YYYY-MM-DD)
function isValidDateFormat(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

export default function CalendarIntegration({
  milestoneId,
  goalId,
  goalTitle, // NEW
  milestoneTitle,
  milestoneDescription, // NEW
  dueDate,
  onSync,
}: CalendarIntegrationProps) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle')
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    checkConnectionStatus()

    // Cleanup timeouts on unmount
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current)
      }
    }
  }, [])

  async function checkConnectionStatus() {
    try {
      const res = await fetch('/api/calendar/debug')
      const data = await res.json()
      setIsConnected(data.hasTokens)
    } catch {
      setIsConnected(false)
    }
  }

  async function syncToCalendar(e?: React.MouseEvent) {
    // Prevent default behavior and event bubbling
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Prevent multiple simultaneous syncs
    if (isSyncing) {
      return
    }

    if (!isConnected) {
      setError('Please connect to Google Calendar in settings first')
      setSyncStatus('error')
      return
    }

    // Validate inputs
    if (!milestoneId || !goalId || !milestoneTitle || !dueDate) {
      setError('Missing required information for sync')
      setSyncStatus('error')
      return
    }

    // Validate date format
    if (!isValidDateFormat(dueDate)) {
      setError('Invalid date format. Expected YYYY-MM-DD')
      setSyncStatus('error')
      return
    }

    setIsSyncing(true)
    setError(null)
    setSuccess(null)
    setSyncStatus('syncing')

    // Clear any existing timeouts
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current)
    }
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current)
    }

    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync-milestone',
          milestoneId,
          goalId,
          goalTitle, // NEW
          milestoneTitle,
          milestoneDescription,
          dueDate,
        }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setSyncStatus('success')
        setSuccess('Successfully synced to Google Calendar!')
        if (onSync) {
          onSync(data.eventId, data.eventUrl)
        }
        // Clear error on success
        setError(null)
        
        // Auto-clear success message after 3 seconds
        successTimeoutRef.current = setTimeout(() => {
          setSuccess(null)
          setSyncStatus('idle')
        }, 3000)
      } else {
        setSyncStatus('error')
        // Handle specific error codes
        if (data.code === 'NOT_CONNECTED') {
          setError('Not connected to Google Calendar. Please reconnect in settings.')
          setIsConnected(false)
        } else if (data.code === 'AUTH_EXPIRED') {
          setError('Authentication expired. Please reconnect to Google Calendar.')
          setIsConnected(false)
        } else {
          setError(data.error || 'Failed to sync with Google Calendar')
        }
      }
    } catch (err) {
      console.error('Sync error:', err)
      setSyncStatus('error')
      setError('Network error. Please check your connection and try again.')
    } finally {
      setIsSyncing(false)

      // Auto-clear error after 5 seconds
      if (syncStatus === 'error') {
        syncTimeoutRef.current = setTimeout(() => {
          setError(null)
          setSyncStatus('idle')
        }, 5000)
      }
    }
  }

  if (!isConnected) return null

  return (
    <div className="flex items-center space-x-2">
      <button
        type="button"
        onClick={syncToCalendar}
        disabled={isSyncing}
        className={`inline-flex items-center px-2 py-1 text-xs font-medium border rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ${
          syncStatus === 'success' 
            ? 'text-green-700 bg-green-50 border-green-200 hover:bg-green-100 focus:ring-green-500 animate-scale-in'
            : syncStatus === 'error'
            ? 'text-red-700 bg-red-50 border-red-200 hover:bg-red-100 focus:ring-red-500 animate-scale-in'
            : 'text-gray-700 bg-gray-50 border-gray-200 hover:bg-gray-100 focus:ring-gray-500'
        }`}
        title={
          syncStatus === 'success' ? 'Successfully synced to Google Calendar' :
          syncStatus === 'error' ? 'Sync failed - click to retry' :
          isSyncing ? 'Syncing...' : 'Sync this milestone to Google Calendar'
        }
        aria-label={
          syncStatus === 'success' ? 'Successfully synced milestone' :
          syncStatus === 'error' ? 'Sync failed - click to retry' :
          isSyncing ? 'Syncing milestone' : 'Sync milestone to calendar'
        }
      >
        {isSyncing ? (
          <>
            <svg 
              className="animate-spin -ml-1 mr-2 h-3 w-3 text-gray-500" 
              fill="none" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle 
                className="opacity-25" 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="currentColor" 
                strokeWidth="4" 
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Syncing…
          </>
        ) : syncStatus === 'success' ? (
          <>
            <svg 
              className="w-3 h-3 mr-1 text-green-600 animate-bounce-in" 
              fill="currentColor" 
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Synced
          </>
        ) : syncStatus === 'error' ? (
          <>
            <svg 
              className="w-3 h-3 mr-1 text-red-600 animate-bounce-in" 
              fill="currentColor" 
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            Retry
          </>
        ) : (
          <>
            <svg 
              className="w-3 h-3 mr-1" 
              fill="currentColor" 
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z"
                clipRule="evenodd"
              />
            </svg>
            Sync
          </>
        )}
      </button>

      {error && (
        <span 
          className="text-xs text-red-600 animate-fade-in max-w-xs truncate"
          role="alert"
          aria-live="polite"
          title={error}
        >
          {error}
        </span>
      )}

      {success && (
        <span 
          className="text-xs text-green-600 animate-fade-in max-w-xs truncate"
          role="status"
          aria-live="polite"
          title={success}
        >
          {success}
        </span>
      )}
    </div>
  )
}