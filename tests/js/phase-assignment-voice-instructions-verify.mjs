import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

assert.match(read('resources/js/components/teacher/TeacherTaskSheet.vue'), /TeacherVoiceNoteControls/, 'assignment form supports voice note controls')
assert.match(read('app/Services/Teacher/TeacherAssignmentInstructionAudioService.php'), /TeacherAssignmentAudioRevision/, 'instruction updates preserve audio revisions')
assert.match(read('resources/js/components/teacher/LearnerTeacherSection.vue'), /voice_instructions/, 'student task details show assignment voice instructions')
assert.match(read('resources/js/components/parent/ParentFamilyLearning.vue'), /assignmentVoiceInstruction/, 'parents can listen from homework details')
assert.match(read('resources/js/components/teacher/profile/TeacherStudentProfilePlan.vue'), /planItemVoices/, 'learning plan composer uploads item voice drafts')
assert.match(read('app/Services/Teacher/LearningPlanService.php'), /instruction_audio_asset_id/, 'released plan items reuse instruction audio on assignments')

console.log('phase-assignment-voice-instructions-verify.mjs: ok')