const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('Checking database connection & users...')
  try {
    const count = await prisma.user.count()
    console.log(`Total users in DB: ${count}`)

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        systemRole: true,
        isActive: true,
        passwordHash: true,
      },
    })
    console.log('Existing users count:', users.length)

    // Ensure password for test accounts
    const testPassword = 'password123'
    const salt = await bcrypt.genSalt(12)
    const passwordHash = await bcrypt.hash(testPassword, salt)

    // 1. Create or update Demo Student (@researchtrack.edu & @papertrack.edu)
    for (const domain of ['researchtrack.edu', 'papertrack.edu']) {
      await prisma.user.upsert({
        where: { email: `student@${domain}` },
        update: { passwordHash, systemRole: 'STUDENT', isActive: true },
        create: {
          name: 'Sophia Chen',
          email: `student@${domain}`,
          passwordHash,
          institution: 'Stanford University',
          department: 'Computer Science',
          systemRole: 'STUDENT',
          isActive: true,
          provider: 'CREDENTIALS',
        },
      })
    }
    const student = await prisma.user.findUnique({ where: { email: 'student@researchtrack.edu' } })
    console.log('Student account ready:', student.email)

    // 2. Create or update Demo Supervisor (@researchtrack.edu & @papertrack.edu)
    for (const domain of ['researchtrack.edu', 'papertrack.edu']) {
      await prisma.user.upsert({
        where: { email: `supervisor@${domain}` },
        update: { passwordHash, systemRole: 'SUPERVISOR', isActive: true },
        create: {
          name: 'Dr. Elena Rostova',
          email: `supervisor@${domain}`,
          passwordHash,
          institution: 'Stanford AI Lab',
          department: 'Artificial Intelligence',
          systemRole: 'SUPERVISOR',
          isActive: true,
          provider: 'CREDENTIALS',
        },
      })
    }
    const supervisor = await prisma.user.findUnique({ where: { email: 'supervisor@researchtrack.edu' } })
    console.log('Supervisor account ready:', supervisor.email)

    // Link student to supervisor
    await prisma.user.update({
      where: { id: student.id },
      data: { supervisorId: supervisor.id },
    })
    console.log('Linked Sophia Chen to Dr. Elena Rostova')

    // 3. Create or update Demo Admin (@researchtrack.edu & @papertrack.edu)
    for (const domain of ['researchtrack.edu', 'papertrack.edu']) {
      await prisma.user.upsert({
        where: { email: `admin@${domain}` },
        update: { passwordHash, systemRole: 'ADMIN', isActive: true },
        create: {
          name: 'Dean Administrator',
          email: `admin@${domain}`,
          passwordHash,
          institution: 'Stanford University',
          department: 'School of Engineering',
          systemRole: 'ADMIN',
          isActive: true,
          provider: 'CREDENTIALS',
        },
      })
    }
    const admin = await prisma.user.findUnique({ where: { email: 'admin@researchtrack.edu' } })
    console.log('Admin account ready:', admin.email)

    // Add sample paper for student if none
    const paperCount = await prisma.paper.count({ where: { userId: student.id } })
    if (paperCount === 0) {
      await prisma.paper.create({
        data: {
          userId: student.id,
          title: 'Attention Is All You Need',
          authors: 'Ashish Vaswani, Noam Shazeer, Niki Parmar, et al.',
          abstract: 'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks. We propose the Transformer, based solely on attention mechanisms.',
          doi: '10.48550/arXiv.1706.03762',
          url: 'https://arxiv.org/abs/1706.03762',
          journal: 'NeurIPS 2017',
          publicationYear: 2017,
          status: 'COMPLETED',
          priority: 'CRITICAL',
          isFavorite: true,
          architecture: 'Dense Transformer',
          parameters: '65M (Base)',
          contextWindow: '512 tokens',
          replicationStatus: 'REPLICATED',
          problemSolved: 'Overcoming sequential bottleneck of RNNs.',
          keyContribution: 'Multi-Head Self-Attention.',
          tags: {
            create: [
              { name: 'transformer', userId: student.id },
              { name: 'foundational', userId: student.id }
            ]
          }
        }
      })
      console.log('Added sample paper for student')
    }

    console.log('--- SEED COMPLETED SUCCESSFULLY ---')
  } catch (err) {
    console.error('Error during test/seed:', err)
  } finally {
    await prisma.$disconnect()
  }
}

main()
