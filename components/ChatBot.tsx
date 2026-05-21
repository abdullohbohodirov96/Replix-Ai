'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'

interface ChatMessage {
  id: string
  role: 'user' | 'ai' | 'admin'
  content: string
  createdAt: string
}

interface DBMessage {
  id: string
  userMsg: string
  aiMsg: string
  adminReply?: string | null
  wantsAdmin?: boolean
  createdAt: string
}

const SESSION_KEY = 'replix_chat_session'
const MESSAGES_KEY = 'replix_chat_messages'

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return ''
  let sid = localStorage.getItem(SESSION_KEY)
  if (!sid) {
    sid = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`
    localStorage.setItem(SESSION_KEY, sid)
  }
  return sid
}

function dbToChat(msgs: DBMessage[]): ChatMessage[] {
  const result: ChatMessage[] = []
  for (const m of msgs) {
    result.push({ id: `${m.id}_u`, role: 'user', content: m.userMsg, createdAt: m.createdAt })
    result.push({ id: `${m.id}_ai`, role: 'ai', content: m.aiMsg, createdAt: m.createdAt })
    if (m.adminReply) {
      result.push({ id: `${m.id}_adm`, role: 'admin', content: m.adminReply, createdAt: m.createdAt })
    }
  }
  return result
}

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const [adminConnecting, setAdminConnecting] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { data: session } = useSession()
  const userId = (session?.user as { id?: string } | undefined)?.id

  const loadFromDB = useCallback(async (uid: string) => {
    try {
      const res = await fetch(`/api/support?userId=${uid}`)
      if (res.ok) {
        const data: DBMessage[] = await res.json()
        setMessages(dbToChat(data))
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    const sid = getOrCreateSessionId()
    setSessionId(sid)
    if (userId) {
      loadFromDB(userId)
    } else {
      try {
        const raw = localStorage.getItem(MESSAGES_KEY)
        if (raw) setMessages(JSON.parse(raw))
      } catch { /* ignore */ }
    }
  }, [userId, loadFromDB])

  // Poll for admin replies every 15s when chat is open
  useEffect(() => {
    if (!isOpen || !userId) return
    const interval = setInterval(() => loadFromDB(userId), 15000)
    return () => clearInterval(interval)
  }, [isOpen, userId, loadFromDB])

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  const saveLocal = (msgs: ChatMessage[]) => {
    if (!userId) localStorage.setItem(MESSAGES_KEY, JSON.stringify(msgs.slice(-50)))
  }

  const sendMessage = async () => {
    const trimmed = input.trim()
    if (!trimmed || loading || !sessionId) return

    const userMsg: ChatMessage = { id: `user_${Date.now()}`, role: 'user', content: trimmed, createdAt: new Date().toISOString() }
    const newMsgs = [...messages, userMsg]
    setMessages(newMsgs)
    saveLocal(newMsgs)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, userId: userId || undefined, message: trimmed }),
      })
      const data = await res.json()
      if (res.ok) {
        const aiMsg: ChatMessage = { id: data.id + '_ai', role: 'ai', content: data.aiMsg, createdAt: data.createdAt }
        const updated = [...newMsgs, aiMsg]
        setMessages(updated)
        saveLocal(updated)
        if (!isOpen) setUnreadCount(c => c + 1)
      }
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  const connectAdmin = async () => {
    if (adminConnecting || !sessionId) return
    setAdminConnecting(true)
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, userId: userId || undefined, wantsAdmin: true }),
      })
      const data = await res.json()
      if (res.ok) {
        const connectMsg: ChatMessage = { id: `${Date.now()}_connect_u`, role: 'user', content: "Admin bilan bog'lanishni so'radim", createdAt: new Date().toISOString() }
        const aiMsg: ChatMessage = { id: data.id + '_ai', role: 'ai', content: data.aiMsg, createdAt: data.createdAt }
        setMessages(prev => [...prev, connectMsg, aiMsg])
      }
    } catch { /* ignore */ } finally {
      setAdminConnecting(false)
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#FF3D00] shadow-lg shadow-orange-500/30 flex items-center justify-center hover:scale-105 transition-transform"
        aria-label="Chat"
      >
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-mono flex items-center justify-center">
            {unreadCount}
          </span>
        )}
        {isOpen ? (
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>

      {/* Chat window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-[#0D0D1A] border border-[#1E1E35] rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ maxHeight: '70vh' }}>
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#1E1E35] bg-[#111122] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#FF3D00] flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <div className="text-sm font-display font-600 text-white">Replix AI</div>
                <div className="text-[10px] font-mono text-[#FF6B35]">● Onlayn</div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-[#5555AA] hover:text-white transition-colors">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {messages.length === 0 && (
              <div className="text-center py-6">
                <div className="text-3xl mb-2">🤖</div>
                <p className="text-xs font-mono text-[#5555AA]">Salom! Men Replix AI yordamchisiman.<br />Savol bering yoki admin bilan bog&apos;laning.</p>
              </div>
            )}
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role !== 'user' && (
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] mr-2 shrink-0 mt-0.5 ${msg.role === 'admin' ? 'bg-purple-500/20 border border-purple-500/30' : 'bg-[#FF6B35]/10 border border-[#FF6B35]/20'}`}>
                    {msg.role === 'admin' ? '👨‍💼' : '🤖'}
                  </div>
                )}
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm font-mono leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#FF6B35] text-white rounded-br-sm'
                    : msg.role === 'admin'
                    ? 'bg-purple-500/10 border border-purple-500/20 text-purple-200 rounded-bl-sm'
                    : 'bg-[#161628] border border-[#1E1E35] text-[#E8E8F5] rounded-bl-sm'
                }`}>
                  {msg.role === 'admin' && <div className="text-[10px] text-purple-400 mb-1 font-600">👨‍💼 Admin</div>}
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full bg-[#FF6B35]/10 border border-[#FF6B35]/20 flex items-center justify-center text-[10px] mr-2 shrink-0">🤖</div>
                <div className="bg-[#161628] border border-[#1E1E35] px-3 py-2 rounded-2xl rounded-bl-sm">
                  <div className="flex gap-1">
                    {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#FF6B35] animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Admin connect button */}
          <div className="px-4 py-2 border-t border-[#1E1E35] shrink-0">
            <button
              onClick={connectAdmin}
              disabled={adminConnecting}
              className="w-full py-2 text-xs font-mono text-[#9494B8] border border-[#1E1E35] hover:border-purple-500/30 hover:text-purple-300 hover:bg-purple-500/5 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {adminConnecting ? "Bog'lanilmoqda..." : "Admin bilan bog'lanish"}
            </button>
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-[#1E1E35] shrink-0">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                placeholder="Savol yozing..."
                disabled={loading}
                className="flex-1 bg-[#111122] border border-[#1E1E35] focus:border-[#FF6B35] text-[#E8E8F5] font-mono text-sm rounded-xl px-3 py-2 focus:outline-none transition-colors placeholder-[#333360] disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="w-9 h-9 bg-[#FF6B35] hover:bg-[#FF5520] disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-colors shrink-0"
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
