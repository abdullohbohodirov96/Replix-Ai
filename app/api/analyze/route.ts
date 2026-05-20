import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { transcribeAudio, analyzeCallTranscription } from '@/lib/openai'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

export const dynamic = 'force-dynamic'

// Ensure uploads directory exists
async function ensureUploadsDir() {
  const uploadsDir = path.join(process.cwd(), 'uploads')
  if (!existsSync(uploadsDir)) {
    await mkdir(uploadsDir, { recursive: true })
  }
  return uploadsDir
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('audio') as File | null
    const managerId = formData.get('managerId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'Audio fayl topilmadi' }, { status: 400 })
    }

    if (!managerId) {
      return NextResponse.json({ error: 'Manager tanlanmagan' }, { status: 400 })
    }

    // Verify manager exists
    const manager = await prisma.manager.findUnique({ where: { id: managerId } })
    if (!manager) {
      return NextResponse.json({ error: 'Manager topilmadi' }, { status: 404 })
    }

    // Validate file type
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/webm', 'audio/mp4']
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|m4a|webm|mp4|flac)$/i)) {
      return NextResponse.json(
        { error: 'Faqat audio fayllar qabul qilinadi (MP3, WAV, OGG, M4A)' },
        { status: 400 }
      )
    }

    // Save file to disk
    const uploadsDir = await ensureUploadsDir()
    const uniqueFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const filePath = path.join(uploadsDir, uniqueFileName)

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Step 1: Transcribe with Whisper
    let transcription = ''
    try {
      transcription = await transcribeAudio(filePath)
    } catch (err) {
      console.error('Transcription error:', err)
      // Save call even without transcription
    }

    // Step 2: Analyze with GPT-4
    let analysisResult = null
    if (transcription) {
      try {
        analysisResult = await analyzeCallTranscription(transcription, manager.name)
      } catch (err) {
        console.error('Analysis error:', err)
      }
    }

    // Step 3: Save to database
    const call = await prisma.call.create({
      data: {
        managerId,
        audioFileName: file.name,
        audioPath: filePath,
        transcription: transcription || null,
        analysis: analysisResult?.analysis || null,
        rating: analysisResult?.rating || null,
        problems: analysisResult ? JSON.stringify(analysisResult.problems) : null,
        positives: analysisResult ? JSON.stringify(analysisResult.positives) : null,
        clientSentiment: analysisResult?.clientSentiment || null,
        callOutcome: analysisResult?.callOutcome || null,
        summary: analysisResult?.summary || null,
      },
      include: { manager: true },
    })

    return NextResponse.json({
      success: true,
      call: {
        id: call.id,
        managerId: call.managerId,
        managerName: call.manager.name,
        audioFileName: call.audioFileName,
        transcription: call.transcription,
        analysis: call.analysis,
        rating: call.rating,
        problems: call.problems ? JSON.parse(call.problems) : [],
        positives: call.positives ? JSON.parse(call.positives) : [],
        clientSentiment: call.clientSentiment,
        callOutcome: call.callOutcome,
        summary: call.summary,
        createdAt: call.createdAt,
      },
    })
  } catch (error: unknown) {
    console.error('Analyze API error:', error)
    const message = error instanceof Error ? error.message : 'Ichki server xatoligi'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
