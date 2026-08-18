const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function testAccounts() {
  console.log('Testing seeded credentials against database...')
  const accounts = [
    { email: 'student@papertrack.edu', role: 'STUDENT' },
    { email: 'supervisor@papertrack.edu', role: 'SUPERVISOR' },
    { email: 'admin@papertrack.edu', role: 'ADMIN' },
  ]

  for (const acc of accounts) {
    const user = await prisma.user.findUnique({ where: { email: acc.email } })
    if (!user) {
      console.error(`FAILED: User ${acc.email} not found`)
      continue
    }
    const match = await bcrypt.compare('password123', user.passwordHash)
    console.log(`[PASS] ${user.name} (${acc.email}) -> Role: ${user.systemRole}, Password valid: ${match}`)
  }
  await prisma.$disconnect()
}

testAccounts()
