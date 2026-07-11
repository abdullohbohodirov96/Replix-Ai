import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { transcribeAudio, analyzeCallTranscription } from '@/lib/openai'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const existingCall = await prisma.call.findUnique({
      where: { id: params.id },
      include: { manager: true },
    })
    if (!existingCall) {
      return NextResponse.json({ error: "Qo'ng'iroq topilmadi" }, { status: 404 })
    }

    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null
    if (!audioFile) {
      return NextResponse.json({ error: 'Audio fayl yuborilmadi' }, { status: 400 })
    }

    const arrayBuffer = await audioFile.arrayBuffer()
    const audioBuffer = Buffer.from(arrayBuffer)

    // Transcribe new audio
    const transcription = await transcribeAudio(audioFile)

    // Re-analyze
    const analysis = await analyzeCallTranscription(
      transcription,
      existingCall.manager.name
    )

    // Update call record
    const updatedCall = await prisma.call.update({
      where: { id: params.id },
      data: {
        audioFileName: audioFile.name,
        audioPath: '', // Removed local filesystem dependency
        audioData: audioBuffer,
        audioMimeType: audioFile.type || 'audio/mpeg',
        transcription,
        analysis: analysis.analysis,
        rating: analysis.rating,
        problems: JSON.stringify(analysis.problems),
        positives: JSON.stringify(analysis.positives),
        recommendations: JSON.stringify(analysis.recommendations),
        improvement: analysis.improvement,
        clientSentiment: analysis.clientSentiment,
        callOutcome: analysis.callOutcome,
        summary: analysis.summary,
      },
    })

    return NextResponse.json({
      id: updatedCall.id,
      managerId: updatedCall.managerId,
      managerName: existingCall.manager.name,
      audioFileName: updatedCall.audioFileName,
      transcription: updatedCall.transcription,
      analysis: updatedCall.analysis,
      rating: updatedCall.rating,
      problems: analysis.problems,
      positives: analysis.positives,
      recommendations: analysis.recommendations,
      improvement: updatedCall.improvement,
      clientSentiment: updatedCall.clientSentiment,
      callOutcome: updatedCall.callOutcome,
      summary: updatedCall.summary,
      createdAt: updatedCall.createdAt,
    })
  } catch (error) {
    console.error('PATCH call error:', error)
    return NextResponse.json({ error: 'Qayta yuklashda xatolik' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const call = await prisma.call.findUnique({ where: { id: params.id } })
    if (!call) {
      return NextResponse.json({ error: 'Qo\'ng\'iroq topilmadi' }, { status: 404 })
    }

    await prisma.call.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'O\'chirishda xatolik' }, { status: 500 })
  }
}
