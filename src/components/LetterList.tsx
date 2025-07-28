import React from 'react';

type Letter = {
  id: string;
  title?: string; // Now encrypted
  unlockDate: string;
  delivered: boolean;
  createdAt: string;
};

type LetterListProps = {
  letters: Letter[];
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
};

export default function LetterList({ letters, onSelect, onDelete }: LetterListProps) {
  if (letters.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.477 8-10 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.477-8 10-8s10 3.582 10 8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Letters Yet</h3>
          <p className="text-gray-500 mb-4">Write your first letter to your future self</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTimeUntilUnlock = (unlockDate: string) => {
    const now = new Date();
    const unlock = new Date(unlockDate);
    const diffTime = unlock.getTime() - now.getTime();
    
    if (diffTime <= 0) return 'Ready to unlock';
    
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);
    
    if (diffYears > 0) {
      return `${diffYears} year${diffYears > 1 ? 's' : ''} remaining`;
    } else if (diffMonths > 0) {
      return `${diffMonths} month${diffMonths > 1 ? 's' : ''} remaining`;
    } else if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} remaining`;
    } else {
      return 'Ready to unlock';
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Letters</h2>
        <p className="text-gray-600">
          {letters.length} letter{letters.length !== 1 ? 's' : ''} to your future self
        </p>
      </div>

      <div className="space-y-4">
        {letters.map(letter => {
          const now = new Date();
          const unlockDate = new Date(letter.unlockDate);
          const isUnlocked = now >= unlockDate;
          const canRead = isUnlocked || letter.delivered;

          return (
            <div
              key={letter.id}
              className={`p-6 border rounded-xl cursor-pointer transition-all hover:shadow-md ${
                canRead 
                  ? 'border-gray-200 bg-gray-50 hover:bg-gray-100' 
                  : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
              }`}
              onClick={() => onSelect(letter.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="font-semibold text-gray-900">
                      {/* Don't show encrypted title - use generic name */}
                      Letter from {formatDate(letter.createdAt)}
                    </h3>
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      canRead
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {canRead ? (
                        <>
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                          </svg>
                          Unlocked
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          Locked
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>
                      <span className="font-medium">Unlock date:</span> {formatDate(letter.unlockDate)}
                    </div>
                    <div>
                      <span className="font-medium">Status:</span> {getTimeUntilUnlock(letter.unlockDate)}
                    </div>
                  </div>
                  
                  {canRead && (
                    <div className="mt-3">
                      <span className="inline-flex items-center text-sm text-gray-700 font-medium">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Click to read →
                      </span>
                    </div>
                  )}
                </div>

                {/* Only show delete button if unlocked or delivered */}
                {(onDelete && (isUnlocked || letter.delivered)) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Are you sure you want to delete this letter? This action cannot be undone.')) {
                        onDelete(letter.id);
                      }
                    }}
                    className="text-red-500 hover:text-red-700 transition-colors p-1"
                    title="Delete letter"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}