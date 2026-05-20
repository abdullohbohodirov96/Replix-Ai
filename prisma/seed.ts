import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create sample managers
  const managers = await Promise.all([
    prisma.manager.upsert({
      where: { id: 'mgr_001' },
      update: {},
      create: {
        id: 'mgr_001',
        name: 'Jasur Toshmatov',
        phone: '+998901234567',
        email: 'jasur@quaramanda.uz',
        position: 'Senior Sales Manager',
      },
    }),
    prisma.manager.upsert({
      where: { id: 'mgr_002' },
      update: {},
      create: {
        id: 'mgr_002',
        name: 'Malika Yusupova',
        phone: '+998901234568',
        email: 'malika@quaramanda.uz',
        position: 'Sales Manager',
      },
    }),
    prisma.manager.upsert({
      where: { id: 'mgr_003' },
      update: {},
      create: {
        id: 'mgr_003',
        name: 'Bobur Karimov',
        phone: '+998901234569',
        email: 'bobur@quaramanda.uz',
        position: 'Junior Sales Manager',
      },
    }),
  ])

  console.log(`✅ Created ${managers.length} managers`)
  console.log('✅ Seed complete!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
