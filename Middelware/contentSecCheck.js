const jwt = require('jsonwebtoken')


const extractYouTubeId = (url) => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

const extractDriveId = (url) => {
  const patterns = [
    /drive\.google\.com\/file\/d\/([^/]+)/,
    /drive\.google\.com\/open\?id=([^&]+)/,
    /docs\.google\.com\/.*\/d\/([^/]+)/
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

const detectUrlType = (url, contentType) => {
  if (contentType === 'video') {
    if (extractYouTubeId(url)) return 'youtube'
    return 'unknown_video'
  }
  if (contentType === 'pdf') {
    if (extractDriveId(url)) return 'google_drive'
    return 'direct_pdf'
  }
  if (contentType === 'link') return 'external_link'
  return 'unknown'
}

module.exports = { extractYouTubeId, extractDriveId, detectUrlType }