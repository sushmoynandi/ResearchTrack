/**
 * YouTube link handling for the "How to Use" tutorial videos.
 *
 * An administrator pastes whatever link YouTube gave them — a normal watch
 * link, a share link, a Shorts link, an embed link, or a bare id. Everything
 * downstream (the player, the thumbnail) needs only the 11-character video id,
 * so it is parsed once when the video is saved and stored alongside the link.
 */

/** Pull the 11-character video id out of any YouTube link. Null if it isn't one. */
export function parseYouTubeId(input: string): string | null {
  const raw = (input || '').trim()
  if (!raw) return null

  // Already just an id
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`

  let url: URL
  try {
    url = new URL(withProtocol)
  } catch {
    return null
  }

  const host = url.hostname.replace(/^www\./i, '').toLowerCase()
  const isYouTube =
    host === 'youtube.com' ||
    host === 'm.youtube.com' ||
    host === 'music.youtube.com' ||
    host === 'youtube-nocookie.com' ||
    host === 'youtu.be'

  if (!isYouTube) return null

  // youtu.be/<id>
  if (host === 'youtu.be') {
    return validId(url.pathname.split('/')[1])
  }

  // youtube.com/watch?v=<id>
  const v = url.searchParams.get('v')
  if (v) return validId(v)

  // youtube.com/embed/<id>, /shorts/<id>, /live/<id>, /v/<id>
  const segments = url.pathname.split('/').filter(Boolean)
  if (segments.length >= 2 && ['embed', 'shorts', 'live', 'v'].includes(segments[0])) {
    return validId(segments[1])
  }

  return null
}

function validId(candidate?: string): string | null {
  if (!candidate) return null
  const id = candidate.split(/[?&#]/)[0]
  return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null
}

/** The privacy-friendly embed URL the player iframe loads. */
export function youTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`
}

/** Preview image for a video, used before the player is opened. */
export function youTubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
}

/** The normal watch link, for the "Open on YouTube" fallback. */
export function youTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`
}
