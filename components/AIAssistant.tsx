'use client'
import { useState, useEffect } from 'react'

const tips = [
  "Tahlilni ko'rish uchun audio faylni yuklang",
  "Mezon bo'yicha baho berish uchun Sozlamalarga kiring",
  "Managerlar reytingini Dashboard da koring",
  "Lead sifatini Sozlamalar > Lead kategoriyalari da sozlang",
  "Integratsiyalarni Sozlamalar bo'limida ulang",
  'Telegram botga hisobotlarni avtomatik yuboring',
  "AI tahlil suhbat kategoriyasini o'zi aniqlaydi",
  "Kompaniya kontekstini Profil bo'limida kiriting",
]

export default function AIAssistant() {
  const [open, setOpen] = useState(false)
  const [tipIdx, setTipIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (!open) return
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setTipIdx(i => (i + 1) % tips.length)
        setVisible(true)
      }, 400)
    }, 4000)
    return () => clearInterval(interval)
  }, [open])

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="ai-assistant-panel">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 rounded-full bg-brand-orange flex items-center justify-center flex-shrink-0">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" fill="white"/>
              </svg>
            </div>
            <span className="text-xs font-semibold text-text-primary">Replix AI Yordam</span>
          </div>
          <p
            className="text-xs text-text-secondary leading-relaxed"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(4px)',
              transition: 'opacity 0.3s ease, transform 0.3s ease',
            }}
          >
            {tips[tipIdx]}
          </p>
        </div>
      )}
      <button
        onClick={() => setOpen(o => !o)}
        className="ai-assistant-btn"
        title="AI Yordam"
      >
        {open ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-4h2v2h-2zm0-10h2v8h-2z" fill="currentColor"/>
          </svg>
        )}
      </button>
    </div>
  )
}
