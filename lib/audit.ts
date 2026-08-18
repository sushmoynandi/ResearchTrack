import { prisma } from '@/lib/prisma'

export interface RecordAuditLogParams {
  userId?: string | null
  userName?: string | null
  action: string
  resource: string
  details?: string | null
  severity?: 'INFO' | 'WARNING' | 'CRITICAL'
}

export async function recordAuditLog(params: RecordAuditLogParams) {
  try {
    return await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        userName: params.userName || null,
        action: params.action,
        resource: params.resource,
        details: params.details || null,
        severity: params.severity || 'INFO',
      },
    })
  } catch (error) {
    console.error('Failed to record audit log:', error)
    return null
  }
}
