/**
 * Database Seeder — initializes default tenant and master data.
 * Run with: bun run db:seed
 */
import { PrismaClient } from '@prisma/client'
import { BusinessCodeGenerator } from './shared/helpers/business-code-generator'

const db = new PrismaClient()

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

  // 2. Users (system + demo)
  const users = [
    { username: 'admin', displayName: 'مدیر سیستم', email: 'admin@bismark.example.com', userType: 'staff' },
    { username: 'ceo', displayName: 'مدیرعامل', email: 'ceo@bismark.example.com', userType: 'staff' },
    { username: 'smanager', displayName: 'مدیر خدمات', email: 'service@bismark.example.com', userType: 'staff' },
    { username: 'wmanager', displayName: 'مدیر انبار', email: 'warehouse@bismark.example.com', userType: 'staff' },
    { username: 'fmanager', displayName: 'مدیر مالی', email: 'finance@bismark.example.com', userType: 'staff' },
    { username: 'itadmin', displayName: 'مدیر فناوری', email: 'it@bismark.example.com', userType: 'staff' },
  ]

  for (const u of users) {
    await db.user.upsert({
      where: { tenantId_username: { tenantId, username: u.username } },
      update: {},
      create: { ...u, tenantId, status: 'active', isActive: true, locale: 'fa-IR', metadata: {} },
    })
  }
  console.log(`✓ ${users.length} users`)

  // 3. Roles
  const roles = [
    { key: 'super_admin', name: 'مدیر کل سیستم', description: 'دسترسی کامل', isSystem: true },
    { key: 'ceo', name: 'مدیرعامل', description: 'داشبورد و گزارش‌ها', isSystem: true },
    { key: 'service_manager', name: 'مدیر خدمات', description: 'مدیریت خدمات', isSystem: true },
    { key: 'warehouse_manager', name: 'مدیر انبار', description: 'مدیریت انبار', isSystem: true },
    { key: 'financial_manager', name: 'مدیر مالی', description: 'مدیریت مالی', isSystem: true },
    { key: 'it_administrator', name: 'مدیر فناوری', description: 'مدیریت سیستم', isSystem: true },
  ]

  for (const r of roles) {
    await db.role.upsert({
      where: { tenantId_key: { tenantId, key: r.key } },
      update: {},
      create: { ...r, tenantId },
    })
  }
  console.log(`✓ ${roles.length} roles`)

  // 4. Branches
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

  // 5. Parties (with REAL BusinessCodeGenerator)
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
  console.log(`✓ ${parties.length} parties (with business codes)`)

  // 6. Product Categories (tree)
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
        tenantId,
        name: 'گوشی موبایل',
        code: phonesCode,
        parentId: electronics.id,
        level: 1,
        path: '/electronics/phones',
        isActive: true,
        attributes: [],
      },
    })

    const laptopsCode = await BusinessCodeGenerator.generate('product_category', tenantId)
    await db.productCategory.create({
      data: {
        tenantId,
        name: 'لپ‌تاپ',
        code: laptopsCode,
        parentId: electronics.id,
        level: 1,
        path: '/electronics/laptops',
        isActive: true,
        attributes: [],
      },
    })
  }
  console.log('✓ 3 product categories (tree)')

  // 7. Product Brands
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
  console.log('   Login with: admin / any password')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
