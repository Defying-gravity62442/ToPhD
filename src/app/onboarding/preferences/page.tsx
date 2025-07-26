'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function PreferencesOnboardingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [assistantName, setAssistantName] = useState('')
  const [assistantTone, setAssistantTone] = useState('encouraging')
  const [currentInstitution, setCurrentInstitution] = useState('')
  const [currentDepartment, setCurrentDepartment] = useState('')
  const [background, setBackground] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

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
      router.push('/create-goal')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preferences')
    } finally {
      setIsSubmitting(false)
    }
  }

  const toneOptions = [
    { value: 'encouraging', label: 'Encouraging', description: 'Supportive and motivating' },
    { value: 'inspirational', label: 'Inspirational', description: 'Uplifting and inspiring' },
    { value: 'tough_love', label: 'Tough Love', description: 'Direct and challenging' }
  ]

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="text-2xl font-extrabold tracking-tight text-gray-900 font-['Nanum_Myeongjo']">
            ToPhD
          </div>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-6 lg:px-8 py-20">
        <div className="max-w-2xl mx-auto w-full">
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-black leading-tight tracking-tight text-gray-900 font-['Nanum_Myeongjo'] mb-6">
              Welcome, {session?.user?.name?.split(' ')[0] || 'there'}! 👋
            </h1>
            <p className="text-xl text-gray-700 font-['Nanum_Myeongjo'] leading-relaxed">
              Let&apos;s personalize your AI assistant to help you achieve your PhD goals.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label htmlFor="currentInstitution" className="block text-lg font-semibold text-gray-900 mb-3 font-['Nanum_Myeongjo']">
                Where do you currently go to school?
              </label>
              <input
                type="text"
                id="currentInstitution"
                value={currentInstitution}
                onChange={(e) => setCurrentInstitution(e.target.value)}
                placeholder="e.g., Stanford University, MIT, University of California Berkeley"
                className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent font-['Nanum_Myeongjo']"
                maxLength={100}
              />
              <p className="mt-2 text-sm text-gray-600 font-['Nanum_Myeongjo']">
                This helps us provide more relevant guidance for your PhD applications.
              </p>
            </div>
            <div>
              <label htmlFor="currentDepartment" className="block text-lg font-semibold text-gray-900 mb-3 font-['Nanum_Myeongjo']">
                What department or field are you currently studying?
              </label>
              <input
                type="text"
                id="currentDepartment"
                value={currentDepartment}
                onChange={(e) => setCurrentDepartment(e.target.value)}
                placeholder="e.g., Computer Science, Psychology, Mechanical Engineering, Biology"
                className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent font-['Nanum_Myeongjo']"
                maxLength={100}
              />
              <p className="mt-2 text-sm text-gray-600 font-['Nanum_Myeongjo']">
                This helps us understand your academic background and provide more targeted advice.
              </p>
            </div>
            <div>
              <label htmlFor="background" className="block text-lg font-semibold text-gray-900 mb-3 font-['Nanum_Myeongjo']">
                Tell us more about your background (optional)
              </label>
              <textarea
                id="background"
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                placeholder="Share anything about your academic, professional, or personal background that might help us personalize your experience."
                className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent font-['Nanum_Myeongjo']"
                maxLength={1000}
                rows={4}
              />
              <p className="mt-2 text-sm text-gray-600 font-['Nanum_Myeongjo']">
                This information is private and helps us personalize your experience.
              </p>
            </div>
            <div>
              <label htmlFor="assistantName" className="block text-lg font-semibold text-gray-900 mb-3 font-['Nanum_Myeongjo']">
                What name would you like to call your AI assistant?
              </label>
              <input
                type="text"
                id="assistantName"
                value={assistantName}
                onChange={(e) => setAssistantName(e.target.value)}
                placeholder="Any name you prefer!"
                className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent font-['Nanum_Myeongjo']"
                maxLength={50}
              />
              <p className="mt-2 text-sm text-gray-600 font-['Nanum_Myeongjo']">
                This is how your AI assistant will refer to itself when helping you.
              </p>
            </div>
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-3 font-['Nanum_Myeongjo']">
                How should your AI assistant communicate with you?
              </label>
              <div className="space-y-3">
                {toneOptions.map((option) => (
                  <label key={option.value} className="flex items-start p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="assistantTone"
                      value={option.value}
                      checked={assistantTone === option.value}
                      onChange={(e) => setAssistantTone(e.target.value)}
                      className="mt-1 mr-3"
                    />
                    <div>
                      <div className="font-semibold text-gray-900 font-['Nanum_Myeongjo']">
                        {option.label}
                      </div>
                      <div className="text-sm text-gray-600 font-['Nanum_Myeongjo']">
                        {option.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            {error && (
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-gray-700 font-['Nanum_Myeongjo']">{error}</p>
        </div>
            )}
            <div className="pt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center rounded-lg px-8 h-14 text-lg font-semibold text-white bg-gray-900 hover:bg-gray-800 active:bg-black transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-['Nanum_Myeongjo']"
              >
                {isSubmitting ? 'Setting up...' : 'Continue to Goal Creation'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
} 