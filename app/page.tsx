'use client'

import { useState } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

const FEATURES = [
  {
    icon: '🎙️',
    title: 'AI Audio Tahlil',
    desc: 'Qo\'ng\'iroq yozuvlarini Whisper AI matnga aylantiradi va GPT chuqur tahlil qiladi.',
  },
  {
    icon: '⭐',
    title: '5 Yulduzli Baho',
    desc: 'Har bir qo\'ng\'iroq professionallik darajasi bo\'yicha avtomatik baholanadi.',
  },
  {
    icon: '💡',
    title: 'Aniq Tavsiyalar',
    desc: 'Har bir xato uchun "manager nima deyishi kerak edi" — aniq skript bilan.',
  },
  {
    icon: '📊',
    title: 'Hisobot & Statistika',
    desc: 'Managerlar reytingi, muammolar tahlili va kunlik AI hisobotlar.',
  },
  {
    icon: '🤖',
    title: 'AI Yordamchi',
    desc: 'Savollaringizga javob beruvchi chatbot va admin bilan tezkor aloqa.',
  },
  {
    icon: '👥',
    title: 'Ko\'p Akkaunt',
    desc: 'Admin va managerlar uchun alohida rollar — CRM tizimi kabi boshqaruv.',
  },
]

const HELP_STEPS = [
  { n: '01', t: 'Tizimga kiring', d: 'Admin sizga bergan email va parol bilan kiring.' },
  { n: '02', t: 'Manager qo\'shing', d: 'Savdo managerlaringizni tizimga kiriting.' },
  { n: '03', t: 'Audio yuklang', d: 'Qo\'ng\'iroq yozuvini yuklang — AI avtomatik tahlil qiladi.' },
  { n: '04', t: 'Natijani ko\'ring', d: 'Baho, muammolar va aniq tavsiyalarni o\'qing.' },
]

export default function LandingPage() {
  const router = useRouter()
  const { status } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await signIn('credentials', { email, password, redirect: false })
    if (res?.error) {
      setError('Email yoki parol noto\'g\'ri')
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-[#070710] text-[#E8E8F5] overflow-x-hidden">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-[#FF6B35]/10 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 w-[400px] h-[400px] rounded-full bg-[#FF3D00]/8 blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.15]"
          style={{ backgroundImage: 'linear-gradient(#1E1E35 1px, transparent 1px), linear-gradient(90deg, #1E1E35 1px, transparent 1px)', backgroundSize: '64px 64px' }} />
      </div>

      {/* Nav */}
      <nav className="relative z-20 max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6B35] to-[#FF3D00] flex items-center justify-center shadow-lg shadow-orange-500/30">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div className="font-display font-800 text-lg text-white tracking-tight leading-none">Dunyabunya</div>
            <div className="text-[10px] font-mono text-[#FF6B35] uppercase tracking-widest mt-0.5">Replix AI</div>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-1">
          <a href="#features" className="px-4 py-2 text-sm font-mono text-[#9494B8] hover:text-white transition-colors">Imkoniyatlar</a>
          <a href="#yordam" className="px-4 py-2 text-sm font-mono text-[#9494B8] hover:text-white transition-colors">Yordam</a>
          <a href="#boglanish" className="px-4 py-2 text-sm font-mono text-[#9494B8] hover:text-white transition-colors">Bog'lanish</a>
          <a href="#kirish" className="ml-2 px-4 py-2 text-sm font-display font-600 text-white bg-[#FF6B35] hover:bg-[#FF5520] rounded-lg transition-colors">Kirish</a>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-12 pb-20 grid lg:grid-cols-2 gap-12 items-center">
        {/* Left — pitch */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FF6B35]/10 border border-[#FF6B35]/20 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35] animate-pulse" />
            <span className="text-xs font-mono text-[#FF6B35] uppercase tracking-wider">Sun'iy intellekt bilan savdo tahlili</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-800 text-white leading-[1.05] tracking-tight">
            Savdo qo'ng'iroqlaringizni{' '}
            <span className="bg-gradient-to-r from-[#FF6B35] to-[#FF9D6E] bg-clip-text text-transparent">AI tahlil qiladi</span>
          </h1>
          <p className="mt-6 text-base md:text-lg font-mono text-[#9494B8] leading-relaxed max-w-xl">
            Replix AI — managerlaringizning har bir qo'ng'irog'ini tinglaydi, baholaydi va
            aniq maslahat beradi: <span className="text-[#E8E8F5]">qayerda xato qildi va nima deyishi kerak edi.</span>
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#kirish" className="px-6 py-3 bg-[#FF6B35] hover:bg-[#FF5520] text-white font-display font-600 rounded-xl transition-colors shadow-lg shadow-orange-500/20">
              Tizimga kirish →
            </a>
            <a href="#features" className="px-6 py-3 bg-[#111122] border border-[#1E1E35] hover:border-[#FF6B35]/30 text-[#E8E8F5] font-display font-600 rounded-xl transition-colors">
              Imkoniyatlar
            </a>
          </div>
          <div className="mt-10 flex items-center gap-8">
            {[
              { v: 'Whisper AI', l: 'Ovoz tanish' },
              { v: 'GPT tahlil', l: 'Chuqur baho' },
              { v: 'O\'zbekcha', l: 'To\'liq qo\'llab-quvvatlash' },
            ].map(s => (
              <div key={s.l}>
                <div className="text-sm font-display font-700 text-white">{s.v}</div>
                <div className="text-xs font-mono text-[#5555AA] mt-0.5">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — login panel */}
        <div id="kirish" className="lg:justify-self-end w-full max-w-md scroll-mt-24">
          <div className="relative">
            <div className="absolute -inset-0.5 bg-gradient-to-br from-[#FF6B35]/40 to-transparent rounded-2xl blur opacity-60" />
            <div className="relative bg-[#0D0D1A]/95 backdrop-blur-xl border border-[#1E1E35] rounded-2xl p-8 shadow-2xl">
              {status === 'authenticated' ? (
                <div className="text-center py-4">
                  <div className="w-14 h-14 rounded-full bg-[#FF6B35]/10 border border-[#FF6B35]/20 flex items-center justify-center mx-auto mb-4">
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#FF6B35" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-display font-700 text-white mb-1">Tizimga kirilgan</h2>
                  <p className="text-xs font-mono text-[#5555AA] mb-6">Siz allaqachon tizimga kirgansiz</p>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="w-full py-3 bg-[#FF6B35] hover:bg-[#FF5520] text-white font-display font-600 rounded-lg transition-colors shadow-lg shadow-orange-500/20"
                  >
                    Dashboard ga o'tish →
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2.5 mb-1">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#FF6B35] to-[#FF3D00] flex items-center justify-center">
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h6a3 3 0 013 3v1" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-display font-700 text-white">Tizimga kirish</h2>
                  </div>
                  <p className="text-xs font-mono text-[#5555AA] mb-6">Akkauntingiz bilan davom eting</p>

                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label className="text-xs font-mono text-[#9494B8] uppercase tracking-wider mb-1.5 block">Email</label>
                      <input
                        type="email" value={email} onChange={e => setEmail(e.target.value)}
                        placeholder="admin@dunyabunya.uz" required disabled={loading}
                        className="w-full bg-[#111122] border border-[#1E1E35] focus:border-[#FF6B35] text-[#E8E8F5] font-mono text-sm rounded-lg px-4 py-3 focus:outline-none transition-colors disabled:opacity-50 placeholder-[#333360]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-mono text-[#9494B8] uppercase tracking-wider mb-1.5 block">Parol</label>
                      <input
                        type="password" value={password} onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••" required disabled={loading}
                        className="w-full bg-[#111122] border border-[#1E1E35] focus:border-[#FF6B35] text-[#E8E8F5] font-mono text-sm rounded-lg px-4 py-3 focus:outline-none transition-colors disabled:opacity-50 placeholder-[#333360]"
                      />
                    </div>
                    {error && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5">
                        <p className="text-sm font-mono text-red-400">{error}</p>
                      </div>
                    )}
                    <button
                      type="submit" disabled={loading || !email || !password}
                      className="w-full py-3 bg-[#FF6B35] hover:bg-[#FF5520] disabled:opacity-40 disabled:cursor-not-allowed text-white font-display font-600 rounded-lg transition-colors shadow-lg shadow-orange-500/20"
                    >
                      {loading ? 'Kirilmoqda...' : 'Kirish'}
                    </button>
                  </form>
                  <p className="mt-5 text-center text-[11px] font-mono text-[#333360]">
                    Akkauntingiz yo'qmi? Administrator bilan bog'laning
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 py-20 scroll-mt-20">
        <div className="text-center mb-14">
          <div className="text-xs font-mono text-[#FF6B35] uppercase tracking-widest mb-3">Imkoniyatlar</div>
          <h2 className="text-3xl md:text-4xl font-display font-800 text-white">Replix AI nimalar qila oladi?</h2>
          <p className="mt-3 font-mono text-sm text-[#9494B8] max-w-2xl mx-auto">
            Savdo jamoangizning samaradorligini oshirish uchun kerakli barcha vositalar
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(f => (
            <div key={f.title} className="group bg-[#0D0D1A] border border-[#1E1E35] hover:border-[#FF6B35]/30 rounded-2xl p-6 transition-all hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-[#FF6B35]/10 border border-[#FF6B35]/20 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                {f.icon}
              </div>
              <h3 className="font-display font-700 text-white text-lg mb-2">{f.title}</h3>
              <p className="font-mono text-xs text-[#9494B8] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Yordam */}
      <section id="yordam" className="relative z-10 max-w-7xl mx-auto px-6 py-20 scroll-mt-20">
        <div className="bg-gradient-to-br from-[#0D0D1A] to-[#0D0D1A]/50 border border-[#1E1E35] rounded-3xl p-8 md:p-12">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="text-xs font-mono text-[#FF6B35] uppercase tracking-widest mb-3">Yordam</div>
              <h2 className="text-3xl md:text-4xl font-display font-800 text-white leading-tight">
                Qanday ishlaydi?
              </h2>
              <p className="mt-4 font-mono text-sm text-[#9494B8] leading-relaxed">
                Replix AI bilan ishlash juda oddiy. 4 ta qadamda savdo qo'ng'iroqlaringizni
                professional darajada tahlil qiling.
              </p>
              <a href="#kirish" className="mt-6 inline-block px-5 py-2.5 bg-[#FF6B35] hover:bg-[#FF5520] text-white font-display font-600 rounded-lg transition-colors">
                Hozir boshlash →
              </a>
            </div>
            <div className="space-y-3">
              {HELP_STEPS.map(s => (
                <div key={s.n} className="flex items-start gap-4 bg-[#111122] border border-[#1E1E35] rounded-xl p-4">
                  <div className="text-xl font-display font-800 text-[#FF6B35]/40 shrink-0">{s.n}</div>
                  <div>
                    <div className="font-display font-600 text-white text-sm">{s.t}</div>
                    <div className="font-mono text-xs text-[#9494B8] mt-0.5">{s.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Bog'lanish */}
      <section id="boglanish" className="relative z-10 max-w-7xl mx-auto px-6 py-20 scroll-mt-20">
        <div className="text-center mb-12">
          <div className="text-xs font-mono text-[#FF6B35] uppercase tracking-widest mb-3">Bog'lanish</div>
          <h2 className="text-3xl md:text-4xl font-display font-800 text-white">Biz bilan aloqa</h2>
          <p className="mt-3 font-mono text-sm text-[#9494B8]">Savollaringiz bormi? Biz yordam beramiz</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-5 max-w-3xl mx-auto">
          {[
            { icon: '📞', label: 'Telefon', value: '+998 50 099 97 33' },
            { icon: '✉️', label: 'Email', value: 'support@dunyabunya.uz' },
            { icon: '💬', label: 'Telegram', value: '@dunyabunya' },
          ].map(c => (
            <div key={c.label} className="bg-[#0D0D1A] border border-[#1E1E35] hover:border-[#FF6B35]/30 rounded-2xl p-6 text-center transition-colors">
              <div className="text-3xl mb-3">{c.icon}</div>
              <div className="text-xs font-mono text-[#5555AA] uppercase tracking-wider mb-1">{c.label}</div>
              <div className="font-display font-600 text-white text-sm">{c.value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#1E1E35] mt-10">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#FF6B35] to-[#FF3D00] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="font-display font-700 text-white text-sm">Dunyabunya × Replix AI</span>
          </div>
          <p className="font-mono text-xs text-[#333360]">© 2026 Dunyabunya savdo platformasi. Barcha huquqlar himoyalangan.</p>
        </div>
      </footer>
    </div>
  )
}
