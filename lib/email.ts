import nodemailer from 'nodemailer'
import crypto from 'crypto'

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

/**
 * Check whether outgoing SMTP email is configured and ready.
 */
export function isMailerConfigured(): boolean {
  if (Boolean(process.env.SMTP_USER && process.env.SMTP_PASS)) {
    return true
  }
  // In development, mock transporter prints codes to console
  return process.env.NODE_ENV !== 'production'
}

/**
 * Generate a cryptographically secure 6-digit numeric OTP code.
 */
export function generate6DigitCode(): string {
  const num = crypto.randomInt(100000, 1000000)
  return num.toString()
}

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
      pool: true,
      maxConnections: 3,
      maxMessages: 100,
      rateDelta: 1000,
      rateLimit: 5, // max 5 messages per second
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
 * Robustly resolve sender display name and authenticated address
 */
export function getFromAddress(): { name: string; address: string } {
  const rawFrom = (process.env.SMTP_FROM || '').trim().replace(/^['"]+|['"]+$/g, '')
  if (rawFrom) {
    const match = rawFrom.match(/^(.*?)\s*<(.+?)>$/)
    if (match) {
      const name = match[1].trim().replace(/^['"]+|['"]+$/g, '') || 'Research Track'
      const address = match[2].trim().replace(/^['"]+|['"]+$/g, '')
      return { name, address }
    }
    if (rawFrom.includes('@')) {
      return { name: 'Research Track', address: rawFrom }
    }
  }

  if (smtpUser) {
    return { name: 'Research Track', address: smtpUser }
  }

  return { name: 'Research Track', address: 'notifications@researchtrack.app' }
}

/**
 * Dispatch an automated email with optional iCal calendar attachment
 */
export async function sendEmail({ to, subject, html, text, icalEvent }: EmailPayload): Promise<boolean> {
  try {
    const transport = getTransporter()
    const fromObj = getFromAddress()

    const mailOptions: nodemailer.SendMailOptions = {
      from: {
        name: fromObj.name,
        address: fromObj.address,
      },
      replyTo: fromObj.address,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim(),
      headers: {
        'X-Entity-Ref-ID': crypto.randomUUID(),
        'X-Auto-Response-Suppress': 'OOF, AutoReply',
      },
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
        <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6;">
          Your supervisor <strong style="color: #38bdf8;">${supervisorName}</strong> has assigned you a new paper to read and analyze:
        </p>

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
  presenterName,
  meetingTitle,
  scheduledTimeFormatted,
  actionItems,
  meetingUrl,
  googleCalendarUrl,
  icalContent,
  scopeType = 'ONE_ON_ONE',
  labOrGroupName,
}: {
  toEmail: string
  recipientName: string
  organizerName: string
  presenterName?: string
  meetingTitle: string
  scheduledTimeFormatted: string
  actionItems?: string
  meetingUrl: string
  googleCalendarUrl?: string
  icalContent?: string
  scopeType?: 'ONE_ON_ONE' | 'LAB_WIDE' | 'SUB_GROUP' | 'JOURNAL_CLUB' | 'SEMINAR_LAB' | 'SEMINAR_GROUP' | 'SEMINAR_INDIVIDUAL'
  labOrGroupName?: string
}) {
  let headerIcon = '🤝'
  let headerTitle = '1-on-1 Advisor Session'
  let subHeader = 'ResearchTrack Advisor Check-in Hub'
  let introText = `A 1-on-1 research check-in has been scheduled with <strong style="color: #38bdf8;">${organizerName}</strong>:`
  let subjectTitle = `🤝 1-on-1 Meeting Scheduled: "${meetingTitle}" with ${organizerName}`
  let buttonText = 'Open Meeting Workspace &rarr;'
  let accentColor = '#a855f7'

  if (scopeType === 'LAB_WIDE') {
    headerIcon = '🏛️'
    headerTitle = 'Lab-Wide Research Meeting'
    subHeader = labOrGroupName || 'ResearchTrack Virtual Lab Hub'
    introText = `A lab-wide research meeting has been scheduled by <strong style="color: #38bdf8;">${organizerName}</strong>:`
    subjectTitle = `🏛️ Lab-Wide Meeting Scheduled: "${meetingTitle}" (${subHeader})`
    accentColor = '#0284c7'
  } else if (scopeType === 'SUB_GROUP') {
    headerIcon = '🔬'
    headerTitle = 'Sub-Group Research Meeting'
    subHeader = labOrGroupName ? `${labOrGroupName} Cluster` : 'Sub-Group Research Cluster'
    introText = `A research sub-group meeting for <strong style="color: #38bdf8;">${subHeader}</strong> has been scheduled by ${organizerName}:`
    subjectTitle = `🔬 Sub-Group Meeting Scheduled: "${meetingTitle}" (${subHeader})`
    accentColor = '#06b6d4'
  } else if (scopeType === 'SEMINAR_LAB' || scopeType === 'JOURNAL_CLUB') {
    headerIcon = '🎤'
    headerTitle = 'Lab Presentation Seminar'
    subHeader = labOrGroupName ? `${labOrGroupName} Seminar` : 'Lab Research Seminar'
    introText = `A lab presentation seminar has been scheduled by <strong style="color: #38bdf8;">${organizerName}</strong>:`
    subjectTitle = `🎤 Lab Presentation Seminar: "${meetingTitle}"`
    buttonText = 'Launch Presentation Slides &rarr;'
    accentColor = '#f59e0b'
  } else if (scopeType === 'SEMINAR_GROUP') {
    headerIcon = '🎤'
    headerTitle = 'Sub-Group Presentation Seminar'
    subHeader = labOrGroupName ? `${labOrGroupName} Seminar` : 'Sub-Group Research Seminar'
    introText = `A sub-group presentation seminar for <strong style="color: #38bdf8;">${subHeader}</strong> has been scheduled by ${organizerName}:`
    subjectTitle = `🎤 Sub-Group Presentation Seminar: "${meetingTitle}" (${subHeader})`
    buttonText = 'Launch Presentation Slides &rarr;'
    accentColor = '#f59e0b'
  } else if (scopeType === 'SEMINAR_INDIVIDUAL') {
    headerIcon = '🎤'
    headerTitle = 'Individual Presentation Seminar'
    subHeader = labOrGroupName ? `${labOrGroupName} Seminar` : 'Individual Research Seminar'
    introText = `An individual presentation seminar has been scheduled with <strong style="color: #38bdf8;">${organizerName}</strong>:`
    subjectTitle = `🎤 Individual Presentation Seminar: "${meetingTitle}"`
    buttonText = 'Launch Presentation Slides &rarr;'
    accentColor = '#f59e0b'
  }

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #0f172a; color: #f8fafc; border-radius: 16px;">
      <div style="text-align: center; padding-bottom: 20px; border-b: 1px solid #334155;">
        <h1 style="color: #38bdf8; margin: 0; font-size: 24px; font-weight: 800;">${headerIcon} ${headerTitle}</h1>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">${subHeader}</p>
      </div>

      <div style="padding: 24px 0;">
        <h2 style="font-size: 18px; color: #f8fafc; margin-bottom: 12px;">Hi ${recipientName},</h2>
        <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6;">
          ${introText}
        </p>

        <div style="background-color: #1e293b; border-left: 4px solid ${accentColor}; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 8px 0; color: #f8fafc; font-size: 16px;">📖 ${meetingTitle}</h3>
          <p style="margin: 0; color: #e2e8f0; font-size: 14px;"><strong>Time:</strong> ${scheduledTimeFormatted}</p>
          ${presenterName ? `<p style="margin: 8px 0 0 0; color: #fbbf24; font-size: 13.5px;"><strong>🎤 Presenter:</strong> ${presenterName}</p>` : ''}
          ${actionItems ? `<p style="margin: 12px 0 0 0; color: #cbd5e1; font-size: 13px;"><strong>📋 Agenda & Discussion Topics:</strong><br/>${actionItems.replace(/\n/g, '<br/>')}</p>` : ''}
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${meetingUrl}" style="background-color: ${accentColor}; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 14px;">${buttonText}</a>
          ${
            googleCalendarUrl
              ? `<div style="margin-top: 12px;"><a href="${googleCalendarUrl}" style="color: #38bdf8; font-size: 13px; text-decoration: underline;">📅 Add to Google Calendar (with 1h, 30m, 10m alarms)</a></div>`
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
    subject: subjectTitle,
    html,
    icalEvent: icalContent,
  })
}

/**
 * Dispatch automated "Paper of the Day" HTML Email with Selectable Theme (Dark / Light)
 */
export async function sendPaperOfTheDayEmail({
  toEmail,
  recipientName,
  paperTitle,
  authors,
  doi,
  abstract,
  journal,
  year,
  paperUrl,
  pdfUrl,
  score,
  topics,
  theme = 'DARK',
}: {
  toEmail: string
  recipientName: string
  paperTitle: string
  authors: string
  doi: string
  abstract?: string | null
  journal?: string | null
  year?: number | null
  paperUrl?: string | null
  pdfUrl?: string | null
  score?: string | null
  topics?: string[] | null
  theme?: 'DARK' | 'LIGHT' | string
}): Promise<boolean> {
  const cleanDoi = doi.replace(/^https?:\/\/doi\.org\//i, '').trim()
  const doiUrl = cleanDoi.startsWith('http') ? cleanDoi : `https://doi.org/${cleanDoi}`
  const targetReadUrl = paperUrl || doiUrl
  const venueString = [journal || 'Research Publication', year || new Date().getFullYear()].join(' • ')

  // Format authors to show top 4 + remaining count if many
  let authorDisplay = authors
  const authorList = authors.split(',').map((a) => a.trim()).filter(Boolean)
  if (authorList.length > 4) {
    authorDisplay = `${authorList.slice(0, 4).join(', ')} +${authorList.length - 4}`
  }

  const hasTopics = Array.isArray(topics) && topics.length > 0
  const topicsList = hasTopics ? topics : []

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: '2-digit',
    year: 'numeric',
  })

  const isLight = theme === 'LIGHT'

  // Theme palettes
  const bgBody = isLight ? '#f8fafc' : '#0b0f19'
  const bgCard = isLight ? '#ffffff' : '#111827'
  const borderCard = isLight ? '#e2e8f0' : '#1f2937'
  const textPrimary = isLight ? '#0f172a' : '#f8fafc'
  const textSecondary = isLight ? '#475569' : '#94a3b8'
  const textMuted = isLight ? '#64748b' : '#64748b'
  const spineColor = '#6366f1' // Indigo
  const titleColor = isLight ? '#2563eb' : '#60a5fa'
  const tagBg = isLight ? '#f1f5f9' : '#1e293b'
  const tagBorder = isLight ? '#cbd5e1' : '#334155'
  const tagText = isLight ? '#334155' : '#cbd5e1'
  const divider = isLight ? '#f1f5f9' : '#1f2937'

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 24px; background-color: ${bgBody}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: ${textSecondary};">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 620px; margin: 0 auto;">
          
          <!-- Top Tagline -->
          <tr>
            <td style="padding-bottom: 14px; font-size: 13.5px; color: ${textPrimary}; line-height: 1.5;">
              📬 <strong>Paper of the Day</strong> is here! Read it and explore more at 👉 <a href="${targetReadUrl}" style="color: ${titleColor}; text-decoration: underline; font-weight: 600;">ResearchTrack Daily Spotlight</a>
            </td>
          </tr>

          <!-- Main Research Card Container -->
          <tr>
            <td style="background-color: ${bgCard}; border-left: 5px solid ${spineColor}; border-top: 1px solid ${borderCard}; border-right: 1px solid ${borderCard}; border-bottom: 1px solid ${borderCard}; border-radius: 12px; padding: 24px; box-shadow: ${isLight ? '0 4px 12px rgba(0,0,0,0.05)' : '0 4px 20px rgba(0,0,0,0.4)'};">
              
              <!-- 1. Paper Title (First) -->
              <div style="margin-bottom: 8px; line-height: 1.45;">
                <a href="${targetReadUrl}" style="font-size: 18px; font-weight: 700; color: ${titleColor}; text-decoration: none; display: inline-block;">
                  📄 ${paperTitle}
                </a>
              </div>

              <!-- 2. Authors Header (Second) -->
              <div style="font-size: 13px; font-weight: 600; color: ${textSecondary}; margin-bottom: 14px; letter-spacing: -0.1px;">
                By ${authorDisplay}
              </div>

              <!-- 3. Abstract Snippet -->
              ${
                abstract
                  ? `<div style="font-size: 13px; color: ${textSecondary}; line-height: 1.65; margin-bottom: 18px;">
                      ${abstract.length > 380 ? abstract.slice(0, 380).trim() + '...' : abstract}
                    </div>`
                  : ''
              }

              <!-- 4. Venue & Optional Score Stats Grid -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: ${hasTopics ? '16px' : '8px'}; border-top: 1px solid ${divider}; padding-top: 14px;">
                <tr>
                  <td width="${score ? '55%' : '100%'}" valign="top">
                    <div style="font-size: 11px; font-weight: 700; color: ${textPrimary}; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px;">Venue</div>
                    <div style="font-size: 13px; color: ${textSecondary}; font-weight: 500;">${venueString}</div>
                  </td>
                  ${
                    score
                      ? `<td width="45%" valign="top">
                          <div style="font-size: 11px; font-weight: 700; color: ${textPrimary}; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px;">Impact Score</div>
                          <div style="font-size: 13px; color: #f59e0b; font-weight: 700;">⭐ ${score}</div>
                        </td>`
                      : ''
                  }
                </tr>
              </table>

              <!-- 5. Optional Topics Tags (All Topics Included) -->
              ${
                hasTopics
                  ? `<div style="margin-bottom: 20px;">
                      <div style="font-size: 11px; font-weight: 700; color: ${textPrimary}; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Topics</div>
                      <div>
                        ${topicsList
                          .map(
                            (t) =>
                              `<span style="display: inline-block; background-color: ${tagBg}; color: ${tagText}; border: 1px solid ${tagBorder}; padding: 3px 9px; border-radius: 6px; font-size: 11px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; margin-right: 6px; margin-bottom: 6px; font-weight: 500;">${t}</span>`
                          )
                          .join('')}
                      </div>
                    </div>`
                  : ''
              }

              <!-- 6. Footer Meta & Action Links -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top: 1px solid ${divider}; padding-top: 14px;">
                <tr>
                  <td valign="middle" style="font-size: 11.5px; color: ${textMuted};">
                    🔭 ResearchTrack • Paper of the Day • ${todayFormatted}
                  </td>
                  <td align="right" valign="middle">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-right: 8px;">
                          <a href="${targetReadUrl}" style="background-color: #2563eb; color: #ffffff; padding: 7px 15px; border-radius: 6px; font-weight: 700; font-size: 12px; text-decoration: none; display: inline-block;">
                            Open Paper &rarr;
                          </a>
                        </td>
                        ${
                          pdfUrl
                            ? `<td>
                                <a href="${pdfUrl}" style="background-color: ${tagBg}; color: ${tagText}; border: 1px solid ${tagBorder}; padding: 6px 11px; border-radius: 6px; font-weight: 600; font-size: 12px; text-decoration: none; display: inline-block;">
                                  PDF
                                </a>
                              </td>`
                            : ''
                        }
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

        </table>
      </body>
    </html>
  `

  const plainText = [
    `📬 Paper of the Day: ${paperTitle}`,
    `By ${authorDisplay}`,
    '',
    abstract ? `Abstract:\n${abstract}` : '',
    '',
    `Venue: ${venueString}`,
    score ? `Impact Score: ${score}` : '',
    hasTopics ? `Topics: ${topicsList.join(', ')}` : '',
    '',
    `Read full paper: ${targetReadUrl}`,
    pdfUrl ? `PDF link: ${pdfUrl}` : '',
    '',
    `---\nResearchTrack Academic Research Platform`
  ].filter(Boolean).join('\n')

  return sendEmail({
    to: toEmail,
    subject: `📰 Paper of the Day: "${paperTitle}"`,
    html,
    text: plainText,
  })
}

/**
 * Dispatch automated Two-Factor Authentication (2FA) 6-digit OTP code via SMTP
 */
export async function sendTwoFactorOtpEmail({
  toEmail,
  recipientName,
  code,
  ip,
}: {
  toEmail: string
  recipientName?: string
  code: string
  ip?: string
}): Promise<boolean> {
  const name = recipientName || 'Researcher'
  const timeString = new Date().toUTCString()

  console.log(`🔐 [2FA SMTP DISPATCH] Sending OTP ${code} to ${toEmail}...`)

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 24px; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #94a3b8;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; margin: 0 auto;">
          <tr>
            <td style="background-color: #111827; border: 1px solid #1f2937; border-top: 4px solid #06b6d4; border-radius: 12px; padding: 32px 28px; box-shadow: 0 4px 20px rgba(0,0,0,0.4);">
              
              <!-- Header -->
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 12px; background-color: rgba(6, 182, 212, 0.15); border: 1px solid rgba(6, 182, 212, 0.3); margin-bottom: 12px;">
                  <span style="font-size: 24px;">🔐</span>
                </div>
                <h1 style="color: #f8fafc; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.3px;">Two-Step Verification Code</h1>
                <p style="color: #64748b; font-size: 13px; margin-top: 4px;">ResearchTrack Security Hub</p>
              </div>

              <!-- Body text -->
              <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6; margin-bottom: 20px;">
                Hello <strong>${name}</strong>,<br/>
                We received a request to sign in to your ResearchTrack account. Use the verification code below to complete your authentication:
              </p>

              <!-- OTP Code Display Card -->
              <div style="background-color: #0d1117; border: 1px solid #334155; border-radius: 10px; padding: 20px; text-align: center; margin: 24px 0;">
                <div style="font-size: 11px; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                  Your 6-Digit Sign-In Code
                </div>
                <div style="font-size: 34px; font-weight: 800; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; letter-spacing: 8px; color: #f8fafc; padding: 4px 0;">
                  ${code}
                </div>
                <div style="font-size: 12px; color: #94a3b8; margin-top: 8px;">
                  ⏱️ Valid for <strong>10 minutes</strong>
                </div>
              </div>

              <!-- Metadata & Warning -->
              <div style="background-color: rgba(30, 41, 59, 0.6); border: 1px solid #1e293b; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                <div>📍 <strong>IP Address:</strong> ${ip || 'Direct login'}</div>
                <div>🕒 <strong>Requested:</strong> ${timeString}</div>
              </div>

              <p style="font-size: 12.5px; color: #64748b; line-height: 1.5; margin-bottom: 0;">
                🔒 If you did not attempt to sign in, your account password may still be secure, but you should verify your credentials or change your password immediately.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 20px; text-align: center; font-size: 11.5px; color: #475569;">
              ResearchTrack Academic Research Platform • Automated Security Message
            </td>
          </tr>
        </table>
      </body>
    </html>
  `

  const text = `ResearchTrack Two-Step Verification Code\n\nYour 6-digit sign-in code is: ${code}\n\nThis code is valid for 10 minutes.\nRequested at: ${timeString}\nIP Address: ${ip || 'Direct login'}\n\nIf you did not request this, please verify your credentials immediately.`

  return sendEmail({
    to: toEmail,
    subject: `🔐 Your ResearchTrack Verification Code: ${code}`,
    html,
    text,
  })
}

/**
 * Dispatch automated Password Reset 6-digit OTP code via SMTP
 */
export async function sendPasswordResetOtpEmail({
  toEmail,
  recipientName,
  code,
  ip,
}: {
  toEmail: string
  recipientName?: string
  code: string
  ip?: string
}): Promise<boolean> {
  const name = recipientName || 'Researcher'
  const timeString = new Date().toUTCString()

  console.log(`🔑 [PASSWORD RESET SMTP DISPATCH] Sending Reset Code ${code} to ${toEmail}...`)

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 24px; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #94a3b8;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; margin: 0 auto;">
          <tr>
            <td style="background-color: #111827; border: 1px solid #1f2937; border-top: 4px solid #f59e0b; border-radius: 12px; padding: 32px 28px; box-shadow: 0 4px 20px rgba(0,0,0,0.4);">
              
              <!-- Header -->
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 12px; background-color: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); margin-bottom: 12px;">
                  <span style="font-size: 24px;">🔑</span>
                </div>
                <h1 style="color: #f8fafc; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.3px;">Password Reset Request</h1>
                <p style="color: #64748b; font-size: 13px; margin-top: 4px;">ResearchTrack Account Recovery</p>
              </div>

              <!-- Body text -->
              <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6; margin-bottom: 20px;">
                Hello <strong>${name}</strong>,<br/>
                We received a request to reset your ResearchTrack password. Enter the 6-digit recovery code below on the password reset screen:
              </p>

              <!-- OTP Code Display Card -->
              <div style="background-color: #0d1117; border: 1px solid #334155; border-radius: 10px; padding: 20px; text-align: center; margin: 24px 0;">
                <div style="font-size: 11px; font-weight: 700; color: #f59e0b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                  Password Reset Code
                </div>
                <div style="font-size: 34px; font-weight: 800; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; letter-spacing: 8px; color: #f8fafc; padding: 4px 0;">
                  ${code}
                </div>
                <div style="font-size: 12px; color: #94a3b8; margin-top: 8px;">
                  ⏱️ Expires in <strong>15 minutes</strong>
                </div>
              </div>

              <!-- Metadata & Warning -->
              <div style="background-color: rgba(30, 41, 59, 0.6); border: 1px solid #1e293b; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                <div>📍 <strong>IP Address:</strong> ${ip || 'Direct reset request'}</div>
                <div>🕒 <strong>Requested:</strong> ${timeString}</div>
              </div>

              <div style="background-color: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; border-radius: 6px; padding: 10px 14px; margin-bottom: 20px;">
                <p style="font-size: 12px; color: #fca5a5; line-height: 1.5; margin: 0;">
                  ⚠️ <strong>Didn't request a password reset?</strong> If you didn't ask to reset your password, you can safely ignore this email. No changes will be made to your account.
                </p>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 20px; text-align: center; font-size: 11.5px; color: #475569;">
              ResearchTrack Academic Research Platform • Account Recovery Service
            </td>
          </tr>
        </table>
      </body>
    </html>
  `

  const text = `ResearchTrack Password Reset Request\n\nYour 6-digit password reset code is: ${code}\n\nThis code expires in 15 minutes.\nRequested at: ${timeString}\nIP Address: ${ip || 'Direct reset request'}\n\nIf you did not request a password reset, you can safely ignore this email.`

  return sendEmail({
    to: toEmail,
    subject: `🔑 Your ResearchTrack Password Reset Code: ${code}`,
    html,
    text,
  })
}




