// Test data seeder for Audit v4 — F-02 runtime verification
// Run: bun run ./seed_test_data.ts
import { PrismaClient } from '@prisma/client'
import { BusinessCodeGenerator } from './src/lib/shared/helpers/business-code-generator'

const db = new PrismaClient()

async function main() {
  const tenantId = '01910000-0000-7000-8000-000000000001'

  // List existing parties
  const parties = await db.party.findMany({ take: 10, select: { id: true, displayName: true, partyType: true } })
  console.log('Existing parties:', parties.length)
  for (const p of parties) console.log('  -', p.id, p.displayName, '(' + p.partyType + ')')

  // Get or create a warehouse
  let warehouse = await db.warehouse.findFirst({ where: { tenantId } })
  if (!warehouse) {
    const whCode = await BusinessCodeGenerator.generate('warehouse', tenantId)
    warehouse = await db.warehouse.create({
      data: {
        tenantId,
        code: whCode,
        name: 'انبار مرکزی',
        warehouseType: 'main',
        isDefault: true,
        metadata: {},
      },
    })
    console.log('Created warehouse:', warehouse.id)
  } else {
    console.log('Existing warehouse:', warehouse.id, warehouse.name)
  }

  // Get or create a ProductModel (required for Product)
  let productModel = await db.productModel.findFirst({ where: { tenantId } })
  if (!productModel) {
    const brand = await db.productBrand.findFirst({ where: { tenantId } })
    const category = await db.productCategory.findFirst({ where: { tenantId } })
    if (!brand || !category) {
      throw new Error('Brand or category missing — run main seed first: bun run src/lib/seed.ts')
    }
    const modelCode = await BusinessCodeGenerator.generate('product_model', tenantId)
    productModel = await db.productModel.create({
      data: {
        tenantId,
        brandId: brand.id,
        categoryId: category.id,
        modelCode: modelCode,
        name: 'مدل تستی',
        attributes: {},
        metadata: {},
      },
    })
    console.log('Created product model:', productModel.id)
  }

  // Get or create a product
  let product = await db.product.findFirst({ where: { tenantId } })
  if (!product) {
    const prodCode = await BusinessCodeGenerator.generate('product', tenantId)
    product = await db.product.create({
      data: {
        tenantId,
        modelId: productModel.id,
        sku: prodCode,
        name: 'گوشی تستی',
        productType: 'serialized',
        status: 'active',
        attributes: {},
        metadata: {},
      },
    })
    console.log('Created product:', product.id)
  }

  // Get or create a product instance
  let productInstance = await db.productInstance.findFirst({ where: { tenantId } })
  if (!productInstance && product) {
    const snCode = await BusinessCodeGenerator.generate('product_instance', tenantId)
    productInstance = await db.productInstance.create({
      data: {
        tenantId,
        productId: product.id,
        serialNumber: snCode,
        status: 'in_stock',
        attributes: {},
        metadata: {},
      },
    })
    console.log('Created product instance:', productInstance.id)
  }

  console.log('\n--- Test data summary ---')
  console.log('Tenant ID:', tenantId)
  console.log('First party ID:', parties[0]?.id)
  console.log('Warehouse ID:', warehouse.id)
  console.log('Product ID:', product?.id)
  console.log('Product Instance ID:', productInstance?.id)
}

main().then(() => db.$disconnect()).catch(e => { console.error('Seed failed:', e); process.exit(1) })
