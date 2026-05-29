'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
  managers: Manager[]
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const outcomeLabel: Record<string, string> = {
  sale: 'Sotildi',
  rejected: 'Rad etildi',
  followup: 'Davom kerak',
  noAnswer: 'Javob yo\'q',
}

const outcomeColor: Record<string, string> = {
  sale: 'text-green-400 bg-green-500/10 border-green-500/20',
  rejected: 'text-red-400 bg-red-500/10 border-red-500/20',
  followup: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  noAnswer: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
}

export default function UploadPageClient({ managers }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [selectedManagerId, setSelectedManagerId] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [dragging, setDragging] = useState(false)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'transcribing' | 'analyzing' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<CallResult | null>(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const isLoading = ['uploading', 'transcribing', 'analyzing'].includes(status)
  const canSubmit = !!file && !!selectedManagerId && !isLoading && status !== 'done'

  const handleFileChange = (f: File | null) => {
    if (!f) return
    const allowed = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/webm', 'audio/mp4']
    if (!allowed.includes(f.type) && !f.name.match(/\.(mp3|wav|ogg|m4a|webm|mp4|flac)$/i)) {
      setError('Faqat audio fayllar: MP3, WAV, OGG, M4A, WEBM, FLAC')
      return
    }
    setFile(f)
    setError('')
    setResult(null)
    setStatus('idle')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    handleFileChange(e.dataTransfer.files[0] || null)
  }

  const handleSubmit = async () => {
    if (!file || !selectedManagerId) return
    setError('')

    try {
      setStatus('uploading')
      const formData = new FormData()
      formData.append('audio', file)
      formData.append('managerId', selectedManagerId)
      if (clientPhone.trim()) formData.append('clientPhone', clientPhone.trim())

      setStatus('transcribing')
      const response = await fetch('/api/analyze', { method: 'POST', body: formData })
      setStatus('analyzing')
      const data = await response.json()

      if (!response.ok) throw new Error(data.error || 'Xatolik yuz berdi')

      setResult(data.call)
      setStatus('done')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Xatolik yuz berdi')
      setStatus('error')
    }
  }

  const handleReset = () => {
    setFile(null)
    setSelectedManagerId('')
    setClientPhone('')
    setStatus('idle')
    setResult(null)
    setError('')
  }

  const statusMessages: Record<string, string> = {
    uploading: 'Fayl yuklanmoqda...',
    transcribing: 'Ovoz matnga aylantirilmoqda (Whisper AI)...',
    analyzing: 'Replix AI tahlil qilmoqda...',
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-up">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-text-muted">
        <Link href="/calls" className="hover:text-text-secondary transition-colors">Audio Fayllar</Link>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        <span className="text-text-secondary">Audio fayllarni yuklash</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Audio fayllarni yuklash</h1>
        <p className="text-sm text-text-muted mt-1">Audio faylni yuklang va AI tahlil qilsin</p>
      </div>

      {/* Drop Zone */}
      <div
        className={`relative rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
          dragging
            ? 'border-brand-orange bg-brand-orange/5'
            : status === 'done'
            ? 'border-green-500/40 bg-green-500/5'
            : 'border-bg-border hover:border-brand-orange/50 bg-bg-card'
        } ${isLoading ? 'pointer-events-none opacity-70' : ''}`}
        style={{ minHeight: 200 }}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => status !== 'done' && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.ogg,.m4a,.webm,.flac"
          className="hidden"
          onChange={e => handleFileChange(e.target.files?.[0] || null)}
        />

        <div className="flex flex-col items-center justify-center p-10 text-center">
          {status === 'done' && result ? (
            <>
              <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center mb-4">
                <svg className="text-green-400" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="text-base font-semibold text-green-400 mb-1">Tahlil yakunlandi!</div>
              <div className="text-sm text-text-muted mb-4">{file?.name}</div>
              <audio
                controls
                preload="metadata"
                className="w-full max-w-md"
                src={`/api/calls/${result.id}/audio`}
              >
                Brauzer audioni qo&apos;llab-quvvatlamaydi
              </audio>
            </>
          ) : isLoading ? (
            <>
              <div className="w-14 h-14 rounded-full bg-brand-orange/10 flex items-center justify-center mb-4">
                <div className="w-7 h-7 border-2 border-brand-orange border-t-transparent rounded-full animate-spin" />
              </div>
              <div className="text-sm font-medium text-brand-orange">{statusMessages[status]}</div>
              {file && <div className="text-xs text-text-muted mt-2">{file.name}</div>}
            </>
          ) : file ? (
            <>
              <div className="w-14 h-14 rounded-full bg-brand-orange/10 flex items-center justify-center mb-4">
                <svg className="text-brand-orange" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                </svg>
              </div>
              <div className="text-sm font-semibold text-text-primary">{file.name}</div>
              <div className="text-xs text-text-muted mt-1">{formatFileSize(file.size)}</div>
              <div className="text-xs text-brand-orange mt-3">Boshqa fayl tanlash uchun bosing</div>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full bg-bg-elevated flex items-center justify-center mb-4">
                <svg className="text-text-muted" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <div className="text-sm font-semibold text-text-primary mb-1">
                Audio faylni shu yerga tashlang
              </div>
              <div className="text-xs text-text-muted">yoki bosib tanlang</div>
              <div className="text-xs text-text-muted/60 mt-2">MP3, WAV, OGG, M4A, WEBM, FLAC</div>
            </>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Manager assignment section */}
      {status !== 'done' && (
        <div className="card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-text-secondary flex items-center gap-2">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-brand-orange">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Menejer va mijoz ma&apos;lumotlari
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Manager dropdown */}
            <div>
              <label className="text-xs text-text-muted mb-1.5 block uppercase tracking-wider">
                Menejer <span className="text-brand-orange">*</span>
              </label>
              <select
                value={selectedManagerId}
                onChange={e => setSelectedManagerId(e.target.value)}
                disabled={isLoading}
                className="input-field w-full text-sm disabled:opacity-50"
              >
                <option value="">Menejer tanlang...</option>
                {managers.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name}{m.position ? ` — ${m.position}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Client phone */}
            <div>
              <label className="text-xs text-text-muted mb-1.5 block uppercase tracking-wider">
                Mijoz telefon raqami (ixtiyoriy)
              </label>
              <input
                type="tel"
                value={clientPhone}
                onChange={e => setClientPhone(e.target.value)}
                placeholder="+998 90 123 45 67"
                disabled={isLoading}
                className="input-field w-full text-sm disabled:opacity-50"
              />
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {status === 'done' && result && (
        <div className="space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Rating */}
            <div className="card p-4 text-center">
              <div className="text-2xl font-bold text-brand-orange">{result.rating?.toFixed(1) ?? '—'}</div>
              <div className="text-xs text-text-muted mt-1">Baho (5 dan)</div>
              <div className="flex justify-center gap-0.5 mt-2">
                {[1,2,3,4,5].map(i => (
                  <span key={i} className={`text-sm ${i <= Math.round(result.rating || 0) ? 'text-brand-orange' : 'text-bg-elevated'}`}>★</span>
                ))}
              </div>
            </div>

            {/* Outcome */}
            <div className="card p-4 text-center">
              <div className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${outcomeColor[result.callOutcome || ''] || 'text-text-muted bg-bg-elevated border-bg-border'}`}>
                {outcomeLabel[result.callOutcome || ''] || 'Noma\'lum'}
              </div>
              <div className="text-xs text-text-muted mt-2">Natija</div>
            </div>

            {/* Sentiment */}
            <div className="card p-4 text-center">
              <div className="text-sm font-medium text-text-primary capitalize">{result.clientSentiment || '—'}</div>
              <div className="text-xs text-text-muted mt-1">Mijoz kayfiyati</div>
            </div>

            {/* Manager */}
            <div className="card p-4 text-center">
              <div className="text-sm font-medium text-text-primary truncate">{result.managerName}</div>
              <div className="text-xs text-text-muted mt-1">Menejer</div>
            </div>
          </div>

          {/* Summary */}
          {result.summary && (
            <div className="card p-4">
              <div className="text-xs font-mono text-brand-orange uppercase tracking-widest mb-2">Xulosa</div>
              <p className="text-sm text-text-secondary leading-relaxed">{result.summary}</p>
            </div>
          )}

          {/* Recommendations */}
          {result.recommendations && result.recommendations.length > 0 && (
            <div className="card p-4">
              <div className="text-xs font-mono text-brand-orange uppercase tracking-widest mb-3">Tavsiyalar</div>
              <div className="space-y-3">
                {result.recommendations.map((rec, i) => (
                  <div key={i} className="bg-bg-elevated rounded-lg p-3">
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-red-400 text-xs mt-0.5">✗</span>
                      <p className="text-sm text-text-primary">{rec.problem}</p>
                    </div>
                    <div className="flex items-start gap-2 border-l-2 border-green-500/30 pl-3 ml-1">
                      <span className="text-green-400 text-xs mt-0.5">✓</span>
                      <p className="text-sm text-text-muted leading-relaxed">{rec.betterApproach}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Problems & Positives */}
          {(result.problems.length > 0 || result.positives.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {result.problems.length > 0 && (
                <div className="card p-4">
                  <div className="text-xs font-mono text-red-400 uppercase tracking-widest mb-2">Muammolar</div>
                  <ul className="space-y-1.5">
                    {result.problems.map((p, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-text-muted">
                        <span className="text-red-400 mt-0.5">⚠</span>{p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.positives.length > 0 && (
                <div className="card p-4">
                  <div className="text-xs font-mono text-green-400 uppercase tracking-widest mb-2">Ijobiy tomonlar</div>
                  <ul className="space-y-1.5">
                    {result.positives.map((p, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-text-muted">
                        <span className="text-green-400 mt-0.5">✓</span>{p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Improvement */}
          {result.improvement && (
            <div className="card p-4 border-yellow-500/20 bg-yellow-500/5">
              <div className="text-xs font-mono text-yellow-400 uppercase tracking-widest mb-2">Yakuniy maslahat</div>
              <p className="text-sm text-text-secondary leading-relaxed">{result.improvement}</p>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3 pb-8">
        {status === 'done' ? (
          <>
            <button
              onClick={handleReset}
              className="px-5 py-2.5 bg-bg-elevated hover:bg-bg-border text-text-secondary text-sm font-medium rounded-xl transition-colors"
            >
              Yangi yuklash
            </button>
            <Link
              href="/calls"
              className="flex-1 sm:flex-none px-5 py-2.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 text-sm font-semibold rounded-xl transition-colors text-center"
            >
              Ro&apos;yxatga qaytish
            </Link>
            <Link
              href={`/calls/${result?.id}`}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-brand-orange hover:bg-[#FF5520] text-white text-sm font-semibold rounded-xl transition-colors text-center"
            >
              Batafsil ko&apos;rish
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/calls"
              className="px-5 py-2.5 bg-bg-elevated hover:bg-bg-border text-text-secondary text-sm font-medium rounded-xl transition-colors"
            >
              Bekor qilish
            </Link>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex-1 py-2.5 bg-brand-orange hover:bg-[#FF5520] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  {statusMessages[status]}
                </>
              ) : (
                <>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Yuklash va tahlil qilish
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
