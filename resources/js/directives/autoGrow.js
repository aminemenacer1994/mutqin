// Size only the edited composer, including after a draft is restored or cleared.
const fields = new WeakMap()

function schedule(field) {
  const state = fields.get(field)
  if (!state || state.frame) return
  state.frame = requestAnimationFrame(() => {
    state.frame = 0
    if (!field.isConnected || !field.clientWidth) return
    const style = getComputedStyle(field)
    const minimum = parseFloat(style.minHeight) || 44
    const maximum = parseFloat(style.maxHeight) || 192
    field.style.height = 'auto'
    const content = field.scrollHeight + (parseFloat(style.borderTopWidth) || 0) + (parseFloat(style.borderBottomWidth) || 0)
    field.style.height = `${Math.min(maximum, Math.max(minimum, content))}px`
    field.style.overflowY = content > maximum ? 'auto' : 'hidden'
    state.value = field.value
  })
}

export default {
  mounted(field) {
    const state = { frame: 0, value: null, width: 0, input: () => schedule(field) }
    fields.set(field, state)
    field.addEventListener('input', state.input)
    if (typeof ResizeObserver !== 'undefined') {
      state.observer = new ResizeObserver(([entry]) => {
        if (entry.contentRect.width !== state.width) {
          state.width = entry.contentRect.width
          schedule(field)
        }
      })
      state.observer.observe(field)
    }
    schedule(field)
  },
  updated(field) { if (fields.get(field)?.value !== field.value) schedule(field) },
  beforeUnmount(field) {
    const state = fields.get(field)
    if (!state) return
    field.removeEventListener('input', state.input)
    state.observer?.disconnect()
    cancelAnimationFrame(state.frame)
    fields.delete(field)
  },
}
