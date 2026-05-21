import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const call = await prisma.call.findUnique({
    where: { id: params.id },
    select: { audioData: true, audioMimeType: true, audioPath: true, audioFileName: true },
  })

  if (!call) {
    return NextResponse.json({ error: 'Topilmadi' }, { status: 404 })
  }

  let buffer: Buffer | null = null
  if (call.audioData) {
    buffer = Buffer.from(call.audioData)
  } else if (call.audioPath && existsSync(call.audioPath)) {
    buffer = await readFile(call.audioPath)
  }

  if (!buffer) {
    return NextResponse.json({ error: 'Audio mavjud emas' }, { status: 404 })
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': call.audioMimeType || 'audio/mpeg',
      'Content-Length': String(buffer.length),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
