'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useDEK } from '@/components/DEKProvider'
import { aesGcmDecrypt, safeBase64Decode } from '@/lib/client-crypto'
import ReactMarkdown from 'react-markdown'
import { Search, Filter, Eye, Calendar as CalendarIcon } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface JournalEntry {
  id: string
  date: string
  encryptedData: string
  mood?: string
  tags: Array<{ tag: { name: string } }>
  createdAt: string
  updatedAt: string
}

interface JournalTag {
  id: string
  name: string
}

export default function JournalHistoryPage() {
  const { status } = useSession()
  const router = useRouter()
  const { dek } = useDEK()
  
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMood, setSelectedMood] = useState<string>('')
  const [selectedTag, setSelectedTag] = useState<string>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [availableTags, setAvailableTags] = useState<JournalTag[]>([])
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null)
  const [decryptedContent, setDecryptedContent] = useState<string>('')

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [status, router])

  // Fetch journal entries
  useEffect(() => {
    const fetchEntries = async () => {
      if (!dek) return
      
      try {
        setLoading(true)
        setError(null)
        
        const params = new URLSearchParams()
        if (dateFrom) params.append('from', dateFrom)
        if (dateTo) params.append('to', dateTo)
        if (selectedTag) params.append('tagId', selectedTag)
        
        const response = await fetch(`/api/journal?${params.toString()}`)
        if (response.ok) {
          const data = await response.json()
          setEntries(data.entries || [])
        } else {
          setError('Failed to fetch journal entries')
        }
      } catch (err) {
        console.error('Error fetching journal entries:', err)
        setError('Failed to fetch journal entries')
      } finally {
        setLoading(false)
      }
    }

    if (status === 'authenticated' && dek) {
      fetchEntries()
    }
  }, [status, dek, dateFrom, dateTo, selectedTag])

  // Fetch available tags
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await fetch('/api/journal/tags')
        if (response.ok) {
          const data = await response.json()
          setAvailableTags(data.tags || [])
        }
      } catch (err) {
        console.error('Error fetching tags:', err)
      }
    }

    if (status === 'authenticated') {
      fetchTags()
    }
  }, [status])

  // Decrypt selected entry
  useEffect(() => {
    const decryptEntry = async () => {
      if (!selectedEntry || !dek) {
        setDecryptedContent('')
        return
      }

      try {
        const dekKey = await window.crypto.subtle.importKey(
          'raw',
          safeBase64Decode(dek),
          { name: 'AES-GCM' },
          false,
          ['decrypt']
        )
        const decrypted = await aesGcmDecrypt(selectedEntry.encryptedData, dekKey)
        setDecryptedContent(decrypted)
      } catch (error) {
        console.error('Error decrypting entry:', error)
        setDecryptedContent('Unable to decrypt entry')
      }
    }

    decryptEntry()
  }, [selectedEntry, dek])

  // Filter entries based on search term and mood
  const filteredEntries = entries.filter(entry => {
    const matchesSearch = !searchTerm || 
      entry.tags.some(tag => tag.tag.name.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesMood = !selectedMood || entry.mood === selectedMood
    return matchesSearch && matchesMood
  })

  const formatDate = (dateString: string) => {
    if (!dateString) {
      return 'Invalid date';
    }
    
    // The date stored in the database is already the correct "journal date"
    // (with timezone and 3 AM cutoff applied), so we should treat it as local
    const date = new Date(dateString);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateString);
      return 'Invalid date';
    }
    
    // Extract just the date part (YYYY-MM-DD) and create a new date
    // This ensures we don't get timezone conversion issues
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    const localDate = new Date(year, month, day);
    
    return localDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  const moodOptions = ['HAPPY', 'SAD', 'NEUTRAL', 'ANXIOUS', 'MOTIVATED', 'STRESSED']

  const isCoolingPeriod = (createdAt: string) => {
    const created = new Date(createdAt)
    const now = new Date()
    return (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24) < 7
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 font-['Nanum_Myeongjo']">Journal History</h1>
              <p className="text-gray-600 mt-2 font-['Nanum_Myeongjo']">
                Review your academic journey and personal reflections
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 font-['Nanum_Myeongjo']"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 font-['Nanum_Myeongjo']">Filters</h2>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 font-['Nanum_Myeongjo']"
            >
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? 'Hide' : 'Show'} Filters
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-['Nanum_Myeongjo']">
                  Search Tags
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by tags..."
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent font-['Nanum_Myeongjo']"
                  />
                </div>
              </div>

              {/* Mood Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-['Nanum_Myeongjo']">
                  Mood
                </label>
                <select
                  value={selectedMood}
                  onChange={(e) => setSelectedMood(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent font-['Nanum_Myeongjo']"
                >
                  <option value="">All Moods</option>
                  {moodOptions.map(mood => (
                    <option key={mood} value={mood}>{mood}</option>
                  ))}
                </select>
              </div>

              {/* Tag Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-['Nanum_Myeongjo']">
                  Tag
                </label>
                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent font-['Nanum_Myeongjo']"
                >
                  <option value="">All Tags</option>
                  {availableTags.map(tag => (
                    <option key={tag.id} value={tag.id}>{tag.name}</option>
                  ))}
                </select>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-['Nanum_Myeongjo']">
                  Date Range
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm font-['Nanum_Myeongjo']"
                    placeholder="From"
                  />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm font-['Nanum_Myeongjo']"
                    placeholder="To"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Journal Entries List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 font-['Nanum_Myeongjo']">
                  Entries ({filteredEntries.length})
                </h3>
              </div>
              
              {loading ? (
                <div className="p-4 text-center text-gray-500 font-['Nanum_Myeongjo']">
                  Loading entries...
                </div>
              ) : error ? (
                <div className="p-4 text-center text-gray-500 font-['Nanum_Myeongjo']">
                  {error}
                </div>
              ) : filteredEntries.length === 0 ? (
                <div className="p-4 text-center text-gray-500 font-['Nanum_Myeongjo']">
                  No journal entries found
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  {filteredEntries.map((entry) => {
                    const cooling = isCoolingPeriod(entry.createdAt)
                    return (
                      <div
                        key={entry.id}
                        onClick={() => setSelectedEntry(entry)}
                        className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${selectedEntry?.id === entry.id ? 'bg-gray-100' : ''}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <CalendarIcon className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900 font-['Nanum_Myeongjo']">
                              {formatDate(entry.date)}
                            </span>
                          </div>
                          {entry.mood && (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                entry.mood === 'HAPPY' ? 'bg-gray-100 text-gray-800' :
                  entry.mood === 'SAD' ? 'bg-gray-100 text-gray-800' :
                  entry.mood === 'ANXIOUS' ? 'bg-gray-100 text-gray-800' :
                  entry.mood === 'MOTIVATED' ? 'bg-gray-100 text-gray-800' :
                  entry.mood === 'STRESSED' ? 'bg-gray-100 text-gray-800' :
                              'bg-gray-100 text-gray-800'
                            } font-['Nanum_Myeongjo']`}>
                              {entry.mood}
                            </span>
                          )}
                        </div>
                        {/* Edit/Delete Controls */}
                        <div className="flex gap-2 mb-2">
                          <button
                            className="px-2 py-1 text-xs rounded bg-gray-200 text-gray-700 disabled:opacity-50"
                            disabled={cooling}
                            title={cooling ? 'Editing will be available after the 7-day cooling period to encourage authentic reflection.' : 'Edit this entry'}
                            onClick={e => {
                              e.stopPropagation()
                              if (cooling) {
                                toast('Editing will be available after the 7-day cooling period to encourage authentic reflection.')
                              } else {
                                // TODO: Implement edit logic/modal
                              }
                            }}
                          >Edit</button>
                          <button
                            className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50"
                            disabled={cooling}
                            title={cooling ? 'Deletion will be available after the 7-day cooling period to encourage authentic reflection.' : 'Delete this entry'}
                            onClick={e => {
                              e.stopPropagation()
                              if (cooling) {
                                toast('Deletion will be available after the 7-day cooling period to encourage authentic reflection.')
                              } else {
                                // TODO: Implement delete logic/modal
                              }
                            }}
                          >Delete</button>
                        </div>
                        
                        {entry.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {entry.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 font-['Nanum_Myeongjo']"
                              >
                                {tag.tag.name}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        <div className="text-xs text-gray-500 font-['Nanum_Myeongjo']">
                          Last updated: {new Date(entry.updatedAt).toLocaleString()}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Journal Entry Content */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 font-['Nanum_Myeongjo']">
                  {selectedEntry ? formatDate(selectedEntry.date) : 'Select an Entry'}
                </h3>
              </div>
              
              <div className="p-6">
                {!selectedEntry ? (
                  <div className="text-center text-gray-500 py-12 font-['Nanum_Myeongjo']">
                    <Eye className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p>Select a journal entry from the list to view its content</p>
                  </div>
                ) : (
                  <>
                    <div className="prose prose-sm max-w-none font-['Nanum_Myeongjo']">
                      <ReactMarkdown>{decryptedContent}</ReactMarkdown>
                    </div>
                    {/* Companion Conversation Controls Section */}
                    <div className="mt-8 border-t pt-4">
                      <h4 className="text-md font-semibold mb-2 font-['Nanum_Myeongjo']">Companion Conversation</h4>
                      {/* TODO: Fetch and check if a conversation exists for this entry */}
                      {/* For now, assume a conversation exists if selectedEntry is set */}
                      {selectedEntry && (
                        <DeleteConversationButton entry={selectedEntry} />
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 

function DeleteConversationButton({ entry }: { entry: JournalEntry }) {
  const [loading, setLoading] = useState(false)
  const [cooling, setCooling] = useState(true)
  const [hasConversation, setHasConversation] = useState(false)
  useEffect(() => {
    async function checkConversation() {
      try {
        const res = await fetch(`/api/journal/${entry.id}/companion`)
        if (res.ok) {
          const data = await res.json()
          if (data.messages && data.messages.length > 0) {
            setHasConversation(true)
            const createdAt = data.messages[0].createdAt
            setCooling((new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24) < 7)
          } else {
            setHasConversation(false)
          }
        } else {
          setHasConversation(false)
        }
      } catch {
        setHasConversation(false)
      }
    }
    checkConversation()
  }, [entry.id])
  if (!hasConversation) return null
  return (
    <button
                  className="px-3 py-2 rounded bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50"
      disabled={cooling || loading}
      title={cooling ? 'You can delete this conversation after the 7-day cooling period.' : 'Delete this conversation'}
      onClick={async () => {
        if (cooling) {
          toast('You can delete this conversation after the 7-day cooling period.')
          return
        }
        setLoading(true)
        try {
          const res = await fetch(`/api/journal/${entry.id}/companion`, { method: 'DELETE' })
          if (res.ok) {
            toast.success('Conversation deleted.')
            setHasConversation(false)
          } else {
            const data = await res.json()
            toast.error(data.error || 'Failed to delete conversation.')
          }
        } catch {
          toast.error('Failed to delete conversation.')
        } finally {
          setLoading(false)
        }
      }}
    >
      {loading ? 'Deleting...' : 'Delete Conversation'}
    </button>
  )
} 