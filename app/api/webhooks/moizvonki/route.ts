import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseWebhookPayload, downloadCallAudio } from '@/lib/moizvonki'
import { getMoiZvonkiConfig, getGoogleSheetsConfig, getTelegramConfig } from '@/lib/integration-config'
import { transcribeAudio } from '@/lib/openai'
import { analyzeCallWithCriteria } from '@/lib/openai'
import { findLeadByPhone, updateLeadAnalysis } from '@/lib/google-sheets'
import { sendTelegramMessage, formatCallAnalysisMessage } from '@/lib/telegram'
import fs from 'fs'
import path from 'path'
import os from 'os'

export async function POST(req: NextRequest) {
  let logId: string | null = null

  try {
    const body = await req.json()

    const log = await prisma.webhookLog.create({
      data: {
        source: 'moizvonki',
        payload: JSON.stringify(body),
        status: 'received',
      },
    })
    logId = log.id

    const payload = parseWebhookPayload(body)

    // Faqat tugallangan qo'ng'iroqlarni qayta ishlash
    if (!['end', 'finish', 'completed', 'call.end'].includes(payload.event)) {
      await prisma.webhookLog.update({
        where: { id: logId },
        data: { status: 'skipped', errorMsg: `Event: ${payload.event} — skipped` },
      })
      return NextResponse.json({ ok: true, message: 'Skipped' })
    }

    // Agar audio bo'lmasa
    if (!payload.record_url) {
      await prisma.webhookLog.update({
        where: { id: logId },
        data: { status: 'no_audio' },
      })
      return NextResponse.json({ ok: true, message: 'No audio' })
    }

    // Takroriy webhook tekshirish
    if (payload.call_id) {
      const existing = await prisma.call.findUnique({
        where: { moiZvonkiCallId: payload.call_id },
      })
      if (existing) {
        return NextResponse.json({ ok: true, message: 'Already processed' })
      }
    }

    const mzConfig = await getMoiZvonkiConfig()
    if (!mzConfig) {
      return NextResponse.json({ ok: false, message: 'Moi Zvonki config not found' }, { status: 400 })
    }

    // Managerni telefon raqami bo'yicha topish
    let manager = null
    if (payload.manager_id || payload.manager_name) {
      manager = await prisma.manager.findFirst({
        where: payload.manager_name
          ? { name: { contains: payload.manager_name, mode: 'insensitive' } }
          : {},
      })
    }
    if (!manager) {
      manager = await prisma.manager.findFirst()
    }
    if (!manager) {
      await prisma.webhookLog.update({
        where: { id: logId },
        data: { status: 'failed', errorMsg: 'Manager topilmadi' },
      })
      return NextResponse.json({ ok: false, message: 'Manager not found' }, { status: 400 })
    }

    // Google Sheets dan lead topish
    const sheetsConfig = await getGoogleSheetsConfig()
    let leadData: { rowIndex: number; data: string[] } | null = null
    let leadRecord = null

    if (sheetsConfig) {
      leadData = await findLeadByPhone(sheetsConfig, payload.phone)
    }

    // DB da lead topish yoki yaratish
    leadRecord = await prisma.lead.findFirst({
      where: { phone: { contains: payload.phone.slice(-9) } },
    })

    if (!leadRecord) {
      leadRecord = await prisma.lead.create({
        data: {
          phone: payload.phone,
          name: leadData?.data[0] || undefined,
          source: 'moizvonki',
          status: 'bog\'lanildi',
          managerId: manager.id,
          sheetRowIndex: leadData?.rowIndex,
          sheetId: sheetsConfig?.spreadsheetId,
          comment: leadData?.data[6] || undefined,
        },
      })
    }

    // Audio yuklab olish
    const audioBuffer = await downloadCallAudio(mzConfig, payload.record_url)
    const tempFile = path.join(os.tmpdir(), `mz_${payload.call_id || Date.now()}.mp3`)
    fs.writeFileSync(tempFile, audioBuffer)

    // Transkripsiya
    const transcription = await transcribeAudio(tempFile)

    // Mezonlarni DB dan olish
    const callType = payload.direction === 'in' ? 'kiruvchi' : 'chiquvchi'
    const criteriaList = await prisma.analysisCriteria.findMany({
      where: { callType, isActive: true },
      orderBy: { sortOrder: 'asc' },
    })

    // Lead scoring criteria
    const leadCriteriaRaw = await prisma.leadScoringCriteria.findMany({
      where: { isActive: true },
    })
    const leadScoringMap: { hot: string[]; warm: string[]; cold: string[] } = {
      hot: [],
      warm: [],
      cold: [],
    }
    for (const lc of leadCriteriaRaw) {
      try {
        const arr = JSON.parse(lc.criteria)
        if (lc.leadType === 'hot') leadScoringMap.hot = arr
        if (lc.leadType === 'warm') leadScoringMap.warm = arr
        if (lc.leadType === 'cold') leadScoringMap.cold = arr
      } catch {}
    }

    let analysis
    if (criteriaList.length > 0) {
      analysis = await analyzeCallWithCriteria(
        transcription,
        manager.name,
        callType,
        criteriaList.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          maxScore: c.maxScore,
          weight: c.weight,
        })),
        leadScoringMap
      )
    } else {
      const { analyzeCallTranscription } = await import('@/lib/openai')
      const base = await analyzeCallTranscription(transcription, manager.name)
      analysis = {
        ...base,
        criteriaScores: {},
        totalCriteriaScore: base.rating * 2,
        leadScore: 'warm' as const,
      }
    }

    // Uploads papkasiga saqlab qo'yish
    const uploadsDir = path.join(process.cwd(), 'uploads')
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
    const fileName = `mz_${payload.call_id || Date.now()}.mp3`
    const finalPath = path.join(uploadsDir, fileName)
    fs.copyFileSync(tempFile, finalPath)
    fs.unlinkSync(tempFile)

    // Call yaratish
    const call = await prisma.call.create({
      data: {
        managerId: manager.id,
        leadId: leadRecord.id,
        callType,
        clientPhone: payload.phone,
        moiZvonkiCallId: payload.call_id || null,
        audioFileName: fileName,
        audioPath: finalPath,
        duration: payload.duration || 0,
        transcription,
        summary: analysis.summary,
        analysis: analysis.analysis,
        rating: analysis.rating / 2, // 10 dan 5 ga
        problems: JSON.stringify(analysis.problems),
        positives: JSON.stringify(analysis.positives),
        recommendations: JSON.stringify(analysis.recommendations),
        improvement: analysis.improvement,
        clientSentiment: analysis.clientSentiment,
        callOutcome: analysis.callOutcome,
        criteriaScores: JSON.stringify(analysis.criteriaScores),
        leadScoreResult: analysis.leadScore,
        callDate: payload.start_time ? new Date(payload.start_time) : new Date(),
      },
    })

    // Lead ni yangilash
    await prisma.lead.update({
      where: { id: leadRecord.id },
      data: {
        status: 'bog\'lanildi',
        aiAnalysis: analysis.summary,
        aiRating: analysis.rating,
        leadScore: analysis.leadScore,
        lastCallDate: new Date(),
        callCount: { increment: 1 },
      },
    })

    // Google Sheets yangilash
    let sheetUpdated = false
    if (sheetsConfig && leadData) {
      try {
        await updateLeadAnalysis(sheetsConfig, leadData.rowIndex, {
          status: 'bog\'lanildi',
          aiAnalysis: `${analysis.summary} | Baho: ${analysis.rating}/10`,
          aiRating: analysis.rating,
          leadScore: analysis.leadScore,
          callType,
          lastCallDate: new Date().toLocaleDateString('uz-UZ'),
          manager: manager.name,
        })
        sheetUpdated = true
      } catch (e) {
        console.error('Sheets update error:', e)
      }
    }

    // Telegram yuborish
    const tgConfig = await getTelegramConfig()
    if (tgConfig) {
      try {
        const msg = formatCallAnalysisMessage({
          managerName: manager.name,
          clientPhone: payload.phone,
          callType,
          duration: payload.duration || 0,
          rating: analysis.rating,
          leadScore: analysis.leadScore,
          summary: analysis.summary,
          problems: analysis.problems,
          positives: analysis.positives,
          aiAnalysis: analysis.analysis,
          sheetUpdated,
        })
        await sendTelegramMessage(tgConfig, msg)
        await prisma.call.update({ where: { id: call.id }, data: { tgNotified: true } })
        await prisma.telegramReport.create({
          data: {
            type: 'call_analysis',
            chatId: tgConfig.adminChatId,
            message: msg,
            metadata: JSON.stringify({ callId: call.id, leadId: leadRecord.id }),
          },
        })
      } catch (e) {
        console.error('Telegram error:', e)
      }
    }

    await prisma.webhookLog.update({
      where: { id: logId },
      data: {
        status: 'processed',
        callId: call.id,
        leadId: leadRecord.id,
      },
    })

    return NextResponse.json({ ok: true, callId: call.id, leadId: leadRecord.id })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    if (logId) {
      await prisma.webhookLog.update({
        where: { id: logId },
        data: { status: 'failed', errorMsg: errMsg },
      }).catch(() => {})
    }
    console.error('Webhook error:', error)
    return NextResponse.json({ ok: false, error: errMsg }, { status: 500 })
  }
}

// Moi Zvonki ba'zan GET bilan tekshiradi
export async function GET() {
  return NextResponse.json({ ok: true, service: 'Replix AI Webhook', version: '1.0' })
}
