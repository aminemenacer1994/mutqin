import assert from 'node:assert/strict'
import {
  captureReadingPosition,
  restoreReadingPosition,
} from '../../resources/js/utils/modalFocus.js'

const reader = {
  scrollTop: 286,
  scrollLeft: 14,
  isConnected: true,
}
const workspace = {
  querySelectorAll(selector) {
    assert.match(selector, /mushaf-viewport-scroll/)
    return [reader]
  },
}
const doc = {
  documentElement: { scrollTop: 920, scrollLeft: 3 },
  getElementById(id) {
    return id === 'memorisationWorkspaceMain' ? workspace : null
  },
}
const scrollCalls = []
const scheduled = []
const win = {
  scrollX: 3,
  scrollY: 920,
  scrollTo(value) {
    scrollCalls.push(value)
    this.scrollX = value.left
    this.scrollY = value.top
  },
}

const snapshot = captureReadingPosition({ doc, win })
assert.equal(snapshot.window.top, 920)
assert.equal(snapshot.elements.length, 1)
assert.equal(snapshot.elements[0].top, 286)

// Simulate body-scroll lock and a reader DOM update while a modal is open.
win.scrollY = 0
reader.scrollTop = 0
reader.scrollLeft = 0

restoreReadingPosition(snapshot, {
  doc,
  win,
  schedule(callback) {
    scheduled.push(callback)
  },
})

assert.equal(win.scrollY, 920, 'page position restores immediately')
assert.equal(reader.scrollTop, 286, 'nested mushaf position restores immediately')
assert.equal(reader.scrollLeft, 14)
assert.equal(scheduled.length, 1, 'teardown gets a follow-up restore')

reader.scrollTop = 0
scheduled.shift()()
assert.equal(scheduled.length, 1, 'second frame is queued')
scheduled.shift()()
assert.equal(reader.scrollTop, 286, 'post-teardown frame restores exact reader position')
assert.equal(scrollCalls.length, 2, 'page restoration is repeated after teardown')

console.log('modal-reading-position.test.mjs: ok')
