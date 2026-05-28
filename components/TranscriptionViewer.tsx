'use client'
import { useState } from 'react'

interface Props {
  transcription: string | null
  audioUrl: string
  mimeType: string | null
}

export default function TranscriptionViewer({ transcription, audioUrl, mimeType }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#22c55e1a] hover:bg-[#22c55e30] text-[#22c55e] rounded-md border border-[#22c55e30] transition-colors"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        Transkripsiyani ko&apos;rish
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="bg-bg-card border border-bg-border rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-bg-border">
              <span className="font-semibold text-text-primary text-sm">Transkripsiya</span>
              <button
                onClick={() => setOpen(false)}
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="p-4 border-b border-bg-border">
              <audio
                controls
                preload="metadata"
                className="w-full"
                style={{ height: 36, filter: 'invert(0.85) sepia(0.2) saturate(5) hue-rotate(346deg)' }}
              >
                <source src={audioUrl} type={mimeType || 'audio/mpeg'} />
              </audio>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {transcription ? (
                <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap font-mono">
                  {transcription}
                </p>
              ) : (
                <p className="text-sm text-text-muted italic">Transkripsiya mavjud emas</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
