// Assign customer role to customer1 user
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

async function main() {
  const tenantId = '01910000-0000-7000-8000-000000000001'
  const user = await db.user.findFirst({ where: { tenantId, username: 'customer1' } })
  if (!user) throw new Error('customer1 user not found')

  // Find or create customer role
  let role = await db.role.findFirst({ where: { tenantId, key: 'customer' } })
  if (!role) {
    role = await db.role.create({
      data: {
        tenantId,
        key: 'customer',
        name: 'مشتری',
        description: 'دسترسی به پورتال مشتری',
        isSystem: true,
      },
    })
    console.log('Created customer role:', role.id)
  }

  // Assign role to user
  const existingUR = await db.userRole.findFirst({ where: { userId: user.id, roleId: role.id } })
  if (!existingUR) {
    await db.userRole.create({
      data: { tenantId, userId: user.id, roleId: role.id, assignedBy: user.id, assignedAt: new Date() },
    })
    console.log('Assigned customer role to user:', user.id)
  } else {
    console.log('User already has customer role')
  }

  // Grant permissions to customer role
  const permissions = await db.permission.findMany({
    where: {
      key: { in: ['product.read', 'invoice.read', 'service.read', 'warranty.read', 'crm.read'] },
    },
  })
  console.log('Found permissions:', permissions.length)

  for (const p of permissions) {
    const existing = await db.rolePermission.findFirst({ where: { roleId: role.id, permissionId: p.id } })
    if (!existing) {
      await db.rolePermission.create({
        data: { tenantId, roleId: role.id, permissionId: p.id, grantedBy: user.id, grantedAt: new Date() },
      })
    }
  }
  console.log('Granted', permissions.length, 'permissions to customer role')
}
main().then(() => db.$disconnect()).catch(e => { console.error(e); process.exit(1) })
