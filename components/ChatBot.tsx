'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  content: string
  createdAt: string
}

const SESSION_KEY = 'replix_chat_session'
const MESSAGES_KEY = 'replix_chat_messages'

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return ''
  let sessionId = localStorage.getItem(SESSION_KEY)
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`
    localStorage.setItem(SESSION_KEY, sessionId)
  }
  return sessionId
}

function loadLocalMessages(): ChatMessage[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(MESSAGES_KEY)
    return raw ? (JSON.parse(raw) as ChatMessage[]) : []
  } catch {
    return []
  }
}

function saveLocalMessages(messages: ChatMessage[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages.slice(-50)))
}

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const sid = getOrCreateSessionId()
    setSessionId(sid)
    const local = loadLocalMessages()
    setMessages(local)
  }, [])

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const sendMessage = async () => {
    const trimmed = input.trim()
    if (!trimmed || loading || !sessionId) return

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    }

    const updatedWithUser = [...messages, userMsg]
    setMessages(updatedWithUser)
    saveLocalMessages(updatedWithUser)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: trimmed }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Xatolik')

      const aiMsg: ChatMessage = {
        id: data.id || `ai_${Date.now()}`,
        role: 'ai',
        content: data.aiMsg,
        createdAt: data.createdAt || new Date().toISOString(),
      }

      const updatedWithAi = [...updatedWithUser, aiMsg]
      setMessages(updatedWithAi)
      saveLocalMessages(updatedWithAi)

      if (!isOpen) {
        setUnreadCount(prev => prev + 1)
      }
    } catch {
      const errMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'ai',
        content: 'Uzr, hozir javob berishda xatolik yuz berdi. Qayta urinib ko\'ring.',
        createdAt: new Date().toISOString(),
      }
      const updatedWithErr = [...updatedWithUser, errMsg]
      setMessages(updatedWithErr)
      saveLocalMessages(updatedWithErr)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    setMessages([])
    localStorage.removeItem(MESSAGES_KEY)
    const newSid = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`
    localStorage.setItem(SESSION_KEY, newSid)
    setSessionId(newSid)
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#FF6B35] hover:bg-[#FF5520] shadow-lg shadow-orange-500/30 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
        title="Yordam kerakmi?"
        aria-label="Yordam chat"
      >
        {isOpen ? (
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
        {!isOpen && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-mono text-white font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Chat window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 flex flex-col bg-[#0D0D1A] border border-[#1E1E35] rounded-2xl shadow-2xl overflow-hidden"
          style={{ maxHeight: '70vh' }}>

          {/* Header */}
          <div className="px-4 py-3.5 border-b border-[#1E1E35] flex items-center justify-between bg-[#111122]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6B35] to-[#FF3D00] flex items-center justify-center">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-display font-600 text-white">Replix AI Yordam</div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[10px] font-mono text-[#5555AA]">Onlayn</span>
                </div>
              </div>
            </div>
            <button
              onClick={clearChat}
              className="text-[#333360] hover:text-[#9494B8] transition-colors"
              title="Chatni tozalash"
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: '200px', maxHeight: '400px' }}>
            {messages.length === 0 && (
              <div className="text-center py-8">
                <div className="text-3xl mb-2">👋</div>
                <p className="text-sm font-display font-500 text-white mb-1">Salom! Men Replix AI yordamchiman</p>
                <p className="text-xs font-mono text-[#5555AA]">
                  Platform haqida savollaringizni bering
                </p>
                <div className="mt-4 space-y-2">
                  {[
                    'Manager qanday qo\'shiladi?',
                    'Audio qanday yuklanadi?',
                    'Hisobotlar qayerda?',
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => setInput(q)}
                      className="w-full text-left px-3 py-2 bg-[#111122] border border-[#1E1E35] rounded-lg text-xs font-mono text-[#9494B8] hover:border-[#FF6B35]/30 hover:text-[#E8E8F5] transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-xs font-mono leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#FF6B35] text-white rounded-br-sm'
                      : 'bg-[#111122] border border-[#1E1E35] text-[#9494B8] rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="px-3.5 py-2.5 bg-[#111122] border border-[#1E1E35] rounded-2xl rounded-bl-sm">
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-[#FF6B35] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-[#FF6B35] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-[#FF6B35] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-[#1E1E35] flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Xabar yozing..."
              disabled={loading}
              className="flex-1 bg-[#111122] border border-[#1E1E35] text-[#E8E8F5] text-xs font-mono rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#FF6B35]/50 transition-colors placeholder:text-[#333360] disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="w-9 h-9 flex items-center justify-center bg-[#FF6B35] hover:bg-[#FF5520] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex-shrink-0"
              aria-label="Yuborish"
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
