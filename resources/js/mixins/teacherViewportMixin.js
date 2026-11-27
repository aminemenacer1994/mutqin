/** Injected from `TeacherDashboard` — unwraps Vue ref when present. */
export const teacherViewportMixin = {
  inject: {
    teacherIsMobileShell: { default: null },
  },
  computed: {
    mobileShell() {
      const v = this.teacherIsMobileShell
      if (v != null && typeof v === 'object' && 'value' in v) return Boolean(v.value)
      return Boolean(v)
    },
    desktopShell() {
      return !this.mobileShell
    },
  },
}