import { setAssessmentActive, setQuranPlaybackActive } from './audioCoordinator.js'

/** Register memorisation workspace playback state with the audio coordinator. */
export function wireMemorisationMrMutqinBridge(vm) {
  if (!vm) return () => {}
  const sync = () => {
    setQuranPlaybackActive(Boolean(vm.isAudioPlaying || vm.audioPlaying))
    setAssessmentActive(Boolean(vm.assessmentActive || vm.recordingActive))
  }
  sync()
  return sync
}