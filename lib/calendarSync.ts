/**
 * Calendar Sync Utilities (Google Calendar, Outlook Live, Apple Calendar & iCal .ics file generator)
 */

export interface CalendarEventParams {
  title: string
  description?: string
  location?: string
  startDate: Date | string
  endDate?: Date | string
  url?: string
}

function formatDateToIcsString(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

function formatGoogleDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

/**
 * Generate iCalendar RFC 5545 `.ics` file content
 */
export function generateIcsContent(event: CalendarEventParams): string {
  const start = new Date(event.startDate)
  const end = event.endDate ? new Date(event.endDate) : new Date(start.getTime() + 60 * 60 * 1000)
  const now = new Date()

  const uid = `rt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@researchtrack.app`

  const cleanDescription = (event.description || '')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')

  const cleanTitle = (event.title || 'Research Meeting').replace(/,/g, '\\,')

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ResearchTrack//Academic Research Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
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
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n')
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
  if (event.url) {
    details += `\n\nPaper/Meeting Link: ${event.url}`
  }

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: datesParam,
    details: details.trim(),
    location: event.location || 'ResearchTrack Portal',
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
  if (event.url) {
    body += `\n\nLink: ${event.url}`
  }

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    startdt: start.toISOString(),
    enddt: end.toISOString(),
    body: body.trim(),
    location: event.location || 'ResearchTrack Portal',
  })

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
}
