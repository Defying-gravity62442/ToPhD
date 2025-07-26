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
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    checkConnectionStatus()

    // Cleanup timeout on unmount
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
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
      return
    }

    // Validate inputs
    if (!milestoneId || !goalId || !milestoneTitle || !dueDate) {
      setError('Missing required information for sync')
      return
    }

    // Validate date format
    if (!isValidDateFormat(dueDate)) {
      setError('Invalid date format. Expected YYYY-MM-DD')
      return
    }

    setIsSyncing(true)
    setError(null)

    // Clear any existing timeout
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current)
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
        if (onSync) {
          onSync(data.eventId, data.eventUrl)
        }
        // Clear error on success
        setError(null)
      } else {
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
      setError('Network error. Please check your connection and try again.')
    } finally {
      setIsSyncing(false)

      // Auto-clear error after 5 seconds
      syncTimeoutRef.current = setTimeout(() => {
        setError(null)
      }, 5000)
    }
  }

  if (!isConnected) return null

  return (
    <div className="flex items-center space-x-2">
      <button
        type="button"
        onClick={syncToCalendar}
        disabled={isSyncing}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title={isSyncing ? 'Syncing...' : 'Sync this milestone to Google Calendar'}
        aria-label={isSyncing ? 'Syncing milestone' : 'Sync milestone to calendar'}
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
                      className="text-xs text-gray-600 animate-fade-in"
          role="alert"
          aria-live="polite"
        >
          {error}
        </span>
      )}
    </div>
  )
}