import webpush from 'web-push'

export const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  process.env.VAPID_PUBLIC_KEY ||
  ''''

export const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ||
  ''''

export const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || 'mailto:support@researchtrack.io'

// Configure web-push details
try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
} catch (err) {
  console.warn('Notice setting VAPID details for web-push:', err)
}

export { webpush }
