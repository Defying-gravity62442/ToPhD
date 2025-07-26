'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import EditableMilestone from '@/components/EditableMilestone'
import SearchSources from '@/components/SearchSources'
import UnlockDEKModal from '@/components/UnlockDEKModal'
import { AIResponse, RoadmapItem, SearchSource } from '@/types/ai'
import { useDEK } from '@/components/DEKProvider';
import { aesGcmEncrypt, safeBase64Decode } from '@/lib/client-crypto';
import ReactMarkdown from 'react-markdown';

export default function CreateGoalPage() {
  const router = useRouter()
  const [goalText, setGoalText] = useState('')
  // Rotating placeholder state
  const exampleGoals = [
    "Apply to Stanford CS PhD, 2027 entry",
    "I need to finish reading a book by the end of September",
    "I want to join this professor's lab",
    "I want to excel in the lab I am currently in",
    "Win a best paper award at a top conference",
    "Publish my first research paper this year",
    "Get accepted to a summer research internship",
    "Build a strong relationship with my advisor",
    "Master advanced machine learning techniques",
    "Start a collaborative project with another lab"
  ];
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false)
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null)
  const [searchSources, setSearchSources] = useState<SearchSource[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [showUnlockModal, setShowUnlockModal] = useState(false)
  const { dek } = useDEK();

  useEffect(() => {
    if (goalText) return; // Don't rotate if user is typing
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % exampleGoals.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [goalText, exampleGoals.length]);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [router])

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

  const handleGoalSubmit = async () => {
    if (!goalText.trim()) return
    
    setIsProcessing(true)
    setError(null)
    
    try {
      // Step 1: Get search results from Perplexity
      const perplexityResponse = await fetch('/api/goals/perplexity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ goal: goalText }),
      })

      if (!perplexityResponse.ok) {
        const errorData = await perplexityResponse.json()
        throw new Error(errorData.error || 'Failed to search for information')
      }

      const { searchResults, searchSources: sources } = await perplexityResponse.json()

      // Step 2: Process with Bedrock
      const bedrockResponse = await fetch('/api/goals/bedrock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          searchResults,
          searchSources: sources
        }),
      })

      if (!bedrockResponse.ok) {
        const errorData = await bedrockResponse.json()
        throw new Error(errorData.error || 'Failed to create roadmap')
      }

      const aiData = await bedrockResponse.json()
      setAiResponse(aiData)
      setSearchSources(sources || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleMilestoneUpdate = (index: number, updated: RoadmapItem) => {
    if (!aiResponse) return
    
    const updatedRoadmap = [...aiResponse.roadmap]
    updatedRoadmap[index] = updated
    
    setAiResponse({
      ...aiResponse,
      roadmap: updatedRoadmap
    })
  }

  const handleMilestoneDelete = (index: number) => {
    if (!aiResponse) return
    
    const updatedRoadmap = aiResponse.roadmap.filter((_, i) => i !== index)
    
    setAiResponse({
      ...aiResponse,
      roadmap: updatedRoadmap
    })
  }

  const handleCreateRoadmap = async () => {
    if (!aiResponse) return;
    
    // Check if DEK is available
    if (!dek) {
      setError('Please unlock your data encryption key first.');
      setShowUnlockModal(true);
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // Import DEK as CryptoKey
      const dekKey = await window.crypto.subtle.importKey(
        'raw',
        safeBase64Decode(dek),
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      );

      // Encrypt goal data
      const encryptedTitle = await aesGcmEncrypt(aiResponse.title || goalText, dekKey);
      const encryptedDescription = await aesGcmEncrypt(goalText, dekKey);

      // Step 1: Create the goal
      const goalResponse = await fetch('/api/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: encryptedTitle,
          description: encryptedDescription,
          status: 'active'
        }),
      });

      if (!goalResponse.ok) {
        const errorData = await goalResponse.json();
        if (goalResponse.status === 401) {
          throw new Error('You need to be signed in to save your roadmap. Please sign in and try again.');
        }
        throw new Error(errorData.error || 'Failed to create goal');
      }

      const { goal } = await goalResponse.json();
      console.log('Created goal:', goal);

      // Step 2: Create milestones for the goal
      const milestonePromises = aiResponse.roadmap.map(async (item) => {
        try {
          // Encrypt milestone data
          const encryptedMilestoneTitle = await aesGcmEncrypt(item.action, dekKey);
          const encryptedMilestoneDescription = item.notes ? await aesGcmEncrypt(item.notes, dekKey) : null;
          
          // Use deadline directly (AI returns YYYY-MM-DD format)
          const dueDate = item.deadline && item.deadline.trim() ? item.deadline.trim() : null;

          const milestoneResponse = await fetch('/api/milestones', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              goalId: goal.id,
              title: encryptedMilestoneTitle,
              description: encryptedMilestoneDescription,
              dueDate: dueDate
            }),
          });

          if (!milestoneResponse.ok) {
            const errorData = await milestoneResponse.json();
            console.error('Failed to create milestone:', errorData);
            throw new Error(`Failed to create milestone: ${item.action}`);
          }

          const milestoneData = await milestoneResponse.json();
          return milestoneData.milestone;
        } catch (error) {
          console.error('Error creating milestone:', item.action, error);
          throw error;
        }
      });

      // Wait for all milestones to be created
      await Promise.all(milestonePromises);
      
      console.log('All milestones created successfully');

      // Redirect to dashboard
      router.push('/dashboard');
      
    } catch (err) {
      console.error('Error creating roadmap:', err);
      setError(err instanceof Error ? err.message : 'Failed to save roadmap');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-white px-4 py-2 rounded-md shadow z-50">
        Skip to main content
      </a>

      <header className="bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-extrabold tracking-tight text-gray-900 font-['Nanum_Myeongjo']">
            ToPhD
          </Link>
          <nav aria-label="Primary" className="hidden md:flex gap-8 text-sm">
            <Link href="/dashboard" className="hover:text-gray-700">Dashboard</Link>
          </nav>
        </div>
      </header>

      <main id="main" className="flex-1 flex flex-col">
        <section className="relative flex-1 flex items-center justify-center px-6 lg:px-8 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-tight tracking-tight text-gray-900 font-['Nanum_Myeongjo'] mb-8">
              Turn your PhD dreams into actionable plans
            </h1>
            <p className="text-xl sm:text-2xl text-gray-700 font-['Nanum_Myeongjo'] mb-12 max-w-3xl mx-auto leading-relaxed">
              Tell us your academic goal and we&apos;ll create a personalized roadmap
            </p>
            <p className="text-sm text-gray-500 font-['Nanum_Myeongjo'] mb-8">
              Please double-check all information with official sources before taking action.
            </p>

            {/* DEK Status Warning */}
            {!dek && (
              <div className="max-w-2xl mx-auto mb-8">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <div className="text-left">
                      <p className="text-gray-800 font-medium font-['Nanum_Myeongjo']">Data encryption key required</p>
                      <p className="text-gray-700 text-sm font-['Nanum_Myeongjo'] mt-1">
                        You&apos;ll need to unlock your encryption key to save your roadmap.
                      </p>
                    </div>
                    <button 
                      onClick={() => setShowUnlockModal(true)}
                      className="ml-auto text-gray-600 hover:text-gray-800 text-sm underline"
                    >
                      Unlock Now
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Goal Input Section */}
            <div className="max-w-2xl mx-auto mb-8">
              <div className="bg-white rounded-lg border-2 border-gray-200 p-8 shadow-lg">
                <h2 className="text-2xl font-bold text-gray-900 font-['Nanum_Myeongjo'] mb-4">
                  What&apos;s your academic goal? (Be specific!)
                </h2>
                
                <textarea
                  placeholder={exampleGoals[placeholderIndex]}
                  value={goalText}
                  onChange={(e) => setGoalText(e.target.value)}
                  className="w-full min-h-[120px] p-4 border-2 border-gray-300 rounded-lg text-lg font-['Nanum_Myeongjo'] focus:border-gray-900 focus:outline-none transition-colors"
                />
                
                <button 
                  onClick={handleGoalSubmit}
                  disabled={!goalText.trim() || isProcessing}
                  className="w-full mt-6 group inline-flex items-center justify-center rounded-lg px-8 h-14 text-lg font-semibold text-white bg-gray-900 hover:bg-gray-800 active:bg-black transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 shadow-lg hover:shadow-xl disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Creating your roadmap...' : 'Create My Roadmap →'}
                </button>
              </div>
            </div>

            {/* Error State */}
            {error && (
              <div className="max-w-2xl mx-auto mb-8">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-gray-800 font-['Nanum_Myeongjo']">{error}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Loading State */}
            {isProcessing && (
              <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-lg border-2 border-gray-200 p-8 shadow-lg">
                  <div className="flex items-center justify-center space-x-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                    <span className="text-lg text-gray-700 font-['Nanum_Myeongjo']">
                      Researching requirements and building your milestones...
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Results */}
            {aiResponse && (
              <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-lg border-2 border-gray-200 p-8 shadow-lg">
                  <h2 className="text-2xl font-bold text-gray-900 font-['Nanum_Myeongjo'] mb-4">
                    Your Personalized Roadmap
                  </h2>
                  <p className="text-sm text-gray-500 font-['Nanum_Myeongjo'] mb-6">
                    Please double-check all information with official sources before taking action.
                  </p>
                  
                  {/* Summary Text */}
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-left text-gray-700 font-['Nanum_Myeongjo'] prose prose-sm max-w-none">
                      <ReactMarkdown>{aiResponse.text}</ReactMarkdown>
                    </div>
                  </div>
                  
                  {/* Editable Milestones */}
                  <div className="space-y-4 mb-8">
                    {aiResponse.roadmap.map((milestone, index) => (
                      <EditableMilestone
                        key={`${milestone.action}-${milestone.deadline}-${index}`}
                        milestone={milestone}
                        index={index}
                        onUpdate={handleMilestoneUpdate}
                        onDelete={handleMilestoneDelete}
                      />
                    ))}
                  </div>
                  
                  {/* Search Sources */}
                  {searchSources.length > 0 && (
                    <div className="mb-8">
                      <SearchSources searchSources={searchSources} />
                    </div>
                  )}
                  
                  {/* Create Roadmap Button */}
                  <div className="flex flex-col items-center space-y-4">
                    <button 
                      onClick={handleCreateRoadmap}
                      disabled={isCreating || !dek}
                      className="w-full group inline-flex items-center justify-center rounded-lg px-8 h-14 text-lg font-semibold text-white bg-gray-600 hover:bg-gray-700 active:bg-gray-800 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 shadow-lg hover:shadow-xl disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {isCreating ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving your roadmap...
                        </>
                      ) : !dek ? (
                        'Unlock Data to Save Roadmap'
                      ) : (
                        'Save My Roadmap ✓'
                      )}
                    </button>
                    
                    {!dek && (
                      <p className="text-sm text-gray-500 font-['Nanum_Myeongjo']">
                        Your roadmap will be encrypted and stored securely
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-sm text-gray-500 font-['Nanum_Myeongjo']">
            © {new Date().getFullYear()} ToPhD. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Unlock Modal */}
      {showUnlockModal && (
        <UnlockDEKModal 
          mode="unlock"
          onUnlock={async (password) => {
            try {
              const res = await fetch('/api/user/encryption/unlock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
              });
              if (res.ok) {
                await res.json();
                // The DEK will be set by the DEKProvider
                setShowUnlockModal(false);
                return true;
              }
              return false;
            } catch (error) {
              console.error('Error unlocking DEK:', error);
              return false;
            }
          }}
          onSkip={() => setShowUnlockModal(false)}
        />
      )}
    </div>
  );
}