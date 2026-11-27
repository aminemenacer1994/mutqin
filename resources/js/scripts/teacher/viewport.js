import { onMounted, onUnmounted, ref } from 'vue'

/** Matches `TeacherNav` desktop/mobile swap in `TeacherDashboard.css` (991.98px). */
export const TEACHER_SHELL_MOBILE_MQ = '(max-width: 991.98px)'

export function readTeacherMobileShell() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia(TEACHER_SHELL_MOBILE_MQ).matches
}

export function teacherViewportLabel(mobile = readTeacherMobileShell()) {
  return mobile ? 'mobile' : 'desktop'
}

/** Reactive shell viewport for teacher workspace — separate mobile UX from desktop UX. */
export function useTeacherViewport() {
  const isMobileShell = ref(readTeacherMobileShell())
  const viewport = ref(teacherViewportLabel(isMobileShell.value))
  let mq = null

  const sync = () => {
    const mobile = readTeacherMobileShell()
    isMobileShell.value = mobile
    viewport.value = teacherViewportLabel(mobile)
  }

  onMounted(() => {
    mq = window.matchMedia(TEACHER_SHELL_MOBILE_MQ)
    if (mq.addEventListener) mq.addEventListener('change', sync)
    else mq.addListener(sync)
    window.addEventListener('resize', sync)
    sync()
  })

  onUnmounted(() => {
    if (!mq) return
    if (mq.removeEventListener) mq.removeEventListener('change', sync)
    else mq.removeListener(sync)
    window.removeEventListener('resize', sync)
  })

  return { isMobileShell, viewport, syncViewport: sync }
}