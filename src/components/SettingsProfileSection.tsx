interface SettingsProfileSectionProps {
  assistantName: string;
  setAssistantName: (name: string) => void;
  assistantTone: string;
  setAssistantTone: (tone: string) => void;
  currentInstitution: string;
  setCurrentInstitution: (institution: string) => void;
  currentDepartment: string;
  setCurrentDepartment: (department: string) => void;
  background: string;
  setBackground: (background: string) => void;
  isSubmitting: boolean;
  error: string | null;
  success: string | null;
  handleSubmit: (e: React.FormEvent) => void;
}

const toneOptions = [
  { value: 'encouraging', label: 'Encouraging', description: 'Supportive and motivating' },
  { value: 'inspirational', label: 'Inspirational', description: 'Uplifting and inspiring' },
  { value: 'tough_love', label: 'Tough Love', description: 'Direct and challenging' }
];

export default function SettingsProfileSection({
  assistantName,
  setAssistantName,
  assistantTone,
  setAssistantTone,
  currentInstitution,
  setCurrentInstitution,
  currentDepartment,
  setCurrentDepartment,
  background,
  setBackground,
  isSubmitting,
  error,
  success,
  handleSubmit
}: SettingsProfileSectionProps) {
  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Current Institution */}
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

      {/* Current Department */}
      <div>
        <label htmlFor="currentDepartment" className="block text-lg font-semibold text-gray-900 mb-3 font-['Nanum_Myeongjo']">
          What departments or fields are you currently studying?
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

      {/* User Background */}
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

      {/* AI Assistant Name */}
      <div>
        <label htmlFor="assistantName" className="block text-lg font-semibold text-gray-900 mb-3 font-['Nanum_Myeongjo']">
          What should I call your AI assistant?
        </label>
        <input
          type="text"
          id="assistantName"
          value={assistantName}
          onChange={(e) => setAssistantName(e.target.value)}
          placeholder="e.g., Dr. Smith, Coach, Mentor, or any name you prefer"
          className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent font-['Nanum_Myeongjo']"
          maxLength={50}
        />
        <p className="mt-2 text-sm text-gray-600 font-['Nanum_Myeongjo']">
          This is how your AI assistant will refer to itself when helping you.
        </p>
      </div>

      {/* AI Assistant Tone */}
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

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-gray-700 font-['Nanum_Myeongjo']">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-gray-700 font-['Nanum_Myeongjo']">{success}</p>
        </div>
      )}

      {/* Submit Button */}
      <div className="pt-6">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full inline-flex items-center justify-center rounded-lg px-8 h-14 text-lg font-semibold text-white bg-gray-900 hover:bg-gray-800 active:bg-black transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-['Nanum_Myeongjo']"
        >
          {isSubmitting ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </form>
  );
} 