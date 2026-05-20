# 🤖 Replix AI — Sales Call Analytics Platform

> **Qara Manda Qurilish** do'koni uchun AI-powered savdo qo'ng'iroqlari tahlil platformasi.  
> *Created by **Abdulloh***

---

## ✨ Imkoniyatlar

- 🎙️ **Audio tahlili** — MP3, WAV, OGG, M4A formatlarni qabul qiladi
- 🗣️ **Uzbek transkripsiya** — OpenAI Whisper orqali ovozni matnga aylantiradi
- 🤖 **AI tahlil** — GPT-4o orqali o'zbekcha professional tahlil
- ⭐ **5 yulduzli baho** — har bir qo'ng'iroq 1-5 yulduz bilan baholanadi
- 📊 **Kunlik hisobotlar** — har bir manager bo'yicha AI hisoboti
- 👥 **Manager profillari** — har bir managerning statistikasi va tarixı
- 🔍 **Muammo tashxisi** — avtomatik muammolar aniqlash
- 💰 **Sotuv natijasi** — sotildi/davom etadi/rad etildi/noma'lum

---

## 🚀 O'rnatish

### 1. Repozitoriyani klonlash
```bash
git clone https://github.com/abdullohbohodirov96/Replix-Ai.git
cd Replix-Ai
```

### 2. Paketlarni o'rnatish
```bash
npm install
```

### 3. Muhit o'zgaruvchilarini sozlash
```bash
cp .env.example .env
```

`.env` faylni oching va `OPENAI_API_KEY` ni kiriting:
```env
DATABASE_URL="file:./dev.db"
OPENAI_API_KEY="sk-proj-sizning-kalitingiz"
```

### 4. Ma'lumotlar bazasini sozlash
```bash
npm run db:push    # Jadvallarni yaratish
npm run db:seed    # Namuna managerlarni qo'shish (ixtiyoriy)
```

### 5. Ishga tushirish
```bash
npm run dev
```

Brauzerda oching: **http://localhost:3000**

---

## 📖 Foydalanish

### Manager qo'shish
1. **Managerlar** sahifasiga o'ting
2. **"Manager Qo'shish"** tugmasini bosing
3. Ism, telefon, email kiriting

### Qo'ng'iroq tahlili
1. Manager profiliga o'ting yoki **Qo'ng'iroqlar** sahifasiga
2. **"Audio Yuklash"** tugmasini bosing
3. Audio faylni tanlang (MP3, WAV, M4A)
4. **"Replix AI tahlil qilsin"** bosing
5. AI avtomatik ravishda:
   - Ovozni o'zbekchaga aylantiradi
   - Suhbatni tahlil qiladi
   - 1-5 yulduz baho beradi
   - Muammolarni aniqlaydi
   - Xulosa yozadi

### Hisobotlar
1. **Hisobotlar** sahifasiga o'ting
2. **"AI Hisobot Yaratish"** tugmasini bosing
3. Barcha managerlar uchun kunlik hisobot tayyorlanadi

---

## 🛠️ Texnik Stack

| Texnologiya | Maqsad |
|-------------|--------|
| **Next.js 14** | SSR framework, App Router |
| **OpenAI Whisper** | Audio → Matn (o'zbekcha) |
| **OpenAI GPT-4o** | Suhbat tahlili, baho berish |
| **Prisma** | ORM, ma'lumotlar bazasi |
| **SQLite** | Ma'lumotlar bazasi (production'da PostgreSQL) |
| **Tailwind CSS** | Stilizatsiya |
| **TypeScript** | Type safety |

---

## 📁 Loyiha Tuzilishi

```
replix-ai/
├── app/
│   ├── page.tsx              # Dashboard (SSR)
│   ├── managers/
│   │   ├── page.tsx          # Managerlar ro'yxati (SSR)
│   │   └── [id]/page.tsx     # Manager detail (SSR)
│   ├── calls/page.tsx        # Qo'ng'iroqlar (SSR)
│   ├── reports/page.tsx      # Hisobotlar (SSR)
│   └── api/
│       ├── analyze/route.ts  # 🎯 Asosiy AI endpoint
│       ├── managers/route.ts # Managerlar CRUD
│       ├── calls/route.ts    # Qo'ng'iroqlar
│       └── reports/route.ts  # Hisobotlar
├── components/
│   ├── Sidebar.tsx           # Nav
│   ├── UploadCallModal.tsx   # Audio yuklash modali
│   ├── AddManagerModal.tsx   # Manager qo'shish
│   └── GenerateReportButton.tsx
├── lib/
│   ├── prisma.ts             # DB client
│   └── openai.ts             # Whisper + GPT-4o
└── prisma/
    └── schema.prisma         # DB sxema
```

---

## 🌐 Vercel Deploy

```bash
# Vercel CLI orqali
npm install -g vercel
vercel

# Muhit o'zgaruvchilarni Vercel dashboard'da kiriting:
# OPENAI_API_KEY, DATABASE_URL
```

> **Muhim:** Production'da SQLite o'rniga **PostgreSQL** (Supabase/Neon) ishlating!

---

## 👤 Muallif

**Abdulloh** — Replix AI yaratuvchisi  
Qara Manda Qurilish | Marketing bo'limi

---

*Replix AI v1.0.0 — Barcha huquqlar himoyalangan*
