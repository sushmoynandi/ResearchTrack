const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function activateAll() {
  const res = await prisma.user.updateMany({
    data: { isActive: true },
  })
  console.log(`Updated ${res.count} users to isActive = true`)
  await prisma.$disconnect()
}

activateAll()
