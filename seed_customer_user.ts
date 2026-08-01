// Create a customer user linked to an existing Party
import { PrismaClient } from '@prisma/client'
import { hashPassword } from './src/lib/auth/password'
const db = new PrismaClient()

async function main() {
  const tenantId = '01910000-0000-7000-8000-000000000001'
  const party = await db.party.findFirst({ where: { tenantId, partyType: 'person' } })
  if (!party) throw new Error('No person party found')

  const existing = await db.user.findFirst({ where: { tenantId, username: 'customer1' } })
  if (existing) {
    console.log('Customer user already exists:', existing.id, 'linked party:', (existing.metadata as any)?.partyId)
    return
  }

  const user = await db.user.create({
    data: {
      tenantId,
      username: 'customer1',
      displayName: 'مشتری تستی',
      email: 'customer1@bismark.example.com',
      passwordHash: hashPassword('demo1234'),
      userType: 'customer',
      status: 'active',
      isActive: true,
      locale: 'fa-IR',
      metadata: { partyId: party.id },
    },
  })
  console.log('Created customer user:', user.id, 'linked to party:', party.id, '(', party.displayName, ')')
}
main().then(() => db.$disconnect()).catch(e => { console.error(e); process.exit(1) })
