'use client'

import Link from 'next/link'
import { signIn, useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import LegalAgreementModal from '@/components/LegalAgreementModal'

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [hasGoals, setHasGoals] = useState<boolean | null>(null)
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [showLegalAgreement, setShowLegalAgreement] = useState(false)
  const [hasAgreedToLegal, setHasAgreedToLegal] = useState<boolean | null>(null)

  useEffect(() => {
    const checkUserStatus = async () => {
      if (session?.user?.email && !isRedirecting) {
        setIsChecking(true)
        try {
          // Check if user has agreed to legal terms
          const legalResponse = await fetch('/api/user/legal-agreement')
          const legalData = legalResponse.ok ? await legalResponse.json() : null
          const hasAgreed = legalData?.hasAgreedToPrivacyPolicy && legalData?.hasAgreedToTermsOfService

          if (!hasAgreed) {
            // Check if agreement was stored in session storage during pre-OAuth flow
            const sessionAgreement = sessionStorage.getItem('legalAgreement')
            if (sessionAgreement) {
              try {
                const agreementData = JSON.parse(sessionAgreement)
                // Record the agreement in the database
                const recordResponse = await fetch('/api/user/legal-agreement', {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(agreementData),
                })
                
                if (recordResponse.ok) {
                  // Clear session storage
                  sessionStorage.removeItem('legalAgreement')
                  setHasAgreedToLegal(true)
                } else {
                  setHasAgreedToLegal(false)
                  setShowLegalAgreement(true)
                  setIsChecking(false)
                  return
                }
              } catch (error) {
                console.error('Error processing session agreement:', error)
                setHasAgreedToLegal(false)
                setShowLegalAgreement(true)
                setIsChecking(false)
                return
              }
            } else {
              setHasAgreedToLegal(false)
              setShowLegalAgreement(true)
              setIsChecking(false)
              return
            }
          } else {
            setHasAgreedToLegal(true)
          }

          // Check if user has E2EE set up
          const userRes = await fetch('/api/user/me')
          const user = userRes.ok ? await userRes.json() : null
          const hasE2EE = user?.hasE2EE

          // Check if user has completed preferences
          const preferencesResponse = await fetch('/api/user/preferences')
          const hasPreferences = preferencesResponse.ok && (await preferencesResponse.json()).preferences?.assistantName

          if (!hasE2EE) {
            setIsRedirecting(true)
            router.push('/onboarding/e2ee')
            return
          }
          if (!hasPreferences) {
            setIsRedirecting(true)
            router.push('/onboarding/preferences')
            return
          }

          setHasCompletedOnboarding(true)

          // Check if user has goals
          const goalsResponse = await fetch('/api/goals')
          if (goalsResponse.ok) {
            const data = await goalsResponse.json()
            setHasGoals(data.goals && data.goals.length > 0)
          } else {
            setHasGoals(false)
          }
        } catch (error) {
          console.error('Error checking user status:', error)
          setHasGoals(false)
          setHasCompletedOnboarding(false)
        } finally {
          setIsChecking(false)
        }
      }
    }

    checkUserStatus()
  }, [session, router, isRedirecting])

  // Handle redirects after status is determined
  useEffect(() => {
    if (session && hasCompletedOnboarding === true && !isRedirecting && !isChecking && hasAgreedToLegal === true) {
      if (hasGoals === true) {
        // User has completed onboarding and has goals - redirect to dashboard
        setIsRedirecting(true)
        router.push('/dashboard')
      } else if (hasGoals === false) {
        // User has completed onboarding but no goals - redirect to create goal
        setIsRedirecting(true)
        router.push('/create-goal')
      }
    }
  }, [session, hasCompletedOnboarding, hasGoals, isRedirecting, isChecking, hasAgreedToLegal, router])

  const handleStartWithGoogle = () => {
    // Show legal agreement modal before proceeding to OAuth
    setShowLegalAgreement(true)
  }

  const handleLegalAgreement = () => {
    setShowLegalAgreement(false)
    // Proceed to Google OAuth after agreement
    signIn('google')
  }

  const handleLegalDecline = () => {
    setShowLegalAgreement(false)
    // User declined, stay on homepage
  }

  if (status === "loading" || isChecking || isRedirecting) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-xl">Loading...</div>
    </div>
  }

  if (session) {
    // Show loading while determining redirect
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-xl">Loading...</div>
    </div>
  }

  return (
    <div className="min-h-screen bg-white">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-white px-4 py-2 rounded-md shadow z-50">
        Skip to main content
      </a>

      <header className="bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="text-2xl font-extrabold tracking-tight text-gray-900 font-['Nanum_Myeongjo']">
            ToPhD
          </div>
          {/* Placeholder for future nav */}
          <nav aria-label="Primary" className="hidden md:flex gap-8 text-sm">
            {/* <a href="#" className="hover:text-gray-700">Features</a> */}
          </nav>
        </div>
      </header>

      <main id="main" className="flex-1 flex flex-col">
        {/* Hero */}
        <section className="relative flex-1 flex items-center justify-center px-6 lg:px-8 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-tight tracking-tight text-gray-900 font-['Nanum_Myeongjo'] mb-8">
              Plan Your Path from Today to Your PhD.
            </h1>
            <p className="text-xl sm:text-2xl text-gray-700 font-['Nanum_Myeongjo'] mb-12 max-w-3xl mx-auto leading-relaxed">
              Break ambitious academic goals into actionable weekly steps, track progress, and stay motivated with AI guidance.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
              <button
                onClick={handleStartWithGoogle}
                className="group inline-flex items-center justify-center rounded-lg px-8 h-14 text-lg font-semibold text-white bg-gray-900 hover:bg-gray-800 active:bg-black transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 shadow-lg hover:shadow-xl"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Start with Google</span>
              </button>

              <Link
                href="https://github.com/Defying-gravity62442/ToPhD/blob/main/README.md"
                className="inline-flex items-center justify-center rounded-lg border-2 border-gray-300 bg-white px-8 h-14 text-lg font-semibold text-gray-900 hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Self-Host via GitHub
              </Link>
            </div>

            <div className="max-w-2xl mx-auto">
              <p className="text-base text-gray-600 leading-relaxed font-['Nanum_Myeongjo']">
              ToPhD is a personal open-source project created by an undergraduate student to help fellow undergraduates planning graduate school. This service is provided completely free. You can self-host your own instance with your API key.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <nav aria-label="Footer" className="flex flex-col sm:flex-row gap-6 sm:gap-10 justify-center mb-4 text-sm">
            <a href="https://github.com/Defying-gravity62442/ToPhD/blob/main/PRIVACY.md" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-800 transition font-['Nanum_Myeongjo']">Privacy Policy</a>
            <a href="https://github.com/Defying-gravity62442/ToPhD/blob/main/TERMS.md" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-800 transition font-['Nanum_Myeongjo']">Terms of Service</a>
          </nav>
          <p className="text-center text-sm text-gray-600 font-['Nanum_Myeongjo'] mb-2">
            If you have any suggestions or complaints, please contact us at <a href="mailto:heming@cs.washington.edu" className="underline hover:text-gray-800">heming@cs.washington.edu</a>.
          </p>
          <p className="text-center text-sm text-gray-500 font-['Nanum_Myeongjo']">
            © {new Date().getFullYear()} ToPhD. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Legal Agreement Modal */}
      <LegalAgreementModal
        isOpen={showLegalAgreement}
        onAgree={handleLegalAgreement}
        onDecline={handleLegalDecline}
      />
    </div>
  )
}