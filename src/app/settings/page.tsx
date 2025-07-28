'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import SettingsProfileSection from '@/components/SettingsProfileSection';
import SettingsIntegrationsSection from '@/components/SettingsIntegrationsSection';
import SettingsAccountSection from '@/components/SettingsAccountSection';
import { useDecryptedGoals } from '@/app/providers';

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [assistantName, setAssistantName] = useState('')
  const [assistantTone, setAssistantTone] = useState('encouraging')
  const [currentInstitution, setCurrentInstitution] = useState('')
  const [currentDepartment, setCurrentDepartment] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedSection, setSelectedSection] = useState<'profile' | 'integrations' | 'account'>('profile');
  const [background, setBackground] = useState('')
  // Remove local decryptedGoals state
  const { decryptedGoals } = useDecryptedGoals();

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [status, router])

  // Handle URL parameters for section selection
  useEffect(() => {
    const calendar = searchParams.get('calendar')
    const success = searchParams.get('success')
    
    if (calendar === 'connected' && success === 'true') {
      setSelectedSection('integrations')
      // Clear the URL parameters after setting the section
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('calendar')
      newUrl.searchParams.delete('success')
      window.history.replaceState({}, '', newUrl.toString())
    }
  }, [searchParams])

  // Load current preferences
  useEffect(() => {
    const loadPreferences = async () => {
      if (session?.user?.email) {
        try {
          const response = await fetch('/api/user/preferences')
          if (response.ok) {
            const data = await response.json()
            if (data.preferences) {
              setAssistantName(data.preferences.assistantName || '')
              setAssistantTone(data.preferences.assistantTone || 'encouraging')
              setCurrentInstitution(data.preferences.currentInstitution || '')
              setCurrentDepartment(data.preferences.currentDepartment || '')
              setBackground(data.preferences.background || '')
            }
          }
        } catch (error) {
          console.error('Error loading preferences:', error)
        } finally {
          setIsLoading(false)
        }
      }
    }

    if (status === 'authenticated') {
      loadPreferences()
    }
  }, [session, status])

  // Show loading while checking authentication
  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  // Don't render if not authenticated
  if (status === 'unauthenticated') {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!assistantName.trim()) {
      setError('Please enter a name for your AI assistant')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/user/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assistantName: assistantName.trim(),
          assistantTone,
          currentInstitution: currentInstitution.trim(),
          currentDepartment: currentDepartment.trim(),
          background: background.trim()
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save preferences')
      }

      setSuccess('Preferences updated successfully!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preferences')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirm('Are you absolutely sure you want to delete your account? This action cannot be undone and will permanently delete all your data including goals, milestones, and preferences.')) {
      return
    }

    setIsDeleting(true)
    setError(null)

    try {
      const response = await fetch('/api/user/delete-account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete account')
      }

      // Sign out the user and redirect to home page
      await signOut({ callbackUrl: '/' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account')
      setIsDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col py-10 px-6">
        <Link
          href="/dashboard"
          className="mb-8 inline-flex items-center px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-200 font-semibold text-base font-['Nanum_Myeongjo'] transition-colors border border-gray-200"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back to Dashboard
        </Link>
        <div className="mb-12">
          <div className="text-2xl font-extrabold tracking-tight text-gray-900 font-['Nanum_Myeongjo']">
            ToPhD
          </div>
        </div>
        <nav className="flex flex-col gap-2">
          <button
            className={`text-left px-4 py-3 rounded-lg font-semibold text-lg font-['Nanum_Myeongjo'] transition-colors ${selectedSection === 'profile' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-200'}`}
            onClick={() => setSelectedSection('profile')}
          >
            Profile & Preferences
          </button>
          <button
            className={`text-left px-4 py-3 rounded-lg font-semibold text-lg font-['Nanum_Myeongjo'] transition-colors ${selectedSection === 'integrations' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-200'}`}
            onClick={() => setSelectedSection('integrations')}
          >
            Integrations
          </button>
          <button
            className={`text-left px-4 py-3 rounded-lg font-semibold text-lg font-['Nanum_Myeongjo'] transition-colors ${selectedSection === 'account' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-200'}`}
            onClick={() => setSelectedSection('account')}
          >
            Account
          </button>
        </nav>
      </aside>
      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-start px-6 lg:px-16 py-16">
        <div className="w-full max-w-2xl">
          {selectedSection === 'profile' && (
            <SettingsProfileSection
              assistantName={assistantName}
              setAssistantName={setAssistantName}
              assistantTone={assistantTone}
              setAssistantTone={setAssistantTone}
              currentInstitution={currentInstitution}
              setCurrentInstitution={setCurrentInstitution}
              currentDepartment={currentDepartment}
              setCurrentDepartment={setCurrentDepartment}
              background={background}
              setBackground={setBackground}
              isSubmitting={isSubmitting}
              error={error}
              success={success}
              handleSubmit={handleSubmit}
            />
          )}
          {selectedSection === 'integrations' && (
            <SettingsIntegrationsSection decryptedGoals={decryptedGoals} />
          )}
          {selectedSection === 'account' && (
            <SettingsAccountSection
              isDeleting={isDeleting}
              handleDeleteAccount={handleDeleteAccount}
            />
          )}
        </div>
      </main>
    </div>
  );
} 