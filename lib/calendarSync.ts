/**
 * Calendar Sync Utilities (Google Calendar, Outlook Live, Apple Calendar & iCal .ics file generator)
 * Supports RFC 5545 Multi-Stage Reminders (VALARM triggers at -PT60M, -PT30M, -PT10M) and Live WebCal Feeds
 */

export interface CalendarEventParams {
  title: string
  description?: string
  location?: string
  startDate: Date | string
  endDate?: Date | string
  url?: string
  attendeeEmail?: string
  /** Alarm notification intervals in minutes before event. Default: [60, 30, 10] (1 hr, 30 min, 10 min) */
  alarms?: number[]
}

function formatDateToIcsString(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

function formatGoogleDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

/**
 * Generate a single VEVENT block with multi-stage VALARM triggers
 */
export function generateVEventBlock(event: CalendarEventParams): string {
  const start = new Date(event.startDate)
  const end = event.endDate ? new Date(event.endDate) : new Date(start.getTime() + 60 * 60 * 1000)
  const now = new Date()

  const uid = `rt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@researchtrack.app`

  const cleanDescription = (event.description || '')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')

  const cleanTitle = (event.title || 'Research Session').replace(/,/g, '\\,')

  // Multi-stage reminder notifications (60m, 30m, 10m before event: Popup Push + Mandatory Email)
  const alarmMinutes = event.alarms ?? [60, 30, 10]
  const alarmBlocks = alarmMinutes.flatMap((mins) => {
    const displayAlarm = [
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:Reminder: ${mins} minutes before ${cleanTitle}`,
      `TRIGGER:-PT${mins}M`,
      'END:VALARM',
    ].join('\r\n')

    const emailAlarmLines = [
      'BEGIN:VALARM',
      'ACTION:EMAIL',
      `SUMMARY:Email Reminder: ${mins} minutes before ${cleanTitle}`,
      `DESCRIPTION:Upcoming research session reminder for ${cleanTitle}`,
      event.attendeeEmail ? `ATTENDEE:mailto:${event.attendeeEmail}` : '',
      `TRIGGER:-PT${mins}M`,
      'END:VALARM',
    ].filter(Boolean).join('\r\n')

    return [displayAlarm, emailAlarmLines]
  })

  const lines = [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatDateToIcsString(now)}`,
    `DTSTART:${formatDateToIcsString(start)}`,
    `DTEND:${formatDateToIcsString(end)}`,
    `SUMMARY:${cleanTitle}`,
    cleanDescription ? `DESCRIPTION:${cleanDescription}` : '',
    event.location ? `LOCATION:${event.location.replace(/,/g, '\\,')}` : '',
    event.url ? `URL:${event.url}` : '',
    'STATUS:CONFIRMED',
    ...alarmBlocks,
    'END:VEVENT',
  ].filter(Boolean)

  return lines.join('\r\n')
}

/**
 * Generate iCalendar RFC 5545 `.ics` file content with 1-hr, 30-min, 10-min reminders
 */
export function generateIcsContent(event: CalendarEventParams): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ResearchTrack//Academic Research Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:ResearchTrack Schedule',
    generateVEventBlock(event),
    'END:VCALENDAR',
  ].join('\r\n')
}

/**
 * Generate multi-event iCalendar RFC 5545 feed content (for live WebCal subscription)
 */
export function generateMultiEventIcs(events: CalendarEventParams[], calendarName = 'ResearchTrack Academic Schedule'): string {
  const eventBlocks = events.map((evt) => generateVEventBlock(evt))

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ResearchTrack//Academic Research Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calendarName}`,
    'X-WR-TIMEZONE:UTC',
    'REFRESH-INTERVAL;VALUE=DURATION:PT15M',
    'X-PUBLISHED-TTL:PT15M',
    ...eventBlocks,
    'END:VCALENDAR',
  ].join('\r\n')
}

/**
 * Trigger immediate browser download of an `.ics` file
 */
export function downloadIcsFile(filename: string, icsContent: string) {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Generate a 1-click Google Calendar web creation URL
 */
export function getGoogleCalendarUrl(event: CalendarEventParams): string {
  const start = new Date(event.startDate)
  const end = event.endDate ? new Date(event.endDate) : new Date(start.getTime() + 60 * 60 * 1000)

  const datesParam = `${formatGoogleDate(start)}/${formatGoogleDate(end)}`

  let details = event.description || ''
  if (event.url && !details.includes(event.url)) {
    const isPaper = event.url.includes('/papers/') || (event.title && event.title.toLowerCase().includes('reading'))
    const linkLabel = isPaper ? 'Paper Link' : 'Meeting Link'
    details += `\n\n${linkLabel}: ${event.url}`
  }

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: datesParam,
    details: details.trim(),
    location: event.location || event.url || 'ResearchTrack Portal',
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/**
 * Generate a 1-click Outlook Live Calendar web creation URL
 */
export function getOutlookCalendarUrl(event: CalendarEventParams): string {
  const start = new Date(event.startDate)
  const end = event.endDate ? new Date(event.endDate) : new Date(start.getTime() + 60 * 60 * 1000)

  let body = event.description || ''
  if (event.url && !body.includes(event.url)) {
    const isPaper = event.url.includes('/papers/') || (event.title && event.title.toLowerCase().includes('reading'))
    const linkLabel = isPaper ? 'Paper Link' : 'Meeting Link'
    body += `\n\n${linkLabel}: ${event.url}`
  }

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    startdt: start.toISOString(),
    enddt: end.toISOString(),
    body: body.trim(),
    location: event.location || event.url || 'ResearchTrack Portal',
  })

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
}

/**
 * Generate a WebCal subscription URL for Apple Calendar and live calendar apps
 */
export function getWebcalFeedUrl(token: string, hostUrl?: string): string {
  const base = hostUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://www.researchtrack.tech')
  const cleanBase = base.replace(/^https?:\/\//i, '').replace(/\/$/, '')
  return `webcal://${cleanBase}/api/calendar/feed?token=${token}`
}

/**
 * Generate a 1-click Google Calendar Subscription Feed URL
 */
export function getGoogleCalendarFeedSubscribeUrl(token: string, hostUrl?: string): string {
  const webcal = getWebcalFeedUrl(token, hostUrl)
  return `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`
}
