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
  sale: 'Sotildi', rejected: 'Rad etildi', followup: 'Davom kerak', noAnswer: "Javob yo'q",
}
const outcomeColor: Record<string, string> = {
  sale: 'text-green-400 bg-green-500/10 border-green-500/20',
  rejected: 'text-red-400 bg-red-500/10 border-red-500/20',
  followup: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  noAnswer: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
}

export default function UploadPageClient({ managers }: Props) {
  const [inputMode, setInputMode] = useState<'audio' | 'text'>('audio')
  const [file, setFile] = useState<File | null>(null)
  const [transcriptText, setTranscriptText] = useState('')
  const [selectedManagerId, setSelectedManagerId] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [dragging, setDragging] = useState(false)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'analyzing' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<CallResult | null>(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const isLoading = status === 'uploading' || status === 'analyzing'
  const canSubmitAudio = !!file && !!selectedManagerId && !isLoading && status !== 'done'
  const canSubmitText = transcriptText.trim().length > 20 && !!selectedManagerId && !isLoading && status !== 'done'

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

  const handleSubmitAudio = async () => {
    if (!file || !selectedManagerId) return
    setError('')
    setStatus('uploading')
    try {
      const formData = new FormData()
      formData.append('audio', file)
      formData.append('managerId', selectedManagerId)
      if (clientPhone.trim()) formData.append('clientPhone', clientPhone.trim())

      setStatus('analyzing')
      const response = await fetch('/api/analyze', { method: 'POST', body: formData })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Xatolik yuz berdi')
      setResult(data.call)
      setStatus('done')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Xatolik yuz berdi')
      setStatus('error')
    }
  }

  const handleSubmitText = async () => {
    if (!transcriptText.trim() || !selectedManagerId) return
    setError('')
    setStatus('analyzing')
    try {
      const formData = new FormData()
      formData.append('transcript', transcriptText.trim())
      formData.append('managerId', selectedManagerId)
      if (clientPhone.trim()) formData.append('clientPhone', clientPhone.trim())

      const response = await fetch('/api/analyze', { method: 'POST', body: formData })
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
    setTranscriptText('')
    setSelectedManagerId('')
    setClientPhone('')
    setStatus('idle')
    setResult(null)
    setError('')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-up">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-text-muted">
        <Link href="/calls" className="hover:text-text-secondary transition-colors">Audio Fayllar</Link>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        <span className="text-text-secondary">Tahlil qilish</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Qo&apos;ng&apos;iroqni tahlil qilish</h1>
        <p className="text-sm text-text-muted mt-1">Audio fayl yoki suhbat matnini AI tahlil qilsin</p>
      </div>

      {/* Mode toggle */}
      {status !== 'done' && (
        <div className="flex rounded-xl bg-bg-elevated p-1 gap-1 w-full max-w-sm">
          <button
            onClick={() => { setInputMode('audio'); setError('') }}
            className={`flex-1 text-sm py-2 px-4 rounded-lg font-semibold transition-all ${inputMode === 'audio' ? 'bg-brand-orange text-white shadow-md' : 'text-text-muted hover:text-text-secondary'}`}
          >
            <span className="flex items-center justify-center gap-2">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"/>
              </svg>
              Audio yuklash
            </span>
          </button>
          <button
            onClick={() => { setInputMode('text'); setError('') }}
            className={`flex-1 text-sm py-2 px-4 rounded-lg font-semibold transition-all ${inputMode === 'text' ? 'bg-brand-orange text-white shadow-md' : 'text-text-muted hover:text-text-secondary'}`}
          >
            <span className="flex items-center justify-center gap-2">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              Matn kiritish
            </span>
          </button>
        </div>
      )}

      {/* ── Audio mode ── */}
      {inputMode === 'audio' && status !== 'done' && (
        <div
          className={`relative rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
            dragging ? 'border-brand-orange bg-brand-orange/5'
            : 'border-bg-border hover:border-brand-orange/50 bg-bg-card'
          } ${isLoading ? 'pointer-events-none opacity-70' : ''}`}
          style={{ minHeight: 200 }}
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
          <div className="flex flex-col items-center justify-center p-10 text-center">
            {isLoading ? (
              <>
                <div className="w-14 h-14 rounded-full bg-brand-orange/10 flex items-center justify-center mb-4">
                  <div className="w-7 h-7 border-2 border-brand-orange border-t-transparent rounded-full animate-spin" />
                </div>
                <div className="text-sm font-medium text-brand-orange">
                  {status === 'uploading' ? 'Fayl yuklanmoqda...' : 'Replix AI tahlil qilmoqda...'}
                </div>
                {file && <div className="text-xs text-text-muted mt-2">{file.name}</div>}
              </>
            ) : file ? (
              <>
                <div className="w-14 h-14 rounded-full bg-brand-orange/10 flex items-center justify-center mb-4">
                  <svg className="text-brand-orange" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
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
                <div className="text-sm font-semibold text-text-primary mb-1">Audio faylni shu yerga tashlang</div>
                <div className="text-xs text-text-muted">yoki bosib tanlang</div>
                <div className="text-xs text-text-muted/60 mt-2">MP3, WAV, OGG, M4A, WEBM, FLAC</div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Done state */}
      {status === 'done' && result && (
        <div className="rounded-2xl border border-green-500/30 bg-green-500/5 p-8 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center mb-4">
            <svg className="text-green-400" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="text-base font-semibold text-green-400 mb-1">Tahlil yakunlandi!</div>
          {inputMode === 'audio' && file && (
            <div className="text-sm text-text-muted mb-4">{file.name}</div>
          )}
          {inputMode === 'audio' && result.id && (
            <audio controls preload="metadata" className="w-full max-w-md mt-2" src={`/api/calls/${result.id}/audio`}>
              Brauzer audioni qo&apos;llab-quvvatlamaydi
            </audio>
          )}
        </div>
      )}

      {/* ── Text mode ── */}
      {inputMode === 'text' && status !== 'done' && (
        <div className="card p-5 space-y-3">
          <div>
            <div className="text-sm font-semibold text-text-primary mb-0.5">Suhbat matni</div>
            <div className="text-xs text-text-muted">Qo&apos;ng&apos;iroq transkripsiyasini yoki suhbat mazmunini kiriting. Whisper kerak emas.</div>
          </div>
          <textarea
            value={transcriptText}
            onChange={e => setTranscriptText(e.target.value)}
            placeholder="Menejer: Salom, Replix kompaniyasidan qo'ng'iroq qilayapman...&#10;Mijoz: Ha, salom...&#10;&#10;Yoki suhbat mazmunini o'zingiz yozing..."
            disabled={isLoading}
            rows={12}
            className="input-field w-full text-sm font-mono leading-relaxed resize-y disabled:opacity-50"
            style={{ minHeight: 220 }}
          />
          <div className={`text-xs ${transcriptText.trim().length < 20 ? 'text-text-dim' : 'text-text-muted'}`}>
            {transcriptText.trim().length} belgi {transcriptText.trim().length < 20 && '(kamida 20 belgi kerak)'}
          </div>
          {isLoading && (
            <div className="flex items-center gap-3 py-3">
              <div className="w-5 h-5 border-2 border-brand-orange border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <span className="text-sm text-brand-orange">Replix AI tahlil qilmoqda...</span>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Manager / phone fields */}
      {status !== 'done' && (
        <div className="card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-text-secondary flex items-center gap-2">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-brand-orange">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Menejer va mijoz ma&apos;lumotlari
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div>
              <label className="text-xs text-text-muted mb-1.5 block uppercase tracking-wider">
                Mijoz telefon (ixtiyoriy)
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

      {/* Results after analysis */}
      {status === 'done' && result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="card p-4 text-center">
              <div className="text-2xl font-bold text-brand-orange">{result.rating?.toFixed(1) ?? '—'}</div>
              <div className="text-xs text-text-muted mt-1">Baho (5 dan)</div>
              <div className="flex justify-center gap-0.5 mt-2">
                {[1,2,3,4,5].map(i => (
                  <span key={i} className={`text-sm ${i <= Math.round(result.rating || 0) ? 'text-brand-orange' : 'text-bg-elevated'}`}>★</span>
                ))}
              </div>
            </div>
            <div className="card p-4 text-center">
              <div className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${outcomeColor[result.callOutcome || ''] || 'text-text-muted bg-bg-elevated border-bg-border'}`}>
                {outcomeLabel[result.callOutcome || ''] || "Noma'lum"}
              </div>
              <div className="text-xs text-text-muted mt-2">Natija</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-sm font-medium text-text-primary capitalize">{result.clientSentiment || '—'}</div>
              <div className="text-xs text-text-muted mt-1">Mijoz kayfiyati</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-sm font-medium text-text-primary truncate">{result.managerName}</div>
              <div className="text-xs text-text-muted mt-1">Menejer</div>
            </div>
          </div>

          {result.summary && (
            <div className="card p-4">
              <div className="text-xs font-semibold text-brand-orange uppercase tracking-widest mb-2">Umumiy xulosa</div>
              <p className="text-sm text-text-secondary leading-relaxed">{result.summary}</p>
            </div>
          )}

          {result.recommendations && result.recommendations.length > 0 && (
            <div className="card p-4">
              <div className="text-xs font-semibold text-brand-orange uppercase tracking-widest mb-3">Keyingi qadamlar</div>
              <ol className="space-y-3">
                {result.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-bg-elevated flex items-center justify-center text-xs font-bold text-text-primary">{i + 1}</span>
                    <div>
                      <p className="text-sm text-red-400 mb-1">{rec.problem}</p>
                      <div className="border-l-2 border-green-500/30 pl-3">
                        <p className="text-sm text-text-muted leading-relaxed">{rec.betterApproach}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {(result.problems.length > 0 || result.positives.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {result.problems.length > 0 && (
                <div className="card p-4">
                  <div className="text-xs font-semibold text-red-400 uppercase tracking-widest mb-2">Aniqlangan xatoliklar</div>
                  <ul className="space-y-1.5">
                    {result.problems.map((p, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-text-muted">
                        <span className="text-red-400 mt-0.5 flex-shrink-0">⚠</span>{p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.positives.length > 0 && (
                <div className="card p-4">
                  <div className="text-xs font-semibold text-green-400 uppercase tracking-widest mb-2">Ijobiy tomonlar</div>
                  <ul className="space-y-1.5">
                    {result.positives.map((p, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-text-muted">
                        <span className="text-green-400 mt-0.5 flex-shrink-0">✓</span>{p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {result.improvement && (
            <div className="card p-4 border-yellow-500/20 bg-yellow-500/5">
              <div className="text-xs font-semibold text-yellow-400 uppercase tracking-widest mb-2">Yakuniy maslahat</div>
              <p className="text-sm text-text-secondary leading-relaxed">{result.improvement}</p>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3 pb-8">
        {status === 'done' ? (
          <>
            <button onClick={handleReset} className="px-5 py-2.5 bg-bg-elevated hover:bg-bg-border text-text-secondary text-sm font-medium rounded-xl transition-colors">
              Yangi tahlil
            </button>
            <Link href="/calls" className="flex-1 sm:flex-none px-5 py-2.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 text-sm font-semibold rounded-xl transition-colors text-center">
              Ro&apos;yxatga qaytish
            </Link>
            <Link href={`/calls/${result?.id}`} className="flex-1 sm:flex-none px-5 py-2.5 bg-brand-orange hover:bg-[#FF5520] text-white text-sm font-semibold rounded-xl transition-colors text-center">
              Batafsil ko&apos;rish →
            </Link>
          </>
        ) : (
          <>
            <Link href="/calls" className="px-5 py-2.5 bg-bg-elevated hover:bg-bg-border text-text-secondary text-sm font-medium rounded-xl transition-colors">
              Bekor qilish
            </Link>
            <button
              onClick={inputMode === 'audio' ? handleSubmitAudio : handleSubmitText}
              disabled={inputMode === 'audio' ? !canSubmitAudio : !canSubmitText}
              className="flex-1 py-2.5 bg-brand-orange hover:bg-[#FF5520] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  {status === 'uploading' ? 'Yuklanmoqda...' : 'Tahlil qilinmoqda...'}
                </>
              ) : (
                <>
                  {inputMode === 'audio' ? (
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                    </svg>
                  )}
                  {inputMode === 'audio' ? 'Yuklash va tahlil qilish' : 'Tahlil qilish'}
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
