/**
 * Promote (or demote) an account.
 *
 *   node prisma/make-admin.js someone@example.com            → make them an Administrator
 *   node prisma/make-admin.js someone@example.com STUDENT    → set any role
 *
 * Roles: STUDENT | SUPERVISOR | ADMIN
 *
 * Point DATABASE_URL at whichever database you mean — leaving it unset uses the
 * one in .env, so run it with the live URL in front to promote someone there:
 *   DATABASE_URL="postgres://..." node prisma/make-admin.js you@gmail.com
 */
const { PrismaClient } = require('@prisma/client')

const VALID = ['STUDENT', 'SUPERVISOR', 'ADMIN']

async function main() {
  const email = (process.argv[2] || '').trim().toLowerCase()
  const role = (process.argv[3] || 'ADMIN').trim().toUpperCase()

  if (!email) {
    console.error('Usage: node prisma/make-admin.js <email> [STUDENT|SUPERVISOR|ADMIN]')
    process.exit(1)
  }
  if (!VALID.includes(role)) {
    console.error(`Role must be one of: ${VALID.join(', ')}`)
    process.exit(1)
  }

  const prisma = new PrismaClient()
  try {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      console.error(`No account found for ${email}`)
      process.exit(1)
    }

    if (user.systemRole === role) {
      console.log(`${user.name} <${email}> is already ${role}. Nothing to do.`)
      return
    }

    await prisma.user.update({
      where: { email },
      data: { systemRole: role, role },
    })

    console.log(`${user.name} <${email}>: ${user.systemRole} → ${role}`)
    console.log('They need to sign out and back in for it to take effect everywhere.')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error('Failed:', err.message)
  process.exit(1)
})
