"use client"

import { useState, useEffect, useCallback } from "react";

interface Goal {
  id: string;
  title: string;
  description: string | null;
  status: string;
  milestones: Array<{
    id: string;
    title: string;
    description: string | null;
    dueDate: string | null;
    completed: boolean;
    syncEnabled?: boolean;
  }>;
}

interface CalendarSettingsProps {
  onClose?: () => void;
  decryptedGoals?: Goal[];
}

interface SyncPreferences {
  autoSync: boolean;
  syncCompleted: boolean;
  reminderMinutes: number;
  eventDuration: number;
}

export default function CalendarSettings({ onClose, decryptedGoals = [] }: CalendarSettingsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [syncPreferences, setSyncPreferences] = useState<SyncPreferences>({
    autoSync: false,
    syncCompleted: false,
    reminderMinutes: 30,
    eventDuration: 60,
  });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    try {
      const res = await fetch("/api/user/preferences");
      if (res.ok) {
        const { calendarSyncPreferences } = await res.json();
        if (calendarSyncPreferences) {
          setSyncPreferences({ ...syncPreferences, ...calendarSyncPreferences });
        }
      }
    } catch {}
  }, [syncPreferences]);

  useEffect(() => {
    checkConnection();
    fetchPreferences();
  }, [fetchPreferences]);

  useEffect(() => {
    if (error || successMessage) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccessMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [error, successMessage]);

  async function checkConnection() {
    try {
      const res = await fetch("/api/calendar?action=check");
      if (res.ok) {
        const { connected } = await res.json();
        setIsConnected(connected);
      }
    } catch {
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }

  const connectGoogleCalendar = useCallback(async () => {
    if (isConnecting) return;
    setIsConnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/calendar?action=auth");
      if (res.ok) {
        const { authUrl } = await res.json();
        window.location.href = authUrl;
      } else {
        const data = await res.json();
        setError(data.error || "Failed to initiate Google Calendar connection");
      }
    } catch {
      setError("Failed to connect to Google Calendar");
    } finally {
      setIsConnecting(false);
    }
  }, [isConnecting]);

  const disconnectGoogleCalendar = useCallback(async () => {
    const confirmed = window.confirm(
      "Are you sure you want to disconnect from Google Calendar? This will remove all synced events."
    );
    if (!confirmed) return;
    setError(null);
    try {
      const res = await fetch("/api/calendar?action=disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect" }),
      });
      if (res.ok) {
        setIsConnected(false);
        setSuccessMessage("Disconnected from Google Calendar. To fully disconnect, please remove this app from your Google Account permissions: https://myaccount.google.com/permissions");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to disconnect from Google Calendar");
      }
    } catch {
      setError("Failed to disconnect from Google Calendar");
    }
  }, []);

  const syncAllMilestones = useCallback(async () => {
    if (isSyncingAll) return;
    setIsSyncingAll(true);
    setError(null);
    setSuccessMessage(null);
    try {
      let total = 0;
      let success = 0;
      let failed = 0;
      for (const goal of decryptedGoals) {
        for (const milestone of goal.milestones) {
          if (!milestone.dueDate || !milestone.title || milestone.completed || milestone.syncEnabled === false) continue;
          total++;
          try {
            const res = await fetch('/api/calendar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'sync-milestone',
                milestoneId: milestone.id,
                goalId: goal.id,
                goalTitle: goal.title,
                milestoneTitle: milestone.title,
                milestoneDescription: milestone.description,
                dueDate: milestone.dueDate,
              }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
              success++;
            } else {
              failed++;
            }
          } catch {
            failed++;
          }
        }
      }
      setSuccessMessage(`Synced ${success} of ${total} milestones to Google Calendar!`);
      if (failed > 0) {
        setError(`${failed} milestones failed to sync. Check your connection or try again.`);
      }
    } catch {
      setError('Failed to sync all milestones');
    } finally {
      setIsSyncingAll(false);
    }
  }, [isSyncingAll, decryptedGoals]);

  const savePreferences = useCallback(async () => {
    if (isSavingPreferences) return;
    setIsSavingPreferences(true);
    setError(null);
    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save-preferences",
          preferences: syncPreferences,
        }),
      });
      if (res.ok) {
        setSuccessMessage("Preferences saved");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save preferences");
      }
    } catch {
      setError("Failed to save preferences");
    } finally {
      setIsSavingPreferences(false);
    }
  }, [syncPreferences, isSavingPreferences]);

  const handlePreferenceChange = useCallback(
    (key: keyof SyncPreferences, value: boolean | number) => {
      setSyncPreferences((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-center">
        <svg className="animate-spin h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span className="ml-2 text-sm text-gray-500">Loading…</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-md mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Google Calendar Integration</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {(error || successMessage) && (
        <div
                      className={`p-3 rounded-md text-sm ${
              error ? "bg-gray-50 text-gray-800" : "bg-gray-50 text-gray-800"
            }`}
          role="alert"
        >
          {error || successMessage}
        </div>
      )}

      {!isConnected ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Connect your Google Calendar to automatically sync your milestones and receive reminders.
          </p>
          <button
            onClick={connectGoogleCalendar}
            disabled={isConnecting}
            className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isConnecting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Connecting…
              </>
            ) : (
              "Connect Google Calendar"
            )}
          </button>
        </div>
      ) : (
        <>
          <button
            onClick={syncAllMilestones}
            disabled={isSyncingAll}
            className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSyncingAll ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Syncing…
              </>
            ) : (
              "Sync All Milestones"
            )}
          </button>

          <div className="border-t pt-4 mt-4">
            <h5 className="text-sm font-medium text-gray-900 mb-3">Sync Preferences</h5>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={syncPreferences.autoSync}
                  onChange={(e) => handlePreferenceChange("autoSync", e.target.checked)}
                  className="h-4 w-4 text-gray-600 border-gray-300 rounded focus:ring-gray-500"
                />
                <span className="ml-2 text-sm text-gray-700">Automatically sync new milestones</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={syncPreferences.syncCompleted}
                  onChange={(e) => handlePreferenceChange("syncCompleted", e.target.checked)}
                  className="h-4 w-4 text-gray-600 border-gray-300 rounded focus:ring-gray-500"
                />
                <span className="ml-2 text-sm text-gray-700">Sync completed milestones</span>
              </label>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reminder (minutes before)</label>
                <input
                  type="number"
                  value={syncPreferences.reminderMinutes}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10);
                    if (!isNaN(value) && value >= 0 && value <= 1440) {
                      handlePreferenceChange("reminderMinutes", value);
                    }
                  }}
                  className="w-24 px-3 py-1 border border-gray-300 rounded-md focus:ring-gray-500 focus:border-gray-500"
                  min={0}
                  max={1440}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event duration (minutes)</label>
                <input
                  type="number"
                  value={syncPreferences.eventDuration}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10);
                    if (!isNaN(value) && value >= 15 && value <= 480) {
                      handlePreferenceChange("eventDuration", value);
                    }
                  }}
                  className="w-24 px-3 py-1 border border-gray-300 rounded-md focus:ring-gray-500 focus:border-gray-500"
                  min={15}
                  max={480}
                  step={15}
                />
              </div>
            </div>
            <button
              onClick={savePreferences}
              disabled={isSavingPreferences}
              className="mt-4 px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSavingPreferences ? "Saving…" : "Save Preferences"}
            </button>
          </div>

          <button
            onClick={disconnectGoogleCalendar}
            className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors mt-6"
          >
            Disconnect
          </button>
        </>
      )}
    </div>
  );
}