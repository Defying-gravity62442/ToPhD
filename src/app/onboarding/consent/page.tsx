'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function ConsentOnboardingPage() {
  const { status } = useSession()
  const router = useRouter()
  const [privacy, setPrivacy] = useState(false)
  const [terms, setTerms] = useState(false)
  const [submitting, setSubmitting] = useState(false)
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
    if (!privacy || !terms) {
      setError('You must agree to the privacy policy and terms of service.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/user/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save consent')
      }
      router.push('/onboarding/e2ee')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save consent')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center">
          <div className="text-2xl font-extrabold tracking-tight text-gray-900 font-['Nanum_Myeongjo']">
            ToPhD
          </div>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-6 lg:px-8 py-20">
        <div className="max-w-xl mx-auto w-full">
          <h1 className="text-4xl sm:text-5xl font-black mb-8 text-center font-['Nanum_Myeongjo']">
            One more step
          </h1>
          <p className="text-lg text-gray-700 mb-8 text-center font-['Nanum_Myeongjo']">
            Please review and agree to the privacy policy and terms of service.
          </p>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-start">
              <input
                id="privacy"
                type="checkbox"
                checked={privacy}
                onChange={e => setPrivacy(e.target.checked)}
                className="mt-1 mr-3"
              />
              <label htmlFor="privacy" className="font-['Nanum_Myeongjo'] text-gray-900">
                I agree to the{' '}
                <a href="/privacy.html" target="_blank" className="underline">Privacy Policy</a>
              </label>
            </div>
            <div className="flex items-start">
              <input
                id="terms"
                type="checkbox"
                checked={terms}
                onChange={e => setTerms(e.target.checked)}
                className="mt-1 mr-3"
              />
              <label htmlFor="terms" className="font-['Nanum_Myeongjo'] text-gray-900">
                I agree to the{' '}
                <a href="/terms.html" target="_blank" className="underline">Terms of Service</a>
              </label>
            </div>
            {error && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-gray-700 font-['Nanum_Myeongjo']">{error}</p>
              </div>
            )}
            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center rounded-lg px-8 h-14 text-lg font-semibold text-white bg-gray-900 hover:bg-gray-800 active:bg-black transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-['Nanum_Myeongjo']"
              >
                {submitting ? 'Submitting...' : 'Continue'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
