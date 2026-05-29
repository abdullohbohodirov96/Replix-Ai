'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'


interface Manager {
  id: string
  name: string
  position?: string | null
}

interface Recommendation {
  problem: string
  betterApproach: string
}

interface CallResult {
  id: string
  managerId: string
  managerName: string
  audioFileName: string
  transcription: string | null
  analysis: string | null
  rating: number | null
  problems: string[]
  positives: string[]
  recommendations: Recommendation[]
  improvement: string | null
  clientSentiment: string | null
  callOutcome: string | null
  summary: string | null
  createdAt: string
}

interface Props {
  managerId?: string
  managerName?: string
  managers?: Manager[]
  existingCallId?: string
}

export default function UploadCallModal({ managerId, managerName, managers, existingCallId }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [selectedManagerId, setSelectedManagerId] = useState(managerId || '')
  const [dragging, setDragging] = useState(false)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'transcribing' | 'analyzing' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<CallResult | null>(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const currentManagerId = managerId || selectedManagerId
  const canSubmit = file && currentManagerId && status === 'idle'

  const reset = () => {
    setFile(null)
    setSelectedManagerId(managerId || '')
    setStatus('idle')
    setResult(null)
    setError('')
    setDragging(false)
  }

  const handleClose = () => {
    if (status === 'done') router.refresh()
    setIsOpen(false)
    reset()
  }

  const handleFileChange = (f: File | null) => {
    if (!f) return
    const allowed = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/webm', 'audio/mp4']
    if (!allowed.includes(f.type) && !f.name.match(/\.(mp3|wav|ogg|m4a|webm|mp4|flac)$/i)) {
      setError('Faqat audio fayllar: MP3, WAV, OGG, M4A')
      return
    }
    setFile(f)
    setError('')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    handleFileChange(f || null)
  }

  const handleSubmit = async () => {
    if (!file || !currentManagerId) return
    setError('')

    try {
      setStatus('uploading')

      const formData = new FormData()
      formData.append('audio', file)
      formData.append('managerId', currentManagerId)

      setStatus('transcribing')

      let response: Response
      if (existingCallId) {
        response = await fetch(`/api/calls/${existingCallId}`, {
          method: 'PATCH',
          body: formData,
        })
      } else {
        response = await fetch('/api/analyze', {
          method: 'POST',
          body: formData,
        })
      }

      setStatus('analyzing')

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Xatolik yuz berdi')
      }

      setResult(existingCallId ? data : data.call)
      setStatus('done')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Xatolik yuz berdi')
      setStatus('error')
    }
  }

  const statusMessages = {
    uploading:    '📤 Fayl yuklanmoqda...',
    transcribing: '🎙️ Ovoz matnga aylantirilmoqda (Whisper AI)...',
    analyzing:    '🤖 Replix AI tahlil qilmoqda...',
    done:         '✅ Tahlil yakunlandi!',
    error:        '❌ Xatolik yuz berdi',
    idle:         '',
  }

  const isLoading = ['uploading', 'transcribing', 'analyzing'].includes(status)

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <>
      {existingCallId ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 text-xs font-mono rounded-lg transition-colors"
          title="Audio qayta yuklash"
        >
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Qayta yuklash
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#FF6B35] hover:bg-[#FF5520] text-white text-sm font-display font-600 rounded-lg transition-colors shadow-lg shadow-orange-500/20"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Audio Yuklash
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />
          <div className="relative w-full max-w-lg bg-[#0D0D1A] border border-[#1E1E35] rounded-2xl shadow-2xl animate-slide-up">
            {/* Header */}
            <div className="px-6 py-5 border-b border-[#1E1E35] flex items-center justify-between">
              <div>
                <h2 className="font-display font-700 text-white text-lg">
                  {existingCallId ? 'Audio Qayta Yuklash' : "Audio Qo'ng'iroq Tahlili"}
                </h2>
                <p className="text-xs font-mono text-[#5555AA] mt-0.5">
                  {existingCallId
                    ? 'Yangi audio yuklang — eski o\'chib qayta tahlil qilinadi'
                    : managerName ? `Manager: ${managerName}` : 'Manager tanlang va audio yuklang'}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#5555AA] hover:text-white hover:bg-[#161628] transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Manager select (if not pre-selected) */}
              {!managerId && managers && managers.length > 0 && (
                <div>
                  <label className="text-xs font-mono text-[#9494B8] mb-1.5 block uppercase tracking-wider">
                    Manager *
                  </label>
                  <select
                    value={selectedManagerId}
                    onChange={e => setSelectedManagerId(e.target.value)}
                    disabled={isLoading}
                    className="w-full bg-[#111122] border border-[#1E1E35] text-[#E8E8F5] text-sm font-mono rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#FF6B35] transition-colors disabled:opacity-50"
                  >
                    <option value="">Manager tanlang...</option>
                    {managers.map(m => (
                      <option key={m.id} value={m.id}>{m.name} — {m.position}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Drop zone */}
              {status !== 'done' && (
                <div>
                  <label className="text-xs font-mono text-[#9494B8] mb-1.5 block uppercase tracking-wider">
                    Audio Fayl *
                  </label>
                  <div
                    className={`upload-zone rounded-xl p-8 text-center cursor-pointer transition-all ${dragging ? 'dragover' : ''} ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
                    onDragOver={e => { e.preventDefault(); setDragging(true) }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/*,.mp3,.wav,.ogg,.m4a,.webm,.flac"
                      className="hidden"
                      onChange={e => handleFileChange(e.target.files?.[0] || null)}
                    />
                    {file ? (
                      <div>
                        <div className="text-3xl mb-2">🎵</div>
                        <div className="text-sm font-display font-500 text-white">{file.name}</div>
                        <div className="text-xs font-mono text-[#5555AA] mt-1">{formatFileSize(file.size)}</div>
                        <div className="text-xs font-mono text-[#FF6B35] mt-2">Boshqasini tanlash uchun bosing</div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-4xl mb-3">🎙️</div>
                        <div className="text-sm font-display font-500 text-white mb-1">
                          Audio faylni shu yerga tashlang
                        </div>
                        <div className="text-xs font-mono text-[#5555AA]">
                          yoki bosib tanlang
                        </div>
                        <div className="text-xs font-mono text-[#333360] mt-2">
                          MP3, WAV, OGG, M4A, WEBM
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Status indicator */}
              {status !== 'idle' && (
                <div className={`rounded-lg px-4 py-3 border ${
                  status === 'done' ? 'bg-green-500/10 border-green-500/20' :
                  status === 'error' ? 'bg-red-500/10 border-red-500/20' :
                  'bg-[#FF6B35]/10 border-[#FF6B35]/20'
                }`}>
                  <div className="flex items-center gap-2">
                    {isLoading && (
                      <div className="w-4 h-4 border-2 border-[#FF6B35] border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    )}
                    <span className={`text-sm font-mono ${
                      status === 'done' ? 'text-green-400' :
                      status === 'error' ? 'text-red-400' :
                      'text-[#FF6B35]'
                    }`}>
                      {statusMessages[status]}
                    </span>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                  <p className="text-sm font-mono text-red-400">{error}</p>
                </div>
              )}

              {/* Results */}
              {status === 'done' && result && (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {/* Audio player */}
                  <div className="bg-[#111122] border border-[#1E1E35] rounded-lg p-3">
                    <div className="text-[10px] font-mono text-[#FF6B35] uppercase tracking-widest mb-2">🎧 Audio yozuv</div>
                    <audio controls preload="none" className="w-full h-9" src={`/api/calls/${result.id}/audio`}>
                      Brauzer audioni qo&apos;llab-quvvatlamaydi
                    </audio>
                  </div>

                  {/* Rating */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-[#9494B8]">Baho:</span>
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map(i => (
                        <span key={i} className={`text-lg ${i <= Math.round(result.rating || 0) ? 'text-[#FF6B35]' : 'text-[#1E1E35]'}`}>★</span>
                      ))}
                      <span className="ml-1 text-sm font-mono text-[#FF6B35] font-500">{result.rating?.toFixed(1)}/5.0</span>
                    </div>
                  </div>

                  {/* Summary */}
                  {result.summary && (
                    <div className="bg-[#111122] border border-[#1E1E35] rounded-lg p-3">
                      <div className="text-[10px] font-mono text-[#FF6B35] uppercase tracking-widest mb-1">Xulosa</div>
                      <p className="text-xs font-mono text-[#9494B8]">{result.summary}</p>
                    </div>
                  )}

                  {/* Recommendations */}
                  {result.recommendations && result.recommendations.length > 0 && (
                    <div className="bg-[#FF6B35]/5 border border-[#FF6B35]/20 rounded-lg p-3">
                      <div className="text-[10px] font-mono text-[#FF6B35] uppercase tracking-widest mb-2">💡 Tavsiyalar</div>
                      <div className="space-y-2">
                        {result.recommendations.map((rec, i) => (
                          <div key={i} className="bg-[#0D0D1A] border border-[#1E1E35] rounded-lg p-2.5">
                            <div className="flex items-start gap-1.5 mb-1.5">
                              <span className="text-red-400 text-xs">✗</span>
                              <p className="text-xs font-mono text-[#E8E8F5] flex-1">{rec.problem}</p>
                            </div>
                            <div className="flex items-start gap-1.5 border-l-2 border-green-500/30 pl-2 ml-1">
                              <span className="text-green-400 text-xs">✓</span>
                              <p className="text-xs font-mono text-[#9494B8] flex-1 leading-relaxed">{rec.betterApproach}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Problems */}
                  {result.problems.length > 0 && (
                    <div>
                      <div className="text-[10px] font-mono text-red-400 uppercase tracking-widest mb-1">Muammolar</div>
                      {result.problems.map((p, i) => (
                        <div key={i} className="text-xs font-mono text-[#9494B8] flex items-start gap-1.5 mb-1">
                          <span className="text-red-400">⚠</span>{p}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Improvement */}
                  {result.improvement && (
                    <div className="bg-[#111122] border border-[#1E1E35] rounded-lg p-3">
                      <div className="text-[10px] font-mono text-yellow-400 uppercase tracking-widest mb-1">📌 Yakuniy maslahat</div>
                      <p className="text-xs font-mono text-[#9494B8] leading-relaxed">{result.improvement}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-1">
                {status === 'done' ? (
                  <button
                    onClick={handleClose}
                    className="flex-1 py-2.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 text-sm font-display font-600 rounded-lg transition-colors"
                  >
                    ✓ Yopish va yangilash
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleClose}
                      className="px-4 py-2.5 bg-[#161628] hover:bg-[#1E1E35] text-[#9494B8] text-sm font-display rounded-lg transition-colors"
                    >
                      Bekor
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={!canSubmit}
                      className="flex-1 py-2.5 bg-[#FF6B35] hover:bg-[#FF5520] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-display font-600 rounded-lg transition-colors"
                    >
                      {isLoading ? 'Tahlil qilinmoqda...' : '🤖 Replix AI tahlil qilsin'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
