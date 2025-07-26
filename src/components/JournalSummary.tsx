'use client'

import { useState, useEffect } from 'react'
import { useDEK } from '@/components/DEKProvider'
import { toast } from 'react-hot-toast'

import { Calendar, BookOpen } from 'lucide-react'
import Link from 'next/link'

interface JournalEntry {
  id: string
  date: string
  encryptedData: string
  mood?: string
  tags: Array<{ tag: { name: string } }>
  createdAt: string
  updatedAt: string
}

function ProofOfProgressSection() {
  const [weekly, setWeekly] = useState<any[]>([])
  const [monthly, setMonthly] = useState<any[]>([])
  const [yearly, setYearly] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    async function fetchSummaries() {
      setLoading(true)
      try {
        const [w, m, y] = await Promise.all([
          fetch('/api/proof/weekly').then(r => r.ok ? r.json() : { summaries: [] }),
          fetch('/api/proof/monthly').then(r => r.ok ? r.json() : { summaries: [] }),
          fetch('/api/proof/yearly').then(r => r.ok ? r.json() : { summaries: [] })
        ])
        setWeekly(w.summaries || [])
        setMonthly(m.summaries || [])
        setYearly(y.summaries || [])
      } finally {
        setLoading(false)
      }
    }
    fetchSummaries()
  }, [])
  if (loading) return <div className="mt-8">Loading Proof of Progress...</div>
  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 font-['Nanum_Myeongjo']">Proof of Progress</h3>
      <div className="space-y-6">
        <SummaryCards title="Weekly Progress" summaries={weekly} type="week" />
        <SummaryCards title="Monthly Progress" summaries={monthly} type="month" />
        <SummaryCards title="Yearly Progress" summaries={yearly} type="year" />
      </div>
    </div>
  )
}

function SummaryCards({ title, summaries, type }: { title: string, summaries: any[], type: string }) {
  const [updating, setUpdating] = useState<string | null>(null)
  const handleToggle = async (summary: any, newValue: boolean) => {
    setUpdating(summary.id)
    try {
      const res = await fetch(`/api/proof/${type}/${summary.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibleToAI: newValue })
      })
      if (res.ok) {
        toast.success(`Visibility updated for this ${type} summary.`)
        summary.visibleToAI = newValue
      } else {
        toast.error('Failed to update visibility.')
      }
    } catch {
      toast.error('Failed to update visibility.')
    } finally {
      setUpdating(null)
    }
  }
  if (!summaries.length) return <div className="mb-4"><h4 className="font-semibold mb-2">{title}</h4><div className="text-gray-500 text-sm">No {type} summaries yet.</div></div>
  return (
    <div className="mb-4">
      <h4 className="font-semibold mb-2">{title}</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {summaries.map((s, i) => (
          <div key={i} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-gray-500">
                {type === 'week' && `${new Date(s.startDate).toLocaleDateString()} - ${new Date(s.endDate).toLocaleDateString()}`}
                {type === 'month' && `${s.year}-${String(s.month).padStart(2, '0')}`}
                {type === 'year' && `${s.year}`}
              </div>
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={!!s.visibleToAI}
                  disabled={updating === s.id}
                  onChange={e => handleToggle(s, e.target.checked)}
                  aria-label="Include in AI context"
                />
                {updating === s.id ? 'Updating...' : 'Visible to AI'}
              </label>
            </div>
            <div className="text-sm text-gray-900 whitespace-pre-line font-['Nanum_Myeongjo']">{s.summary}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function JournalSummary() {
  const { dek } = useDEK()
  const [recentEntries, setRecentEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [totalEntries, setTotalEntries] = useState(0)
  const [moodStats, setMoodStats] = useState<Record<string, number>>({})

  useEffect(() => {
    const fetchJournalSummary = async () => {
      if (!dek) return
      
      try {
        setLoading(true)
        
        // Fetch recent entries (last 7 days)
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        const fromDate = sevenDaysAgo.toISOString().split('T')[0]
        
        const response = await fetch(`/api/journal?from=${fromDate}`)
        if (response.ok) {
          const data = await response.json()
          const entries = data.entries || []
          setRecentEntries(entries.slice(0, 3)) // Show last 3 entries
          
          // Calculate mood statistics
          const moodCounts: Record<string, number> = {}
          entries.forEach((entry: JournalEntry) => {
            if (entry.mood) {
              moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1
            }
          })
          setMoodStats(moodCounts)
          
          // Get total count (we'll use the same endpoint without date filter)
          const totalResponse = await fetch('/api/journal')
          if (totalResponse.ok) {
            const totalData = await totalResponse.json()
            setTotalEntries(totalData.entries?.length || 0)
          }
        }
      } catch (error) {
        console.error('Error fetching journal summary:', error)
      } finally {
        setLoading(false)
      }
    }

    if (dek) {
      fetchJournalSummary()
    }
  }, [dek])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const getMoodColor = (mood: string) => {
    switch (mood) {
      case 'HAPPY': return 'bg-gray-100 text-gray-800'
      case 'SAD': return 'bg-gray-100 text-gray-800'
      case 'ANXIOUS': return 'bg-gray-100 text-gray-800'
      case 'MOTIVATED': return 'bg-gray-100 text-gray-800'
      case 'STRESSED': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 font-['Nanum_Myeongjo']">Journal Activity</h3>
        <Link 
          href="/journal"
          className="text-sm text-gray-600 hover:text-gray-900 font-['Nanum_Myeongjo']"
        >
          View all →
        </Link>
      </div>

      <div className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 font-['Nanum_Myeongjo']">{totalEntries}</div>
            <div className="text-sm text-gray-600 font-['Nanum_Myeongjo']">Total Entries</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 font-['Nanum_Myeongjo']">{recentEntries.length}</div>
            <div className="text-sm text-gray-600 font-['Nanum_Myeongjo']">This Week</div>
          </div>
        </div>

        {/* Recent Entries */}
        {recentEntries.length > 0 ? (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 font-['Nanum_Myeongjo']">Recent Entries</h4>
            <div className="space-y-2">
              {recentEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-900 font-['Nanum_Myeongjo']">
                      {formatDate(entry.date)}
                    </span>
                  </div>
                  {entry.mood && (
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getMoodColor(entry.mood)} font-['Nanum_Myeongjo']`}>
                      {entry.mood}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <BookOpen className="mx-auto h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500 font-['Nanum_Myeongjo']">No recent entries</p>
          </div>
        )}

        {/* Mood Summary */}
        {Object.keys(moodStats).length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 font-['Nanum_Myeongjo']">Mood Summary</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(moodStats).map(([mood, count]) => (
                <span
                  key={mood}
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getMoodColor(mood)} font-['Nanum_Myeongjo']`}
                >
                  {mood} ({count})
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      <ProofOfProgressSection />
    </div>
  )
} 