'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface LegalAgreementModalProps {
  isOpen: boolean
  onAgree: () => void
  onDecline: () => void
}

export default function LegalAgreementModal({ isOpen, onAgree, onDecline }: LegalAgreementModalProps) {
  const [privacyChecked, setPrivacyChecked] = useState(false)
  const [termsChecked, setTermsChecked] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAgree = async () => {
    if (!privacyChecked || !termsChecked) return
    
    setIsSubmitting(true)
    try {
      // Store agreement in session storage for pre-OAuth flow
      sessionStorage.setItem('legalAgreement', JSON.stringify({
        agreedToPrivacyPolicy: true,
        agreedToTermsOfService: true,
        agreedAt: new Date().toISOString()
      }))
      
      onAgree()
    } catch (error) {
      console.error('Error storing agreement:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const canProceed = privacyChecked && termsChecked

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onDecline}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-8">
              {/* Header */}
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Welcome to ToPhD
                </h2>
                <p className="text-gray-600 text-lg">
                  Before you begin, please review and agree to our terms
                </p>
              </div>

              {/* Content */}
              <div className="space-y-6 mb-8">
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Privacy Policy
                  </h3>
                  <div className="prose prose-gray max-w-none text-sm">
                    <p className="mb-4">
                      ToPhD is built with privacy-first principles. Your data is end-to-end encrypted, 
                      and we collect only what&apos;s necessary to provide our services.
                    </p>
                    <ul className="space-y-2 text-gray-700">
                      <li>• Your content is encrypted on your device before reaching our servers</li>
                      <li>• We use Google OAuth for secure authentication</li>
                      <li>• AI features require temporary decryption for processing</li>
                      <li>• You can export or delete your data at any time</li>
                      <li>• No personal data is sold to third parties</li>
                    </ul>
                  </div>
                  <div className="mt-4">
                    <a
                      href="https://github.com/Defying-gravity62442/ToPhD/blob/main/PRIVACY.md"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-600 hover:text-gray-700 font-medium text-sm"
                    >
                      Read full Privacy Policy →
                    </a>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Terms of Service
                  </h3>
                  <div className="prose prose-gray max-w-none text-sm">
                    <p className="mb-4">
                      ToPhD is a free, personal open-source project created to help students plan their 
                      path to graduate school.
                    </p>
                    <ul className="space-y-2 text-gray-700">
                      <li>• Service is provided &quot;as-is&quot; for personal and educational use</li>
                      <li>• You retain ownership of all your content</li>
                      <li>• Journal entries have a 7-day editing cooling-off period</li>
                      <li>• You can delete your account and data at any time</li>
                      <li>• No guarantees regarding service availability</li>
                    </ul>
                  </div>
                  <div className="mt-4">
                    <a
                      href="https://github.com/Defying-gravity62442/ToPhD/blob/main/TERMS.md"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-600 hover:text-gray-700 font-medium text-sm"
                    >
                      Read full Terms of Service →
                    </a>
                  </div>
                </div>
              </div>

              {/* Checkboxes */}
              <div className="space-y-4 mb-8">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={privacyChecked}
                    onChange={(e) => setPrivacyChecked(e.target.checked)}
                    className="mt-1 h-4 w-4 text-gray-600 border-gray-300 rounded focus:ring-gray-500"
                  />
                  <span className="text-sm text-gray-700">
                    I have read and agree to the{' '}
                    <a
                      href="/PRIVACY.md"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-600 hover:text-gray-700 font-medium"
                    >
                      Privacy Policy
                    </a>
                  </span>
                </label>

                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsChecked}
                    onChange={(e) => setTermsChecked(e.target.checked)}
                    className="mt-1 h-4 w-4 text-gray-600 border-gray-300 rounded focus:ring-gray-500"
                  />
                  <span className="text-sm text-gray-700">
                    I have read and agree to the{' '}
                    <a
                      href="/TERMS.md"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-600 hover:text-gray-700 font-medium"
                    >
                      Terms of Service
                    </a>
                  </span>
                </label>
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={onDecline}
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Decline
                </button>
                <button
                  onClick={handleAgree}
                  disabled={!canProceed || isSubmitting}
                  className="flex-1 px-6 py-3 text-white bg-gray-600 hover:bg-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Agreeing...' : 'I Agree & Continue'}
                </button>
              </div>

              {/* Note */}
              <p className="text-xs text-gray-500 text-center mt-6">
                By clicking &quot;I Agree & Continue&quot;, you acknowledge that you have read, 
                understood, and agree to be bound by our Privacy Policy and Terms of Service.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
} 