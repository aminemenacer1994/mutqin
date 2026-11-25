import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import vm from 'node:vm'
import test from 'node:test'
import { reactive, computed, watch, effectScope } from 'vue'
import { parse as parseJavaScript } from '@babel/parser'

const root = process.cwd()

function classList() {
  const values = new Set()
  return { toggle(name, enabled) { enabled ? values.add(name) : values.delete(name) }, contains(name) { return values.has(name) } }
}

// Execute the production methods themselves without booting unrelated dashboard services.
async function actualMethod(relativeFile, methodName, dependencies = {}, exportName = 'default') {
  const file = await fs.readFile(path.join(root, relativeFile), 'utf8')
  const source = relativeFile.endsWith('.vue') ? file.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1] : file
  const tree = parseJavaScript(source, { sourceType: 'module' })
  let object
  if (exportName === 'default') {
    const component = tree.program.body.find(node => node.type === 'ExportDefaultDeclaration').declaration
    object = component.properties.find(node => node.key?.name === 'methods').value
  } else {
    const declaration = tree.program.body.find(node => node.type === 'ExportNamedDeclaration' && node.declaration?.declarations?.some(item => item.id?.name === exportName))
    object = declaration.declaration.declarations.find(node => node.id.name === exportName).init
  }
  const method = object.properties.find(node => node.key?.name === methodName)
  assert.ok(method, `${relativeFile}: production ${methodName} exists`)
  return new Function(...Object.keys(dependencies), `return ({${source.slice(method.start, method.end)}}).${methodName}`)(...Object.values(dependencies))
}

async function environment({ withoutRandomUUID = false } = {}) {
  let now = Date.UTC(2026, 10, 15, 12)
  let timerId = 0
  const timers = new Map()
  const savedDrafts = new Map()
  const revoked = []
  class ClockDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now])) }
    static now() { return now }
  }
  const setTimer = (callback, delay = 0) => { const id = ++timerId; timers.set(id, { callback, at: now + delay }); return id }
  const clearTimer = id => timers.delete(id)
  const document = { body: { classList: classList() }, documentElement: { classList: classList() } }
  const context = vm.createContext({
    console, Date: ClockDate, Math, JSON, Blob,
    crypto: withoutRandomUUID ? {} : { randomUUID: () => `client-message-${++timerId}` },
    URL: { createObjectURL: () => `blob:message-${++timerId}`, revokeObjectURL: url => revoked.push(url) },
    setTimeout: setTimer, clearTimeout: clearTimer, setInterval: setTimer, clearInterval: clearTimer,
    window: { setTimeout: setTimer, clearTimeout: clearTimer, setInterval: setTimer, clearInterval: clearTimer },
    document,
    sessionStorage: {
      getItem: key => savedDrafts.get(key) || null,
      setItem: (key, value) => savedDrafts.set(key, String(value)),
      removeItem: key => savedDrafts.delete(key),
    },
  })
  const cache = new Map()
  async function load(specifier, referrer = path.join(root, 'tests/js/teacher-message-recovery.test.mjs'), entry = false) {
    let filename = specifier.startsWith('@/') ? path.join(root, 'resources/js', specifier.slice(2)) : specifier.startsWith('.') ? path.resolve(path.dirname(referrer), specifier) : path.resolve(root, specifier)
    if (!path.extname(filename)) filename += '.js'
    const cacheKey = `${entry ? 'entry:' : ''}${filename}`
    if (cache.has(cacheKey)) return cache.get(cacheKey)
    const pending = (async () => {
    let source
    if (!entry && filename.endsWith('.vue')) source = 'export default {}'
    else if (filename.endsWith('/mixins/i18nMixin.js')) source = 'export const i18nMixin = {}'
    else if (filename.endsWith('/scripts/api/learning.js')) source = 'export const learningApi = {}'
    else if (filename.endsWith('/directives/autoGrow.js')) source = 'export default {}'
    else if (filename.endsWith('/scripts/audio/recordingPlayback.js')) source = `
      export function chooseSupportedRecorderMimeType() { return 'audio/webm' }
      export function createObjectUrlFromBlob(blob) { return URL.createObjectURL(blob) }
      export function extensionForMimeType() { return 'webm' }
      export function revokeObjectUrl(url) { if (url) URL.revokeObjectURL(url) }
      export async function stopMediaRecorderAndCollectBlob() { return new Blob() }
    `
    else if (filename.endsWith('.css')) source = 'export default {}'
    else {
      source = await fs.readFile(filename, 'utf8')
      if (filename.endsWith('.vue')) source = source.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1]
    }
    const module = new vm.SourceTextModule(source, { context, identifier: filename })
    await module.link(child => load(child, filename))
    await module.evaluate()
    return module
    })()
    cache.set(cacheKey, pending)
    return pending
  }
  const conversation = (await load('resources/js/components/teacher/TeacherTaskConversation.vue', undefined, true)).namespace.default
  const panel = (await load('resources/js/components/teacher/LearnerTaskThreadPanel.vue', undefined, true)).namespace.default
  const direct = (await load('resources/js/components/teacher/profile/TeacherStudentProfileMessages.vue', undefined, true)).namespace.default
  const scrollLock = (await load('resources/js/utils/modalScrollLock.js')).namespace.setModalScrollLock
  const api = (await load('resources/js/scripts/api/learning.js')).namespace.learningApi
  const threadHelpers = (await load('resources/js/scripts/teacher/learnerTaskThread.js')).namespace
  function instantiate(options, props = {}) {
    const scope = effectScope()
    const events = []
    const defaults = Object.fromEntries(Object.entries(options.props || {}).map(([key, spec]) => [key, spec.type === Function ? spec.default : typeof spec.default === 'function' ? spec.default() : spec.default]))
    const instance = reactive({ ...defaults, ...props, ...options.data(), $refs: {}, $i18n: { locale: { value: 'en' } }, $nextTick: callback => callback?.(), $emit: (...args) => events.push(args), t: key => key })
    for (const [key, method] of Object.entries(options.methods || {})) instance[key] = method.bind(instance)
    scope.run(() => {
      for (const [key, getter] of Object.entries(options.computed || {})) {
        const value = computed(() => getter.call(instance))
        Object.defineProperty(instance, key, { configurable: true, get: () => value.value })
      }
      for (const key of ['draft', 'saving']) {
        const handler = options.watch?.[key]
        if (typeof handler === 'function') watch(() => instance[key], handler.bind(instance), { flush: 'sync' })
      }
    })
    return { instance, events, dispose() { options.beforeUnmount?.call(instance); scope.stop() } }
  }
  return {
    conversation, panel, direct, instantiate, scrollLock, api, threadHelpers, document, savedDrafts, revoked,
    advance(milliseconds) {
      now += milliseconds
      for (const [id, timer] of [...timers]) if (timer.at <= now) { timers.delete(id); timer.callback() }
    },
  }
}

test('a sent message re-enables the cached Vue send state after its cooldown', async () => {
  const env = await environment()
  const sent = []
  const { instance: thread, dispose } = env.instantiate(env.conversation, { variant: 'learner', taskId: 7, onSend: async body => sent.push(body) })
  try {
    thread.draft = 'First message'
    await thread.submit()
    assert.deepEqual(sent, ['First message'])
    assert.equal(thread.sendBlocked, true)
    thread.draft = 'Second message'
    await thread.submit()
    assert.equal(sent.length, 1, 'A rapid repeated send is blocked')
    env.advance(1199)
    assert.equal(thread.sendBlocked, true, 'The Vue computed value remains blocked until its reactive timer changes')
    env.advance(1)
    assert.equal(thread.sendBlocked, false)
    await thread.submit()
    assert.deepEqual(sent, ['First message', 'Second message'])
  } finally { dispose() }
})

test('a failed learner send retries the same message id and preserves its draft until delivery', async () => {
  const env = await environment()
  const requests = []
  const task = { id: 7, messages: [] }
  const { instance: panel, events, dispose: disposePanel } = env.instantiate(env.panel, {
    open: true, task,
    onSend: async (sentTask, body, recording, clientId) => {
      requests.push({ taskId: sentTask.id, body, recording, clientId })
      if (requests.length === 1) throw new Error('network unavailable')
      return { message: { id: 81, body, sender: 'student', client_message_id: clientId, created_at: '2026-11-15T12:00:00Z' } }
    },
  })
  const { instance: thread, dispose: disposeThread } = env.instantiate(env.conversation, { variant: 'learner', taskId: task.id, onSend: panel.handleSend, onRetry: panel.retryMessage })
  try {
    thread.draft = 'Please listen to this ayah.'
    await thread.submit()
    assert.equal(thread.draft, 'Please listen to this ayah.')
    assert.equal(thread.saving, false)
    assert.equal(thread.sent, false)
    assert.equal(panel.localMessages.length, 1)
    const failed = panel.localMessages[0]
    assert.equal(failed.failed, true)
    assert.equal(failed.pending, false)
    assert.equal(env.savedDrafts.size, 1)
    await thread.retryFailed(failed)
    assert.equal(requests.length, 2)
    assert.equal(requests[0].clientId, requests[1].clientId, 'Network retry preserves server idempotency identity')
    assert.equal(requests[0].body, requests[1].body)
    assert.equal(panel.localMessages.length, 0, 'Delivered retry removes the failed optimistic bubble')
    assert.equal(Object.keys(panel.pendingPayloads).length, 0)
    assert.equal(thread.draft, '')
    assert.equal(env.savedDrafts.size, 0)
    assert.equal(events.filter(([name, event]) => name === 'messages-updated' && event.append?.id === 81).length, 1)
  } finally { disposeThread(); disposePanel() }
})

test('retrying an old failure keeps a newly written draft and the original voice blob intact', async () => {
  const env = await environment()
  const requests = []
  const originalBlob = new Blob(['voice note'], { type: 'audio/webm' })
  const { instance: panel, dispose: disposePanel } = env.instantiate(env.panel, {
    open: true, task: { id: 8, messages: [] },
    onSend: async (task, body, recording, clientId) => {
      requests.push({ body, blob: recording?.blob, clientId })
      if (requests.length === 1) throw new Error('offline')
      return { message: { id: 82, body, sender: 'student', client_message_id: clientId } }
    },
  })
  const { instance: thread, dispose: disposeThread } = env.instantiate(env.conversation, { variant: 'learner', taskId: 8, onSend: panel.handleSend, onRetry: panel.retryMessage })
  try {
    thread.audioBlob = originalBlob
    thread.audioDurationMs = 1600
    thread.draft = 'Original feedback question'
    await thread.submit()
    const failed = panel.localMessages[0]
    thread.draft = 'A different question for later'
    await thread.retryFailed(failed)
    assert.equal(thread.draft, 'A different question for later')
    assert.equal(requests[0].blob, originalBlob)
    assert.equal(requests[1].blob, originalBlob, 'Retry retains the actual recording')
    assert.equal(requests[0].clientId, requests[1].clientId)
    assert.equal(thread.audioBlob, null, 'Successful audio retry clears the delivered recording')
    assert.equal(env.revoked.length, 1, 'Delivered optimistic audio URL is released')
  } finally { disposeThread(); disposePanel() }
})

test('modal scroll locks remain owned when other closed or open overlays change state', async () => {
  const env = await environment()
  const teacher = {}, learner = {}, unopened = {}
  env.scrollLock(teacher, true)
  env.scrollLock(unopened, false)
  assert.equal(env.document.body.classList.contains('modal-open'), true)
  env.scrollLock(learner, true, { dashboard: true })
  env.scrollLock(teacher, false)
  assert.equal(env.document.body.classList.contains('modal-open'), true)
  assert.equal(env.document.body.classList.contains('dash-drawer-open'), true)
  assert.equal(env.document.documentElement.classList.contains('dash-drawer-open'), true)
  env.scrollLock(learner, false)
  assert.equal(env.document.body.classList.contains('modal-open'), false)
  assert.equal(env.document.body.classList.contains('dash-drawer-open'), false)
  assert.equal(env.document.documentElement.classList.contains('dash-drawer-open'), false)
})


test('closing a pending poll leaves a reopened conversation able to refresh', async () => {
  const env = await environment()
  let finishFirst
  let requests = 0
  env.api.getLearnerAssignmentMessages = () => {
    requests += 1
    return new Promise(resolve => { finishFirst = resolve })
  }
  const { instance: panel, events, dispose } = env.instantiate(env.panel, { open: true, task: { id: 9, messages: [] } })
  try {
    const staleRefresh = panel.refreshThread()
    assert.equal(panel.loadingThread, true)
    panel.open = false
    env.panel.watch.open.call(panel, false)
    finishFirst({ messages: [{ id: 1, body: 'Stale response' }], threadUnreadCount: 1 })
    await staleRefresh
    assert.equal(events.length, 0, 'An old response cannot update a closed conversation')
    panel.open = true
    env.api.getLearnerAssignmentMessages = async () => { requests += 1; return { messages: [], threadUnreadCount: 0 } }
    await panel.refreshThread()
    assert.equal(requests, 2, 'A reopened conversation can fetch its current thread')
    assert.equal(panel.loadingThread, false)
    assert.equal(events.filter(([name]) => name === 'messages-updated').length, 1)
  } finally { dispose() }
})


test('teacher conversation ignores an older student poll after switching profiles', async () => {
  const env = await environment()
  const pending = []
  env.api.getTeacherStudentMessages = id => new Promise(resolve => pending.push({ id, resolve }))
  const { instance: thread, dispose } = env.instantiate(env.direct, { profile: { student: { id: 7, name: 'First' }, payload: { messages: [] } } })
  try {
    const first = thread.refreshThread()
    thread.profile.student.id = 8
    const second = thread.refreshThread()
    pending[0].resolve({ messages: [{ id: 1, body: 'First student message' }] })
    await first
    assert.equal(thread.synced.length, 0, 'Late content from the previous student is discarded')
    pending[1].resolve({ messages: [{ id: 2, body: 'Current student message' }] })
    await second
    assert.equal(thread.synced[0].id, 2)
  } finally { dispose() }
})

test('teacher message failure retains text and audio until confirmed delivery', async () => {
  const env = await environment()
  let discarded = false
  env.api.sendTeacherStudentMessage = async () => { throw new Error('Offline') }
  const { instance: thread, dispose } = env.instantiate(env.direct, { profile: { student: { id: 7 }, payload: { messages: [] } } })
  thread.$refs.voice = { recordingPayload: () => ({ blob: new Blob(['voice']) }), discardRecording: () => { discarded = true } }
  thread.draft = 'Please practise this passage'
  try {
    await thread.send()
    assert.equal(thread.draft, 'Please practise this passage')
    assert.equal(discarded, false)
    assert.equal(thread.sent.length, 0, 'A rejected send never displays optimistic success')
    assert.equal(thread.saving, false)
    assert.equal(thread.error, 'teacher.action_failed')
  } finally { dispose() }
})

test('teacher direct-message retries reuse their delivery identity, while edits create a new one', async () => {
  const env = await environment()
  const ids = []
  env.api.sendTeacherStudentMessage = async (_studentId, _body, _recording, clientId) => {
    ids.push(clientId)
    throw new Error('Connection interrupted')
  }
  const { instance: thread, dispose } = env.instantiate(env.direct, { profile: { student: { id: 7 }, payload: { messages: [] } } })
  try {
    thread.draft = 'Please repeat the last ayah.'
    await thread.send()
    await thread.send()
    assert.equal(ids[0], ids[1], 'An uncertain response is retried with the same server idempotency key')
    thread.draft = 'Please repeat the last two ayat.'
    await thread.send()
    assert.notEqual(ids[1], ids[2], 'Editing a failed draft creates a distinct message')
  } finally { dispose() }
})


test('a poll started before or during a send cannot erase its confirmed message', async () => {
  for (const pollBeforeSend of [true, false]) {
    const env = await environment()
    let finishPoll, finishSend
    env.api.getLearnerAssignmentMessages = () => new Promise(resolve => { finishPoll = resolve })
    const { instance: panel, events, dispose } = env.instantiate(env.panel, {
      open: true, task: { id: 9, messages: [] },
      onSend: () => new Promise(resolve => { finishSend = resolve }),
    })
    try {
      const firstPoll = pollBeforeSend ? panel.refreshThread() : null
      const delivery = panel.handleSend('A newly delivered message')
      const poll = firstPoll || panel.refreshThread()
      finishSend({ message: { id: 91, body: 'A newly delivered message', sender: 'student' } })
      await delivery
      finishPoll({ messages: [], threadUnreadCount: 0 })
      await poll
      assert.equal(events.filter(([name, event]) => name === 'messages-updated' && event.append?.id === 91).length, 1)
      assert.equal(events.filter(([name, event]) => name === 'messages-updated' && Array.isArray(event.messages)).length, 0, 'A stale list cannot replace the confirmed append')
      assert.equal(panel.loadingThread, false)
    } finally { dispose() }
  }
})

test('retry identity reaches real FormData through every production callback and prevents duplicate persistence', async () => {
  const env = await environment()
  const requests = []
  const persisted = new Map()
  const apiMethod = await actualMethod('resources/js/scripts/api/learning.js', 'sendLearnerAssignmentMessage', {
    createClientMessageId: () => 'legacy-generated-uuid',
    http: { post: async (url, form) => {
      const clientId = form.get('client_message_id')
      requests.push({ url, clientId, body: form.get('body'), audio: form.get('audio'), duration: form.get('duration_ms') })
      if (!persisted.has(clientId)) persisted.set(clientId, { id: 91 + persisted.size, body: form.get('body'), sender: 'student', client_message_id: clientId })
      if (requests.length === 1) throw new Error('Response lost after persistence')
      return { data: { message: persisted.get(clientId) } }
    } },
  }, 'learningApi')
  const dashboard = { auth: { learner_teacher_section_enabled: true }, supportRequestId: 0, supportLoading: false, support: { assignments: [{ id: 7, messages: [] }] } }
  const sendSupportNote = await actualMethod('resources/js/views/Dashboard.vue', 'sendSupportNote', { learningApi: { sendLearnerAssignmentMessage: apiMethod }, applyAssignmentThreadUpdate: env.threadHelpers.applyAssignmentThreadUpdate })
  const sendTaskMessageOptimistic = await actualMethod('resources/js/components/teacher/LearnerTeacherSection.vue', 'sendTaskMessageOptimistic')
  const section = { onSendNote: sendSupportNote.bind(dashboard) }
  const { instance: panel, dispose: disposePanel } = env.instantiate(env.panel, { open: true, task: { id: 7, messages: [] }, onSend: sendTaskMessageOptimistic.bind(section) })
  const { instance: thread, dispose: disposeThread } = env.instantiate(env.conversation, { variant: 'learner', taskId: 7, onSend: panel.handleSend, onRetry: panel.retryMessage })
  try {
    thread.draft = 'Please review this recitation'
    thread.audioBlob = new Blob(['a genuine recording payload'], { type: 'audio/webm' })
    thread.audioDurationMs = 1600
    await thread.submit()
    assert.equal(persisted.size, 1, 'The server may have persisted a response that the client never received')
    assert.equal(thread.draft, 'Please review this recitation')
    await thread.retryFailed(panel.localMessages[0])
    assert.equal(requests.length, 2)
    assert.equal(requests[0].clientId, requests[1].clientId, 'The same identity reaches the actual API FormData builder')
    assert.equal(persisted.size, 1, 'An idempotent backend can return the original message instead of creating another')
    assert.equal(requests[0].url, '/me/assignments/7/notes')
    assert.equal(requests[0].body, 'Please review this recitation')
    assert.equal(requests[1].duration, '1600')
    assert.equal(await requests[1].audio.text(), 'a genuine recording payload')
    assert.equal(dashboard.support.assignments[0].messages.length, 1)
    assert.equal(thread.draft, '')
    assert.equal(thread.audioBlob, null)
    await apiMethod(7, 'A legacy caller')
    assert.equal(requests[2].clientId, 'legacy-generated-uuid', 'Existing three-argument API callers retain generated identities')
  } finally { disposeThread(); disposePanel() }
})

test('a support refresh started during a message POST cannot overwrite its confirmed append', async () => {
  const env = await environment()
  let finishPost, finishGet
  const api = {
    sendLearnerAssignmentMessage: () => new Promise(resolve => { finishPost = resolve }),
    getLearnerSupport: () => new Promise(resolve => { finishGet = resolve }),
  }
  const send = await actualMethod('resources/js/views/Dashboard.vue', 'sendSupportNote', { learningApi: api, applyAssignmentThreadUpdate: env.threadHelpers.applyAssignmentThreadUpdate })
  const load = await actualMethod('resources/js/views/Dashboard.vue', 'loadLearnerSupport', { learningApi: api })
  const dashboard = {
    auth: { learner_teacher_section_enabled: true, learner_learning_network_connected: true },
    supportRequestId: 0,
    supportLoading: false,
    assignmentSavingId: 0,
    support: { assignments: [{ id: 7, messages: [] }] },
    applyLearnerSupport(payload) { this.support = payload },
    $nextTick: (cb) => { cb?.() },
  }
  const delivery = send.call(dashboard, { id: 7 }, 'Confirmed message', null, 'stable-id')
  const staleRefresh = load.call(dashboard)
  finishPost({ message: { id: 92, body: 'Confirmed message', sender: 'student' } })
  await delivery
  finishGet({ assignments: [{ id: 7, messages: [] }] })
  await staleRefresh
  assert.equal(dashboard.support.assignments[0].messages.length, 1)
  assert.equal(dashboard.support.assignments[0].messages[0].id, 92)
  assert.equal(dashboard.supportLoading, false)
})

test('direct conversation protects a draft and blocks close while sending', async () => {
  const file = 'resources/js/components/teacher/LearnerTeacherSection.vue'
  const methods = Object.fromEntries(await Promise.all(['closeDirectThread', 'keepDirectEditing', 'discardDirectThread'].map(async name => [name, await actualMethod(file, name)])))
  let focused = false, cleared = false
  const section = { selectedDirectThread: { teacher_id: 4 }, directSending: true, confirmDirectDiscard: false, $nextTick: callback => callback(), $refs: { directConversation: { hasDraft: true, focusComposer: () => { focused = true }, clearConversationDraft: () => { cleared = true } }, directKeepEditing: { focus: () => {} } } }
  for (const [name, method] of Object.entries(methods)) section[name] = method.bind(section)
  section.closeDirectThread()
  assert.equal(section.selectedDirectThread.teacher_id, 4, 'A pending send keeps its conversation context')
  assert.equal(section.confirmDirectDiscard, false)
  section.directSending = false
  section.closeDirectThread()
  assert.equal(section.confirmDirectDiscard, true)
  assert.equal(section.selectedDirectThread.teacher_id, 4, 'Unsent text stays in its conversation until explicit discard')
  section.keepDirectEditing()
  assert.equal(section.confirmDirectDiscard, false)
  assert.equal(focused, true)
  section.discardDirectThread()
  assert.equal(cleared, true)
  assert.equal(section.selectedDirectThread, null)
})

test('direct message delivery stays associated with its original teacher and requires confirmation', async () => {
  const send = await actualMethod('resources/js/components/teacher/LearnerTeacherSection.vue', 'sendDirectMessage')
  let finish
  const section = { selectedDirectThread: { teacher_id: 4, messages: [] }, onSendDirectMessage: (id, body) => { assert.equal(id, 4); assert.equal(body, 'Question'); return new Promise(resolve => { finish = resolve }) }, t: key => key }
  const delivery = send.call(section, 'Question')
  section.selectedDirectThread = { teacher_id: 5, messages: [] }
  finish({ id: 19, body: 'Question', sender: 'student' })
  assert.equal((await delivery).id, 19)
  assert.equal(section.selectedDirectThread.messages.length, 0, 'A late response cannot appear in another teacher conversation')
  section.onSendDirectMessage = async () => null
  await assert.rejects(send.call(section, 'Question'), /teacher.action_failed/, 'Missing confirmation must retain the composer instead of displaying success')
})


test('direct conversation polling updates incoming history without erasing confirmed delivery', async () => {
  const file = 'resources/js/components/teacher/LearnerTeacherSection.vue'
  let finishGet
  const api = { getLearnerTeacherMessages: () => new Promise(resolve => { finishGet = resolve }) }
  const poll = await actualMethod(file, 'refreshDirectThreads', { learningApi: api })
  const send = await actualMethod(file, 'sendDirectMessage')
  const section = { support: { direct_threads: [{ teacher_id: 4 }] }, selectedDirectThread: { teacher_id: 4, messages: [] }, directPollVersions: {}, directSynced: {}, directSent: {}, directDisposed: false, onSendDirectMessage: async () => ({ id: 8, body: 'Confirmed reply', sender: 'student' }), t: key => key }
  const firstPoll = poll.call(section)
  await send.call(section, 'Confirmed reply')
  finishGet({ messages: [] })
  await firstPoll
  assert.equal(section.selectedDirectThread.messages[0].id, 8)
  assert.equal(section.directSent[4][0].id, 8, 'Reopening preserves confirmed messages while the next refresh is pending')
  const secondPoll = poll.call(section)
  finishGet({ messages: [{ id: 9, body: 'New teacher reply', sender: 'teacher' }] })
  await secondPoll
  assert.deepEqual(section.selectedDirectThread.messages.map(message => message.id).sort(), [8, 9], 'Incoming replies appear in the open conversation')
})


test('fallback message identities remain valid UUIDs accepted by the existing API', async () => {
  const env = await environment({ withoutRandomUUID: true })
  const ids = []
  const { instance: panel, dispose } = env.instantiate(env.panel, { open: true, task: { id: 7, messages: [] }, onSend: async (task, body, recording, clientId) => { ids.push(clientId); return { message: { id: ids.length, body, sender: 'student', client_message_id: clientId } } } })
  try {
    await panel.handleSend('First')
    await panel.handleSend('Second')
    assert.ok(ids.every(id => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)))
    assert.notEqual(ids[0], ids[1])
  } finally { dispose() }
})

test('studio feedback retries keep the same message identity and edits start a new one', async () => {
  const requests = []
  let sequence = 0
  const send = await actualMethod('resources/js/components/teacher/TeacherRecitationPlaybackReview.vue', 'persistFeedback', {
    createClientMessageId: () => `request-${++sequence}`,
    learningApi: { saveTeacherRecitationFeedback: async (_student, _attempt, payload) => { requests.push(payload); throw new Error('Connection interrupted') } },
  })
  const context = { saving: '', feedback: 'Practise this ayah', feedbackRequest: null, studentId: 1, attemptId: 2,
    $refs: { voice: { isRecordingActive: false, recordingPayload: () => null } },
    failureMessage: error => error.message,
  }
  await send.call(context)
  await send.call(context)
  assert.equal(requests[0].client_message_id, requests[1].client_message_id, 'An uncertain response can be retried without duplicating feedback')
  context.feedback = 'A revised instruction'
  await send.call(context)
  assert.notEqual(requests[1].client_message_id, requests[2].client_message_id)
})
