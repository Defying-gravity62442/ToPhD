'use client'

import { SearchSource } from '@/types/ai'

interface SearchSourcesProps {
  searchSources: SearchSource[]
}

export default function SearchSources({ searchSources }: SearchSourcesProps) {
  if (searchSources.length === 0) {
    return null
  }

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-3 font-['Nanum_Myeongjo']">
        Research Sources
      </h3>
      <p className="text-sm text-gray-500 font-['Nanum_Myeongjo'] mb-4">
        Please double-check all information with official sources before taking action.
      </p>
      <div className="space-y-3">
        {searchSources.map((source, index) => (
          <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-900 hover:text-gray-700 font-medium block mb-2"
                >
                  {source.title}
                </a>
                <p className="text-sm text-gray-600 mb-2">{source.url}</p>
                <p className="text-sm text-gray-700">{source.snippet}</p>
              </div>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-4 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 