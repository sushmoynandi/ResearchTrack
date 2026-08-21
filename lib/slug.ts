import { prisma } from '@/lib/prisma'

/**
 * Converts a string into a clean, URL-friendly slug.
 * Example: "Attention Is All You Need (2017)!" -> "attention-is-all-you-need"
 */
export function generateSlug(title: string): string {
  if (!title) return 'paper'

  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9\s-]/g, '') // remove non-alphanumeric except space and dash
    .trim()
    .replace(/[\s_-]+/g, '-') // replace spaces/underscores with single hyphen
    .replace(/^-+|-+$/g, '') // remove leading/trailing hyphens
    .slice(0, 80) || 'paper'
}

/**
 * Generates a unique slug for a Paper in the database.
 * If "attention-is-all-you-need" exists, generates "attention-is-all-you-need-2", etc.
 */
export async function getUniquePaperSlug(title: string, currentPaperId?: string): Promise<string> {
  const baseSlug = generateSlug(title)
  let candidateSlug = baseSlug
  let counter = 1

  while (true) {
    const existing = await prisma.paper.findFirst({
      where: {
        slug: candidateSlug,
        ...(currentPaperId ? { NOT: { id: currentPaperId } } : {}),
      },
      select: { id: true },
    })

    if (!existing) {
      return candidateSlug
    }

    counter++
    candidateSlug = `${baseSlug}-${counter}`
  }
}

/**
 * Resolves a paper ID from either a CUID or a slug.
 */
export async function resolvePaperId(identifier: string): Promise<string | null> {
  if (!identifier) return null

  const paper = await prisma.paper.findFirst({
    where: {
      OR: [{ id: identifier }, { slug: identifier }],
    },
    select: { id: true },
  })

  return paper?.id || null
}
