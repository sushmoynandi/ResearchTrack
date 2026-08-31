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

    let fromAddress: string | { name: string; address: string } = smtpFrom
    if (process.env.SMTP_FROM) {
      fromAddress = process.env.SMTP_FROM
    } else if (smtpUser) {
      fromAddress = { name: 'Research Track', address: smtpUser }
    }

    const mailOptions: nodemailer.SendMailOptions = {
      from: fromAddress,
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
 * Dispatch automated "Paper of the Day" HTML Email matching the ResearchScope reference design
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
}): Promise<boolean> {
  const cleanDoi = doi.replace(/^https?:\/\/doi\.org\//i, '').trim()
  const doiUrl = cleanDoi.startsWith('http') ? cleanDoi : `https://doi.org/${cleanDoi}`
  const targetReadUrl = paperUrl || doiUrl
  const venueString = [journal || 'arXiv', year || new Date().getFullYear()].join(' • ')
  const formattedScore = score || '9.2/10'
  const topicsList = Array.isArray(topics) && topics.length > 0
    ? topics.slice(0, 4)
    : ['Computer Vision', 'Foundation Models', 'Machine Learning']

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: '2-digit',
    year: 'numeric',
  })

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #0b0f19; color: #f1f5f9; border-radius: 16px;">
      
      {/* Top Banner Tag */}
      <div style="margin-bottom: 14px; font-size: 13.5px; color: #f8fafc;">
        📬 <strong>Paper of the Day</strong> is here! Read it and explore more at 👉 <a href="${targetReadUrl}" style="color: #38bdf8; text-decoration: underline; font-weight: 600;">ResearchTrack Daily Spotlight</a>
      </div>

      {/* Main Research Card */}
      <div style="background-color: #111827; border-left: 4px solid #6366f1; padding: 20px; border-radius: 12px; border-top: 1px solid #1f2937; border-right: 1px solid #1f2937; border-bottom: 1px solid #1f2937;">
        
        {/* Authors Header */}
        <div style="font-size: 13.5px; font-weight: 700; color: #e2e8f0; margin-bottom: 10px;">
          ${authors}
        </div>

        {/* Paper Title */}
        <h2 style="margin: 0 0 12px 0; font-size: 17px; font-weight: 700; line-height: 1.45;">
          <a href="${targetReadUrl}" style="color: #60a5fa; text-decoration: none;">
            📄 ${paperTitle}
          </a>
        </h2>

        {/* Abstract */}
        ${
          abstract
            ? `<p style="font-size: 13px; color: #94a3b8; line-height: 1.6; margin: 0 0 16px 0;">
                ${abstract.length > 400 ? abstract.slice(0, 400) + '...' : abstract}
              </p>`
            : ''
        }

        {/* Venue & Score Stats Grid */}
        <div style="display: flex; gap: 40px; margin-bottom: 14px; padding-top: 14px; border-top: 1px solid #1f2937;">
          <div>
            <div style="font-size: 11px; font-weight: 700; color: #f8fafc; text-transform: uppercase; letter-spacing: 0.5px;">Venue</div>
            <div style="font-size: 13px; color: #94a3b8; margin-top: 2px;">${venueString}</div>
          </div>

          <div>
            <div style="font-size: 11px; font-weight: 700; color: #f8fafc; text-transform: uppercase; letter-spacing: 0.5px;">Score</div>
            <div style="font-size: 13px; color: #fbbf24; font-weight: 700; margin-top: 2px;">⭐ ${formattedScore}</div>
          </div>
        </div>

        {/* Topics Chips */}
        <div style="margin-bottom: 16px;">
          <div style="font-size: 11px; font-weight: 700; color: #f8fafc; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Topics</div>
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            ${topicsList
              .map(
                (t) =>
                  `<span style="display: inline-block; background-color: #1e293b; color: #cbd5e1; border: 1px solid #334155; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-family: monospace;">${t}</span>`
              )
              .join(' ')}
          </div>
        </div>

        {/* Action Button & Footer Subtext */}
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; padding-top: 14px; border-top: 1px solid #1f2937;">
          <div style="font-size: 11.5px; color: #64748b;">
            🔭 ResearchTrack • Paper of the Day • ${todayFormatted}
          </div>

          <div style="display: flex; gap: 8px;">
            <a href="${targetReadUrl}" style="background-color: #2563eb; color: #ffffff; padding: 8px 16px; border-radius: 6px; font-weight: 700; font-size: 12.5px; text-decoration: none; display: inline-block;">
              Open Paper &rarr;
            </a>
            ${
              pdfUrl
                ? `<a href="${pdfUrl}" style="background-color: #1e293b; color: #cbd5e1; border: 1px solid #334155; padding: 8px 12px; border-radius: 6px; font-weight: 600; font-size: 12.5px; text-decoration: none; display: inline-block;">
                    PDF
                  </a>`
                : ''
            }
          </div>
        </div>

      </div>

      {/* Email Footer */}
      <div style="margin-top: 16px; text-align: center; font-size: 11.5px; color: #64748b;">
        ResearchTrack Academic Operating System • Automated Daily Spotlight
      </div>
    </div>
  `

  return sendEmail({
    to: toEmail,
    subject: `📰 Paper of the Day: "${paperTitle}"`,
    html,
  })
}


