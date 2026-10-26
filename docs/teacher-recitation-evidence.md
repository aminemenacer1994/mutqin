# Teacher recitation evidence

The Recite tab lists scored and unscored `AiReciteAttempt` records. A check can
have two independent forms of evidence:

- **Recording:** `AiReciteAttemptAudioService::payload()` exposes a private
  `/api/ai-recite-attempts/{id}/audio` URL only while a retained file exists.
  The authenticated stream checks that the teacher has current access to the
  student. Audio is not guaranteed: the privacy setting may prohibit retention,
  a temporary recording may expire, or an older attempt may never have stored
  one. The player must never be shown as playable when `available` is false.
- **Transcript:** `TeacherDashboardService::attemptTranscript()` reads the
  assessment recognition data. It can exist without a recording, and a
  recording can exist without a transcript. Transcripts are labelled as
  recognized text, not a verified Quran verse or a tajweed grade.

The teacher API returns both under `payload.attempts[].evidence`. The Practice
tab attaches the latest linked attempt evidence to a session when one exists.
The bottom review drawer plays retained audio and/or shows the transcript.
The Recite summary shows how many of the displayed checks have each evidence
type, including zero, so missing media is not mistaken for a broken player.

The current local demonstration database contains historical attempts without
retained audio files. Do not create synthetic student recordings to fill those
gaps. To test playback, record a new consented recitation with recording
retention enabled; the feature test
`test_teacher_sees_structured_recording_and_transcript_evidence_with_consent`
also covers private teacher access and evidence metadata.
