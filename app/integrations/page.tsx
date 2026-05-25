import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import IntegrationCard from '@/components/IntegrationCard'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const INTEGRATIONS_META = [
  {
    name: 'telegram',
    label: 'Telegram',
    desc: 'Call tahlillarini va hisobotlarni Telegram guruhingizga avtomatik yuborish',
    color: '#229ED9',
    fields: [
      { key: 'bot_token', label: 'Bot Token', placeholder: '123456:ABCdefGHI...', secret: true },
      { key: 'chat_id', label: 'Chat ID', placeholder: '-100123456789', secret: false },
    ],
  },
  {
    name: 'amocrm',
    label: 'AmoCRM',
    desc: 'Qo\'ng\'iroq natijalarini AmoCRM ga avtomatik yuklash va liderlar yaratish',
    color: '#FF5100',
    fields: [
      { key: 'base_url', label: 'Domain (masalan: yourcompany.amocrm.ru)', placeholder: 'yourcompany.amocrm.ru', secret: false },
      { key: 'client_id', label: 'Client ID', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', secret: false },
      { key: 'client_secret', label: 'Client Secret', placeholder: 'Client Secret', secret: true },
      { key: 'access_token', label: 'Access Token', placeholder: 'Access Token', secret: true },
      { key: 'refresh_token', label: 'Refresh Token', placeholder: 'Refresh Token', secret: true },
    ],
  },
  {
    name: 'bitrix24',
    label: 'Bitrix24',
    desc: 'Bitrix24 CRM ga qo\'ng\'iroqlar, kontaktlar va bitimlarni avtomatik qo\'shish',
    color: '#E1593D',
    fields: [
      { key: 'webhook_url', label: 'Webhook URL', placeholder: 'https://yourcompany.bitrix24.ru/rest/1/xxxxx/', secret: true },
    ],
  },
  {
    name: 'google_sheets',
    label: 'Google Sheets',
    desc: 'Qo\'ng\'iroq statistikasini Google Sheets jadvaliga real vaqtda eksport qilish',
    color: '#0F9D58',
    fields: [
      { key: 'client_email', label: 'Service Account Email', placeholder: 'xxx@project.iam.gserviceaccount.com', secret: false },
      { key: 'private_key', label: 'Private Key', placeholder: '-----BEGIN PRIVATE KEY-----...', secret: true },
      { key: 'spreadsheet_id', label: 'Spreadsheet ID', placeholder: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms', secret: false },
    ],
  },
  {
    name: 'instagram',
    label: 'Instagram',
    desc: 'Kunlik natijalar va statistikani Instagram biznes akkauntingizga ulash',
    color: '#C13584',
    fields: [
      { key: 'access_token', label: 'Access Token', placeholder: 'Instagram Graph API token', secret: true },
      { key: 'page_id', label: 'Facebook Page ID', placeholder: 'Page ID', secret: false },
      { key: 'instagram_account_id', label: 'Instagram Account ID', placeholder: 'IG Account ID', secret: false },
    ],
  },
]

export default async function IntegrationsPage() {
  const session = await getServerSession(authOptions)
  const sessionUser = session?.user as { role?: string } | undefined
  if (!session || sessionUser?.role !== 'admin') redirect('/dashboard')

  const stored = await prisma.integration.findMany()
  const storedMap: Record<string, { enabled: boolean; lastSync: Date | null; config: unknown }> = {}
  for (const item of stored) storedMap[item.name] = { enabled: item.enabled, lastSync: item.lastSync, config: item.config }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Integratsiyalar</h1>
        <p className="text-sm font-mono text-[#9494B8] mt-1">
          Tashqi xizmatlar bilan ulaning — CRM, messenjerlar va hisobot tizimlari
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {INTEGRATIONS_META.map((meta) => {
          const state = storedMap[meta.name]
          return (
            <IntegrationCard
              key={meta.name}
              name={meta.name}
              label={meta.label}
              description={meta.desc}
              color={meta.color}
              fields={meta.fields}
              enabled={state?.enabled ?? false}
              lastSync={state?.lastSync?.toISOString() ?? null}
            />
          )
        })}
      </div>

      <div className="rounded-xl border border-[#1E1E35] bg-[#0D0D1A] p-4">
        <p className="text-xs font-mono text-[#5555AA]">
          * Barcha tokenlar va maxfiy kalitlar shifrlangan holda saqlanadi. 
          Integratsiyani yoqish uchun avval konfiguratsiyani saqlang, keyin testdan o'tkazing.
        </p>
      </div>
    </div>
  )
}
