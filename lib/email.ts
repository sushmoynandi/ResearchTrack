import nodemailer from 'nodemailer'

/**
 * Direct Email Dispatch Engine for ResearchTrack
 * Supports SMTP (Gmail, SendGrid, Resend, Amazon SES, Custom SMTP)
 */

const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com'
const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10)
const smtpUser = process.env.SMTP_USER || ''
const smtpPass = process.env.SMTP_PASS || ''
const smtpFrom = process.env.SMTP_FROM || 'ResearchTrack <notifications@researchtrack.app>'

let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter

  if (smtpUser && smtpPass) {
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })
  } else {
    // Dev fallback mock transporter (logs output to console)
    transporter = nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true,
    }) as any
  }

  return transporter!
}

export interface EmailPayload {
  to: string
  subject: string
  html: string
  text?: string
  icalEvent?: string
}

/**
 * Dispatch an automated email with optional iCal calendar attachment
 */
export async function sendEmail({ to, subject, html, text, icalEvent }: EmailPayload): Promise<boolean> {
  try {
    const transport = getTransporter()

    const mailOptions: nodemailer.SendMailOptions = {
      from: smtpFrom,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ''),
    }

    if (icalEvent) {
      mailOptions.icalEvent = {
        filename: 'event.ics',
        method: 'REQUEST',
        content: icalEvent,
      }
    }

    const info = await transport.sendMail(mailOptions)

    if (!smtpUser) {
      console.log(`[DEV EMAIL DISPATCH] To: ${to} | Subject: "${subject}"`)
    } else {
      console.log(`[EMAIL DISPATCHED] MessageId: ${info.messageId} to ${to}`)
    }

    return true
  } catch (error) {
    console.error(`[EMAIL DISPATCH FAILED] To: ${to} | Error:`, error)
    return false
  }
}

/**
 * Send automated email when a supervisor assigns a paper to a student
 */
export async function sendPaperAssignedEmail({
  toEmail,
  studentName,
  supervisorName,
  supervisorImage,
  paperTitle,
  authors,
  dueDateFormatted,
  note,
  paperUrl,
  googleCalendarUrl,
}: {
  toEmail: string
  studentName: string
  supervisorName: string
  supervisorImage?: string
  paperTitle: string
  authors: string
  dueDateFormatted?: string
  note?: string
  paperUrl: string
  googleCalendarUrl?: string
}) {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #0f172a; color: #f8fafc; border-radius: 16px;">
      <div style="text-align: center; padding-bottom: 20px; border-b: 1px solid #334155;">
        <h1 style="color: #38bdf8; margin: 0; font-size: 24px; font-weight: 800;">🔬 ResearchTrack</h1>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Academic Research & Reading Assignments</p>
      </div>

      <div style="padding: 24px 0;">
        <h2 style="font-size: 18px; color: #f8fafc; margin-bottom: 12px;">Hi ${studentName},</h2>
        
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
          ${
            supervisorImage
              ? `<img src="${supervisorImage}" alt="${supervisorName}" style="width: 42px; height: 42px; border-radius: 50%; object-fit: cover; border: 2px solid #38bdf8;" />`
              : `<div style="width: 42px; height: 42px; border-radius: 50%; background-color: #0284c7; color: #ffffff; font-weight: bold; display: flex; align-items: center; justify-content: center; font-size: 18px;">${supervisorName.charAt(0)}</div>`
          }
          <div>
            <p style="font-size: 14px; color: #cbd5e1; margin: 0; line-height: 1.5;">
              Your supervisor <strong style="color: #38bdf8;">${supervisorName}</strong> has assigned you a new paper to read and analyze:
            </p>
          </div>
        </div>

        <div style="background-color: #1e293b; border-left: 4px solid #38bdf8; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 8px 0; color: #f8fafc; font-size: 16px;">📖 ${paperTitle}</h3>
          <p style="margin: 0; color: #94a3b8; font-size: 13px;"><strong>Authors:</strong> ${authors}</p>
          ${dueDateFormatted ? `<p style="margin: 8px 0 0 0; color: #fbbf24; font-size: 13px;"><strong>⏰ Reading Deadline:</strong> ${dueDateFormatted}</p>` : ''}
          ${note ? `<p style="margin: 8px 0 0 0; color: #cbd5e1; font-size: 13px; font-style: italic;"><strong>📝 Guidance Note:</strong> "${note}"</p>` : ''}
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${paperUrl}" style="background-color: #0284c7; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 14px;">Open Paper Workspace &rarr;</a>
          ${
            googleCalendarUrl
              ? `<div style="margin-top: 12px;"><a href="${googleCalendarUrl}" style="color: #38bdf8; font-size: 13px; text-decoration: underline;">📅 Add Reading Deadline to Google Calendar (with 1h, 30m, 10m reminders)</a></div>`
              : ''
          }
        </div>
      </div>

      <div style="border-t: 1px solid #334155; padding-top: 16px; text-align: center; font-size: 12px; color: #64748b;">
        Sent via ResearchTrack Academic OS • Keep track of literature, deadlines & 1-on-1 advisor check-ins
      </div>
    </div>
  `

  return sendEmail({
    to: toEmail,
    subject: `📖 New Paper Assigned: "${paperTitle}" by ${supervisorName}`,
    html,
  })
}

/**
 * Send automated email when a 1-on-1 meeting is scheduled or updated
 */
export async function sendMeetingScheduledEmail({
  toEmail,
  recipientName,
  organizerName,
  meetingTitle,
  scheduledTimeFormatted,
  actionItems,
  meetingUrl,
  googleCalendarUrl,
  icalContent,
}: {
  toEmail: string
  recipientName: string
  organizerName: string
  meetingTitle: string
  scheduledTimeFormatted: string
  actionItems?: string
  meetingUrl: string
  googleCalendarUrl?: string
  icalContent?: string
}) {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #0f172a; color: #f8fafc; border-radius: 16px;">
      <div style="text-align: center; padding-bottom: 20px; border-b: 1px solid #334155;">
        <h1 style="color: #38bdf8; margin: 0; font-size: 24px; font-weight: 800;">🤝 1-on-1 Advisor Session</h1>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Research Track Weekly Meeting Hub</p>
      </div>

      <div style="padding: 24px 0;">
        <h2 style="font-size: 18px; color: #f8fafc; margin-bottom: 12px;">Hi ${recipientName},</h2>
        <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6;">
          A 1-on-1 research check-in has been scheduled with <strong style="color: #38bdf8;">${organizerName}</strong>:
        </p>

        <div style="background-color: #1e293b; border-left: 4px solid #a855f7; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 8px 0; color: #f8fafc; font-size: 16px;">📅 ${meetingTitle}</h3>
          <p style="margin: 0; color: #e2e8f0; font-size: 14px;"><strong>Time:</strong> ${scheduledTimeFormatted}</p>
          ${actionItems ? `<p style="margin: 12px 0 0 0; color: #cbd5e1; font-size: 13px;"><strong>📋 Agenda & Discussion Topics:</strong><br/>${actionItems.replace(/\n/g, '<br/>')}</p>` : ''}
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${meetingUrl}" style="background-color: #a855f7; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 14px;">Open Meeting Workspace &rarr;</a>
          ${
            googleCalendarUrl
              ? `<div style="margin-top: 12px;"><a href="${googleCalendarUrl}" style="color: #c084fc; font-size: 13px; text-decoration: underline;">📅 Add to Google Calendar (with 1h, 30m, 10m alarms)</a></div>`
              : ''
          }
        </div>
      </div>

      <div style="border-t: 1px solid #334155; padding-top: 16px; text-align: center; font-size: 12px; color: #64748b;">
        Sent via ResearchTrack Academic OS • Active 1h, 30m, and 10m reminders enabled
      </div>
    </div>
  `

  return sendEmail({
    to: toEmail,
    subject: `🤝 1-on-1 Meeting Scheduled: "${meetingTitle}" with ${organizerName}`,
    html,
    icalEvent: icalContent,
  })
}
