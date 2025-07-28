'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Send, MessageCircle, Brain, Loader2, RefreshCw, Lightbulb } from 'lucide-react';

interface CompanionMessage {
  role: 'user' | 'companion';
  content: string;
  id?: string;
  createdAt?: string;
}

interface AICompanionProps {
  assistantName: string;
  journalContent: string;
  journalEntryId: string | null;
  dek: string | null;
  onSendMessage: (message: string) => Promise<void>;
  messages: CompanionMessage[];
  loading: boolean;
  error: string | null;
  started: boolean;
  onReset: () => void;
}

export default function AICompanion({
  assistantName,
  journalContent,
  journalEntryId,
  dek,
  onSendMessage,
  messages,
  loading,
  error,
  started,
  onReset
}: AICompanionProps) {
  const [input, setInput] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (chatContainerRef.current && messages.length > 0) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;
    const message = input.trim();
    setInput('');
    await onSendMessage(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    
    // Auto-resize the textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
  };

  const startConversation = async () => {
    const baseMsg = "I'd like to reflect on my journal entry today.";
    const msg = journalContent.trim()
      ? `${baseMsg} Here is what I wrote: ${journalContent}`
      : baseMsg;
    await onSendMessage(msg);
  };

  if (!dek) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-3">
            <Brain className="w-4 h-4 text-gray-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 font-['Nanum_Myeongjo']">
            {assistantName || 'AI Companion'}
          </h3>
        </div>
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <p className="text-gray-600 font-['Nanum_Myeongjo'] mb-4">
            Unlock your data to chat with your {assistantName || 'AI companion'}
          </p>
        </div>
      </div>
    );
  }

  if (!journalEntryId) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-3">
            <Brain className="w-4 h-4 text-gray-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 font-['Nanum_Myeongjo']">
            {assistantName || 'AI Companion'}
          </h3>
        </div>
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-600 font-['Nanum_Myeongjo']">
            Start writing in your journal to begin a conversation
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center mr-3">
            <Lightbulb className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 font-['Nanum_Myeongjo']">
              {assistantName || 'AI Companion'}
            </h3>
            <p className="text-sm text-gray-500 font-['Nanum_Myeongjo']">
              Your academic journey companion
            </p>
          </div>
        </div>
        {started && (
          <button
            onClick={onReset}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Reset conversation"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content Area */}
      {!started ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Brain className="w-8 h-8 text-gray-600" />
          </div>
          <h4 className="text-lg font-semibold text-gray-900 mb-2 font-['Nanum_Myeongjo']">
            Ready to reflect?
          </h4>
          <p className="text-gray-600 mb-6 font-['Nanum_Myeongjo']">
            Start a conversation to reflect on your journal entry and get insights about your academic journey.
          </p>
          <button
            onClick={startConversation}
            disabled={loading || !journalContent.trim()}
            className="inline-flex items-center px-6 py-3 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed font-['Nanum_Myeongjo']"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Starting conversation...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 mr-2" />
                Start conversation
              </>
            )}
          </button>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key="chat-area"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* Messages */}
            <div 
              ref={chatContainerRef}
              className="max-h-80 overflow-y-auto space-y-4 pb-4"
            >
              <AnimatePresence initial={false}>
                {messages.map((msg, idx) => (
                  <motion.div
                    key={msg.id || idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md rounded-2xl px-4 py-3 ${
                      msg.role === 'user' 
                        ? 'bg-gray-900 text-white' 
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      <div className="text-xs opacity-70 mb-2 font-['Nanum_Myeongjo']">
                        {msg.role === 'user' ? 'You' : (assistantName || 'Companion')}
                      </div>
                      <div className={`text-sm font-['Nanum_Myeongjo'] prose prose-sm max-w-none ${
                        msg.role === 'user' ? 'prose-invert' : ''
                      }`}>
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {loading && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="flex justify-start"
                  >
                    <div className="bg-gray-100 text-gray-900 rounded-2xl px-4 py-3 max-w-xs lg:max-w-md">
                      <div className="text-xs opacity-70 mb-2 font-['Nanum_Myeongjo']">
                        {assistantName || 'Companion'}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm font-['Nanum_Myeongjo']">Thinking...</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Input Area */}
            <div className="border-t pt-4">
              <div className="flex space-x-3">
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none font-['Nanum_Myeongjo'] text-gray-900 placeholder-gray-500"
                    rows={1}
                    disabled={loading}
                    style={{ minHeight: '48px', maxHeight: '200px' }}
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={loading || !input.trim()}
                  className="px-4 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
              
              {error && (
                <div className="mt-3 flex items-center justify-between text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <span className="font-['Nanum_Myeongjo']">{error}</span>
                  <button
                    onClick={onReset}
                    className="text-red-500 hover:text-red-700 underline text-xs font-['Nanum_Myeongjo']"
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
} 