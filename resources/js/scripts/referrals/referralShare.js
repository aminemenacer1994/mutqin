import {
  canUseNativeShare,
  copyToClipboard,
  shareOrCopy,
  whatsappShareHref,
} from '../articles/articleShare.js'

export { canUseNativeShare, copyToClipboard, shareOrCopy, whatsappShareHref }

export function emailShareHref({ subject, body }) {
  const mailSubject = encodeURIComponent(String(subject || '').trim())
  const mailBody = encodeURIComponent(String(body || '').trim())
  if (!mailSubject && !mailBody) return ''
  return `mailto:?subject=${mailSubject}&body=${mailBody}`
}

export function canUseEmailShare() {
  return typeof window !== 'undefined'
}
