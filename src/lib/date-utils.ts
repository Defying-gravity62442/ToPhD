// Utility functions for date handling

/**
 * Get the "journal date" for a given timestamp, accounting for 3 AM cutoff
 * Times before 3 AM are considered part of the previous day
 * @param timeZone - User's timezone (e.g., 'America/Los_Angeles')
 * @param timestamp - Optional timestamp, defaults to now
 * @returns Date string in YYYY-MM-DD format
 */
export function getJournalDate(timeZone: string = 'UTC', timestamp?: Date): string {
  try {
    const now = timestamp || new Date();
    // Convert to user's local time in their time zone
    const tzNow = new Date(now.toLocaleString('en-US', { timeZone }));
    // Subtract 3 hours for 3 AM cutoff
    tzNow.setHours(tzNow.getHours() - 3);
    // Use toLocaleDateString with 'en-CA' for YYYY-MM-DD format
    return tzNow.toLocaleDateString('en-CA');
  } catch {
    // Fallback to UTC date with 3 AM cutoff
    const fallback = timestamp || new Date();
    fallback.setHours(fallback.getHours() - 3);
    return fallback.toISOString().split('T')[0];
  }
}

/**
 * Get user's timezone from browser
 * @returns Timezone string (e.g., 'America/Los_Angeles')
 */
export function getUserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
} 