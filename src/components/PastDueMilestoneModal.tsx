import React from 'react';

interface PastDueMilestoneModalProps {
  open: boolean;
  milestoneTitle: string;
  dueDate: string;
  goalTitle: string;
  onComplete: () => void;
  onJournal: () => void;
  onClose: () => void;
}

const PastDueMilestoneModal: React.FC<PastDueMilestoneModalProps> = ({
  open,
  milestoneTitle,
  dueDate,
  goalTitle,
  onComplete,
  onJournal,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-8 relative animate-fadeIn">
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <div className="flex flex-col items-center text-center">
          <div className="mb-4">
            <span className="inline-block bg-gray-100 text-gray-800 rounded-full px-3 py-1 text-xs font-semibold mb-2">Past Due</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2 font-['Nanum_Myeongjo']">Milestone Check-In</h2>
          <div className="mb-4 text-gray-700 font-['Nanum_Myeongjo']">
            <div className="font-semibold">{milestoneTitle}</div>
            <div className="text-sm text-gray-500">Due: {dueDate} • Goal: {goalTitle}</div>
          </div>
          <div className="mb-6 text-gray-600 font-['Nanum_Myeongjo']">
            Did you complete this milestone?
          </div>
          <div className="flex flex-col gap-3 w-full">
            <button
                              className="w-full rounded-lg px-6 py-3 text-lg font-semibold text-white bg-gray-600 hover:bg-gray-700 transition-all duration-200 shadow"
              onClick={onComplete}
            >
              Yes, I did it!
            </button>
            <button
                              className="w-full rounded-lg px-6 py-3 text-lg font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all duration-200 shadow"
              onClick={onJournal}
            >
              Not yet – I&apos;ll reflect in my journal
            </button>
            <button
              className="w-full rounded-lg px-6 py-2 text-base font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all duration-200"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PastDueMilestoneModal; 