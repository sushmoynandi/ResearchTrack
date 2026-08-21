import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient()
}

// In development, ensure we have a fresh client that includes all newly generated models
function isClientUpToDate(client: any): boolean {
  return Boolean(
    client &&
      'user' in client &&
      'lab' in client &&
      'researchGroup' in client &&
      'labBroadcast' in client &&
      'starterPackItem' in client &&
      'journalClubSession' in client &&
      'labMeeting' in client &&
      'assignment' in client &&
      'pushSubscription' in client &&
      'labTask' in client &&
      'roleChangeRequest' in client
  )
}

export const prisma =
  globalForPrisma.prisma && isClientUpToDate(globalForPrisma.prisma)
    ? globalForPrisma.prisma
    : createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
