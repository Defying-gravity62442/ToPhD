'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import UnlockDEKPage from '@/components/UnlockDEKModal'
import { useDEK } from '@/components/DEKProvider'

export default function E2EEOnboardingPage() {
  const { status } = useSession()
  const router = useRouter()
  const { setDek } = useDEK();

  // Show loading while checking authentication
  if (status === 'loading') {
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

  const handleSetPassword = async (password: string, recoveryCode: string) => {
    try {
      const res = await fetch('/api/user/encryption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, recoveryCode })
      })
      if (res.ok) {
        // Optionally unlock DEK for this session
        const unlockRes = await fetch('/api/user/encryption/unlock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        })
        if (unlockRes.ok) {
          const data = await unlockRes.json()
          setDek(data.dek)
        }
        // Redirect to preferences step
        router.push('/onboarding/preferences')
        return true
      }
      return false
    } catch {
      return false
    }
  }

  return (
    <UnlockDEKPage
      mode="set"
      onSetPassword={handleSetPassword}
      onUnlock={async () => false} // no-op, required by props
      allowSkip={false}
      sessionReady={status === 'authenticated'}
    />
  )
} 