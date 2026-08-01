/**
 * Database Seeder — initializes default tenant, users, roles, permissions, and master data.
 * Run with: bun run src/lib/seed.ts
 */
import { PrismaClient } from '@prisma/client'
import { BusinessCodeGenerator } from './shared/helpers/business-code-generator'
import { hashPassword } from './auth/password'

const db = new PrismaClient()

// Default password for all seeded users (change in production!)
const DEFAULT_PASSWORD = 'demo1234'

async function main() {
  console.log('🌱 Seeding database...')

  // 1. Default tenant
  const tenant = await db.tenant.upsert({
    where: { slug: 'bismark' },
    update: {},
    create: {
      id: '01910000-0000-7000-8000-000000000001',
      name: 'Bismark Co.',
      slug: 'bismark',
      defaultLocale: 'fa-IR',
      defaultTz: 'Asia/Tehran',
      isActive: true,
      metadata: {},
    },
  })
  console.log(`✓ Tenant: ${tenant.name} (${tenant.slug})`)

  const tenantId = tenant.id
  const passwordHash = hashPassword(DEFAULT_PASSWORD)

  // 2. Users (with password hashes)
  const users = [
    { username: 'admin', displayName: 'مدیر سیستم', email: 'admin@bismark.example.com', userType: 'staff', roleKey: 'super_admin' },
    { username: 'ceo', displayName: 'مدیرعامل', email: 'ceo@bismark.example.com', userType: 'staff', roleKey: 'ceo' },
    { username: 'smanager', displayName: 'مدیر خدمات', email: 'service@bismark.example.com', userType: 'staff', roleKey: 'service_manager' },
    { username: 'wmanager', displayName: 'مدیر انبار', email: 'warehouse@bismark.example.com', userType: 'staff', roleKey: 'warehouse_manager' },
    { username: 'fmanager', displayName: 'مدیر مالی', email: 'finance@bismark.example.com', userType: 'staff', roleKey: 'financial_manager' },
    { username: 'itadmin', displayName: 'مدیر فناوری', email: 'it@bismark.example.com', userType: 'staff', roleKey: 'it_administrator' },
  ]

  for (const u of users) {
    const { roleKey, ...userData } = u
    await db.user.upsert({
      where: { tenantId_username: { tenantId, username: u.username } },
      update: { passwordHash },
      create: {
        ...userData,
        tenantId,
        passwordHash,
        status: 'active',
        isActive: true,
        locale: 'fa-IR',
        metadata: {},
      },
    })
  }
  console.log(`✓ ${users.length} users (with password: ${DEFAULT_PASSWORD})`)

  // 3. Roles
  const roles = [
    { key: 'super_admin', name: 'مدیر کل سیستم', description: 'دسترسی کامل به همه بخش‌ها', isSystem: true },
    { key: 'ceo', name: 'مدیرعامل', description: 'داشبورد و گزارش‌ها', isSystem: true },
    { key: 'service_manager', name: 'مدیر خدمات', description: 'مدیریت خدمات و تعمیرات', isSystem: true },
    { key: 'warehouse_manager', name: 'مدیر انبار', description: 'مدیریت انبار و موجودی', isSystem: true },
    { key: 'financial_manager', name: 'مدیر مالی', description: 'مدیریت مالی و حسابداری', isSystem: true },
    { key: 'it_administrator', name: 'مدیر فناوری', description: 'مدیریت سیستم و تنظیمات', isSystem: true },
  ]

  for (const r of roles) {
    await db.role.upsert({
      where: { tenantId_key: { tenantId, key: r.key } },
      update: {},
      create: { ...r, tenantId },
    })
  }
  console.log(`✓ ${roles.length} roles`)

  // 4. Permissions (module + action pattern)
  const permissionDefs = [
    // Identity
    { key: 'user.read', module: 'identity', action: 'read', description: 'View users' },
    { key: 'user.create', module: 'identity', action: 'create', description: 'Create users' },
    { key: 'user.update', module: 'identity', action: 'update', description: 'Update users' },
    { key: 'user.delete', module: 'identity', action: 'delete', description: 'Delete users' },
    { key: 'role.read', module: 'identity', action: 'read', description: 'View roles' },
    { key: 'role.manage', module: 'identity', action: 'manage', description: 'Manage roles and permissions' },
    // Product
    { key: 'product.read', module: 'product', action: 'read', description: 'View products' },
    { key: 'product.create', module: 'product', action: 'create', description: 'Create products' },
    { key: 'product.update', module: 'product', action: 'update', description: 'Update products' },
    { key: 'product.delete', module: 'product', action: 'delete', description: 'Delete products' },
    // Inventory
    { key: 'inventory.read', module: 'inventory', action: 'read', description: 'View inventory' },
    { key: 'inventory.adjust', module: 'inventory', action: 'adjust', description: 'Adjust inventory' },
    { key: 'inventory.transfer', module: 'inventory', action: 'transfer', description: 'Transfer stock' },
    { key: 'inventory.cycle_count', module: 'inventory', action: 'cycle_count', description: 'Run cycle counts' },
    // Sales
    { key: 'sales.read', module: 'sales', action: 'read', description: 'View sales orders' },
    { key: 'sales.create', module: 'sales', action: 'create', description: 'Create sales orders' },
    { key: 'sales.approve', module: 'sales', action: 'approve', description: 'Approve sales orders' },
    { key: 'sales.cancel', module: 'sales', action: 'cancel', description: 'Cancel sales orders' },
    // Fulfillment
    { key: 'fulfillment.read', module: 'fulfillment', action: 'read', description: 'View shipments' },
    { key: 'fulfillment.manage', module: 'fulfillment', action: 'manage', description: 'Manage shipments' },
    // Billing
    { key: 'invoice.read', module: 'billing', action: 'read', description: 'View invoices' },
    { key: 'invoice.create', module: 'billing', action: 'create', description: 'Create invoices' },
    { key: 'invoice.issue', module: 'billing', action: 'issue', description: 'Issue invoices' },
    { key: 'invoice.cancel', module: 'billing', action: 'cancel', description: 'Cancel invoices' },
    { key: 'payment.read', module: 'billing', action: 'read', description: 'View payments' },
    { key: 'payment.create', module: 'billing', action: 'create', description: 'Record payments' },
    { key: 'payment.allocate', module: 'billing', action: 'allocate', description: 'Allocate payments' },
    // Returns
    { key: 'return.read', module: 'returns', action: 'read', description: 'View returns' },
    { key: 'return.approve', module: 'returns', action: 'approve', description: 'Approve returns' },
    { key: 'return.receive', module: 'returns', action: 'receive', description: 'Receive returns' },
    // Warranty
    { key: 'warranty.read', module: 'warranty', action: 'read', description: 'View warranties' },
    { key: 'warranty.activate', module: 'warranty', action: 'activate', description: 'Activate warranties' },
    { key: 'warranty.claim_approve', module: 'warranty', action: 'claim_approve', description: 'Approve warranty claims' },
    // Service
    { key: 'service.read', module: 'service', action: 'read', description: 'View service orders' },
    { key: 'service.create', module: 'service', action: 'create', description: 'Create service orders' },
    { key: 'service.update', module: 'service', action: 'update', description: 'Update service orders' },
    { key: 'service.complete', module: 'service', action: 'complete', description: 'Complete service orders' },
    // Financial
    { key: 'financial.read', module: 'financial', action: 'read', description: 'View financial data' },
    { key: 'financial.journal_create', module: 'financial', action: 'journal_create', description: 'Create journal entries' },
    { key: 'financial.journal_post', module: 'financial', action: 'journal_post', description: 'Post journal entries' },
    { key: 'financial.period_close', module: 'financial', action: 'period_close', description: 'Close fiscal periods' },
    { key: 'financial.reports', module: 'financial', action: 'reports', description: 'View financial reports' },
    // Workflow
    { key: 'workflow.read', module: 'workflow', action: 'read', description: 'View workflows' },
    { key: 'workflow.manage', module: 'workflow', action: 'manage', description: 'Manage workflow definitions' },
    { key: 'workflow.transition', module: 'workflow', action: 'transition', description: 'Execute workflow transitions' },
    // Rules
    { key: 'rule.read', module: 'rule', action: 'read', description: 'View rules' },
    { key: 'rule.manage', module: 'rule', action: 'manage', description: 'Manage rules' },
    { key: 'rule.evaluate', module: 'rule', action: 'evaluate', description: 'Evaluate rules' },
    // Notification
    { key: 'notification.read', module: 'notification', action: 'read', description: 'View notifications' },
    { key: 'notification.send', module: 'notification', action: 'send', description: 'Send notifications' },
    { key: 'notification.manage', module: 'notification', action: 'manage', description: 'Manage notification templates' },
    // System
    { key: 'system.read', module: 'system', action: 'read', description: 'View system status' },
    { key: 'system.manage', module: 'system', action: 'manage', description: 'Manage system settings' },
    // Installation
    { key: 'installation.read', module: 'fulfillment', action: 'read', description: 'View installations' },
    { key: 'installation.manage', module: 'fulfillment', action: 'manage', description: 'Manage installations' },
    // Appointment
    { key: 'appointment.read', module: 'service', action: 'read', description: 'View appointments' },
    { key: 'appointment.manage', module: 'service', action: 'manage', description: 'Manage appointments' },
    // Complaint
    { key: 'complaint.read', module: 'service', action: 'read', description: 'View complaints' },
    { key: 'complaint.manage', module: 'service', action: 'manage', description: 'Manage complaints' },
    // Survey
    { key: 'survey.read', module: 'service', action: 'read', description: 'View surveys' },
    { key: 'survey.manage', module: 'service', action: 'manage', description: 'Manage surveys' },
    // Files
    { key: 'file.read', module: 'system', action: 'read', description: 'View files' },
    { key: 'file.upload', module: 'system', action: 'manage', description: 'Upload files' },
    // Technician Management
    { key: 'technician.skills', module: 'service', action: 'manage', description: 'Manage technician skills' },
    { key: 'technician.availability', module: 'service', action: 'manage', description: 'Manage technician availability' },
    // SLA
    { key: 'sla.read', module: 'system', action: 'read', description: 'View SLA policies' },
    { key: 'sla.manage', module: 'system', action: 'manage', description: 'Manage SLA policies' },
    // Procurement
    { key: 'procurement.read', module: 'inventory', action: 'read', description: 'View purchase orders' },
    { key: 'procurement.create', module: 'inventory', action: 'create', description: 'Create purchase orders' },
    { key: 'procurement.approve', module: 'inventory', action: 'approve', description: 'Approve purchase orders' },
    { key: 'procurement.receive', module: 'inventory', action: 'receive', description: 'Receive goods' },
    // Commission
    { key: 'commission.read', module: 'financial', action: 'read', description: 'View commissions' },
    { key: 'commission.manage', module: 'financial', action: 'manage', description: 'Manage commission rules' },
    // Promotion
    { key: 'promotion.read', module: 'sales', action: 'read', description: 'View promotions' },
    { key: 'promotion.manage', module: 'sales', action: 'manage', description: 'Manage promotions' },
    // CRM
    { key: 'crm.read', module: 'sales', action: 'read', description: 'View CRM data' },
    { key: 'crm.manage', module: 'sales', action: 'manage', description: 'Manage CRM' },
    // Loyalty
    { key: 'loyalty.read', module: 'sales', action: 'read', description: 'View loyalty accounts' },
    { key: 'loyalty.manage', module: 'sales', action: 'manage', description: 'Manage loyalty' },
    // Company
    { key: 'company.read', module: 'system', action: 'read', description: 'View companies' },
    { key: 'company.manage', module: 'system', action: 'manage', description: 'Manage companies' },
  ]

  for (const p of permissionDefs) {
    await db.permission.upsert({
      where: { key: p.key },
      update: {},
      create: p,
    })
  }
  console.log(`✓ ${permissionDefs.length} permissions`)

  // 5. Assign roles to users
  for (const u of users) {
    const user = await db.user.findFirst({ where: { tenantId, username: u.username } })
    const role = await db.role.findFirst({ where: { tenantId, key: u.roleKey } })
    if (user && role) {
      await db.userRole.upsert({
        where: { tenantId_userId_roleId: { tenantId, userId: user.id, roleId: role.id } },
        update: {},
        create: { tenantId, userId: user.id, roleId: role.id, assignedBy: 'system' },
      })
    }
  }
  console.log(`✓ ${users.length} user-role assignments`)

  // 6. Assign permissions to roles
  // super_admin gets ALL permissions
  const superAdminRole = await db.role.findFirst({ where: { tenantId, key: 'super_admin' } })
  if (superAdminRole) {
    const allPermissions = await db.permission.findMany()
    for (const p of allPermissions) {
      await db.rolePermission.upsert({
        where: { tenantId_roleId_permissionId: { tenantId, roleId: superAdminRole.id, permissionId: p.id } },
        update: {},
        create: { tenantId, roleId: superAdminRole.id, permissionId: p.id, grantedBy: 'system' },
      })
    }
    console.log(`✓ super_admin: ${allPermissions.length} permissions`)
  }

  // ceo gets read + reports permissions
  const ceoRole = await db.role.findFirst({ where: { tenantId, key: 'ceo' } })
  if (ceoRole) {
    const ceoPerms = ['sales.read', 'invoice.read', 'payment.read', 'warranty.read', 'service.read',
      'inventory.read', 'financial.read', 'financial.reports', 'product.read', 'system.read',
      'fulfillment.read', 'return.read', 'workflow.read', 'rule.read', 'notification.read']
    for (const key of ceoPerms) {
      const p = await db.permission.findFirst({ where: { key } })
      if (p) {
        await db.rolePermission.upsert({
          where: { tenantId_roleId_permissionId: { tenantId, roleId: ceoRole.id, permissionId: p.id } },
          update: {},
          create: { tenantId, roleId: ceoRole.id, permissionId: p.id, grantedBy: 'system' },
        })
      }
    }
    console.log(`✓ ceo: ${ceoPerms.length} permissions`)
  }

  // service_manager gets service + warranty permissions
  const smRole = await db.role.findFirst({ where: { tenantId, key: 'service_manager' } })
  if (smRole) {
    const smPerms = ['service.read', 'service.create', 'service.update', 'service.complete',
      'warranty.read', 'warranty.activate', 'warranty.claim_approve',
      'product.read', 'inventory.read', 'notification.read']
    for (const key of smPerms) {
      const p = await db.permission.findFirst({ where: { key } })
      if (p) {
        await db.rolePermission.upsert({
          where: { tenantId_roleId_permissionId: { tenantId, roleId: smRole.id, permissionId: p.id } },
          update: {},
          create: { tenantId, roleId: smRole.id, permissionId: p.id, grantedBy: 'system' },
        })
      }
    }
    console.log(`✓ service_manager: ${smPerms.length} permissions`)
  }

  // warehouse_manager gets inventory permissions
  const wmRole = await db.role.findFirst({ where: { tenantId, key: 'warehouse_manager' } })
  if (wmRole) {
    const wmPerms = ['inventory.read', 'inventory.adjust', 'inventory.transfer', 'inventory.cycle_count',
      'product.read', 'fulfillment.read', 'fulfillment.manage', 'notification.read']
    for (const key of wmPerms) {
      const p = await db.permission.findFirst({ where: { key } })
      if (p) {
        await db.rolePermission.upsert({
          where: { tenantId_roleId_permissionId: { tenantId, roleId: wmRole.id, permissionId: p.id } },
          update: {},
          create: { tenantId, roleId: wmRole.id, permissionId: p.id, grantedBy: 'system' },
        })
      }
    }
    console.log(`✓ warehouse_manager: ${wmPerms.length} permissions`)
  }

  // financial_manager gets financial + billing permissions
  const fmRole = await db.role.findFirst({ where: { tenantId, key: 'financial_manager' } })
  if (fmRole) {
    const fmPerms = ['financial.read', 'financial.journal_create', 'financial.journal_post',
      'financial.period_close', 'financial.reports',
      'invoice.read', 'invoice.create', 'invoice.issue', 'invoice.cancel',
      'payment.read', 'payment.create', 'payment.allocate',
      'return.read', 'return.approve', 'return.receive', 'notification.read']
    for (const key of fmPerms) {
      const p = await db.permission.findFirst({ where: { key } })
      if (p) {
        await db.rolePermission.upsert({
          where: { tenantId_roleId_permissionId: { tenantId, roleId: fmRole.id, permissionId: p.id } },
          update: {},
          create: { tenantId, roleId: fmRole.id, permissionId: p.id, grantedBy: 'system' },
        })
      }
    }
    console.log(`✓ financial_manager: ${fmPerms.length} permissions`)
  }

  // it_administrator gets system + identity permissions
  const itRole = await db.role.findFirst({ where: { tenantId, key: 'it_administrator' } })
  if (itRole) {
    const itPerms = ['system.read', 'system.manage',
      'user.read', 'user.create', 'user.update', 'user.delete',
      'role.read', 'role.manage',
      'workflow.read', 'workflow.manage', 'workflow.transition',
      'rule.read', 'rule.manage', 'rule.evaluate',
      'notification.read', 'notification.manage', 'notification.send',
      'product.read', 'inventory.read']
    for (const key of itPerms) {
      const p = await db.permission.findFirst({ where: { key } })
      if (p) {
        await db.rolePermission.upsert({
          where: { tenantId_roleId_permissionId: { tenantId, roleId: itRole.id, permissionId: p.id } },
          update: {},
          create: { tenantId, roleId: itRole.id, permissionId: p.id, grantedBy: 'system' },
        })
      }
    }
    console.log(`✓ it_administrator: ${itPerms.length} permissions`)
  }

  // 7. Branches
  await db.branch.create({
    data: {
      tenantId,
      name: 'مرکز تهران',
      code: 'TEHRAN-01',
      address: { city: 'تهران', street: 'ولیعصر' },
      contactPhone: '02112345678',
      isActive: true,
    },
  }).catch(() => {})

  await db.branch.create({
    data: {
      tenantId,
      name: 'مرکز اصفهان',
      code: 'ESFAHAN-01',
      address: { city: 'اصفهان', street: 'چهارباغ' },
      contactPhone: '03112345678',
      isActive: true,
    },
  }).catch(() => {})
  console.log('✓ 2 branches')

  // 8. Parties
  const parties = [
    { partyType: 'person', displayName: 'علی محمدی', taxId: '1234567890' },
    { partyType: 'organization', displayName: 'شرکت فناوری برتر', taxId: '0987654321', registrationNo: '123456' },
    { partyType: 'person', displayName: 'مریم حسینی', taxId: '1122334455' },
    { partyType: 'organization', displayName: 'نمایندگی تهران', taxId: '9988776655', registrationNo: '789012' },
  ]

  for (const p of parties) {
    const businessCode = await BusinessCodeGenerator.generate('party', tenantId)
    await db.party.create({
      data: { ...p, tenantId, businessCode, status: 'active', metadata: {} },
    }).catch(() => {})
  }
  console.log(`✓ ${parties.length} parties`)

  // 9. Product Categories
  const electronicsCode = await BusinessCodeGenerator.generate('product_category', tenantId)
  const electronics = await db.productCategory.create({
    data: {
      tenantId,
      name: 'الکترونیک',
      code: electronicsCode,
      level: 0,
      path: '/electronics',
      isActive: true,
      attributes: [],
    },
  }).catch((e) => null)

  if (electronics) {
    const phonesCode = await BusinessCodeGenerator.generate('product_category', tenantId)
    await db.productCategory.create({
      data: {
        tenantId, name: 'گوشی موبایل', code: phonesCode,
        parentId: electronics.id, level: 1, path: '/electronics/phones',
        isActive: true, attributes: [],
      },
    }).catch(() => {})

    const laptopsCode = await BusinessCodeGenerator.generate('product_category', tenantId)
    await db.productCategory.create({
      data: {
        tenantId, name: 'لپ‌تاپ', code: laptopsCode,
        parentId: electronics.id, level: 1, path: '/electronics/laptops',
        isActive: true, attributes: [],
      },
    }).catch(() => {})
  }
  console.log('✓ 3 product categories')

  // 10. Product Brands
  const brands = [
    { name: 'Samsung', nameEn: 'Samsung', code: 'SAMSUNG' },
    { name: 'Apple', nameEn: 'Apple', code: 'APPLE' },
    { name: 'Xiaomi', nameEn: 'Xiaomi', code: 'XIAOMI' },
  ]

  for (const b of brands) {
    const code = await BusinessCodeGenerator.generate('product_brand', tenantId)
    await db.productBrand.create({
      data: { ...b, tenantId, code, isActive: true, metadata: {} },
    }).catch(() => {})
  }
  console.log(`✓ ${brands.length} product brands`)

  console.log('\n✅ Seeding complete!')
  console.log(`   Tenant ID: ${tenantId}`)
  console.log(`   Default password: ${DEFAULT_PASSWORD}`)
  console.log('   Users: admin, ceo, smanager, wmanager, fmanager, itadmin')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
