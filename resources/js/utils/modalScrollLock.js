// Each open overlay owns its lock. Closing an inactive sibling must not unlock
// the document underneath a dialog that is still on screen.
const locks = new Map()

export function setModalScrollLock(owner, locked, { dashboard = false } = {}) {
  if (!owner || typeof document === 'undefined') return
  if (locked) {
    locks.set(owner, { dashboard: Boolean(dashboard) })
  } else {
    if (!locks.has(owner)) return
    locks.delete(owner)
  }

  const dashboardLocked = [...locks.values()].some((lock) => lock.dashboard)
  document.body?.classList.toggle('modal-open', locks.size > 0)
  document.body?.classList.toggle('dash-drawer-open', dashboardLocked)
  document.documentElement?.classList.toggle('dash-drawer-open', dashboardLocked)
}
