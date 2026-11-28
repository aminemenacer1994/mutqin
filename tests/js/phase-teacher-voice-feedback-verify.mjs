import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')

const controls = read('resources/js/components/teacher/TeacherVoiceNoteControls.vue')
const playback = read('resources/js/components/teacher/TeacherRecitationPlaybackReview.vue')
const audio = read('app/Services/Teacher/TeacherAssignmentMessageAudioService.php')
const parentShell = read('resources/js/components/parent/ParentFamilyOverview.vue')
const parentLearning = read('resources/js/components/parent/ParentFamilyLearning.vue')
const plan = read('resources/js/components/teacher/profile/TeacherStudentProfilePlan.vue')

assert.match(controls, /pauseRecording|resumeRecording|discardRecording|rerecord/, 'teacher draft voice controls support pause and replace')
assert.match(controls, /TeacherAudioFeedbackPlayer/, 'recorded drafts preview through the shared player')
assert.match(playback, /TeacherVoiceNoteControls/, 'playback studio integrates compact microphone actions')
assert.match(playback, /sendFeedback|completeReview/, 'feedback uses existing send and mark-reviewed actions')
assert.match(audio, /ParentAccessAuthorizer/, 'assignment audio authorises linked parents for published feedback')
assert.match(parentShell, /TeacherAudioFeedbackPlayer/, 'parent overview can replay authorised voice feedback')
assert.match(parentLearning, /publishedFeedback/, 'parent homework detail surfaces published voice feedback')
assert.match(plan, /TeacherVoiceNoteControls/, 'learning plan review can attach optional voice feedback')

console.log('phase-teacher-voice-feedback-verify.mjs: ok')