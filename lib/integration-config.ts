import { prisma } from './prisma'
import type { MoiZvonkiConfig } from './moizvonki'
import type { GoogleSheetsConfig } from './google-sheets'
import type { TelegramConfig } from './telegram'

export async function getMoiZvonkiConfig(): Promise<MoiZvonkiConfig | null> {
  const integration = await prisma.integration.findUnique({
    where: { type: 'moizvonki' },
  })
  if (!integration || !integration.isActive) return null
  return JSON.parse(integration.config)
}

export async function getGoogleSheetsConfig(): Promise<GoogleSheetsConfig | null> {
  const integration = await prisma.integration.findUnique({
    where: { type: 'google_sheets' },
  })
  if (!integration || !integration.isActive) return null
  return JSON.parse(integration.config)
}

export async function getTelegramConfig(): Promise<TelegramConfig | null> {
  const integration = await prisma.integration.findUnique({
    where: { type: 'telegram' },
  })
  if (!integration || !integration.isActive) return null
  return JSON.parse(integration.config)
}

export async function saveIntegrationConfig(
  type: string,
  config: Record<string, unknown>
) {
  return prisma.integration.upsert({
    where: { type },
    create: { type, config: JSON.stringify(config), isActive: true },
    update: { config: JSON.stringify(config), isActive: true },
  })
}
