import { execFileSync } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'

/**
 * @param {{ inputWebm: string, outputMp4: string, speed?: number }} options
 */
export async function postprocessTutorialVideo({
  inputWebm,
  outputMp4,
  speed = 1,
  trimStartSeconds = 0.6,
}) {
  await mkdir(dirname(outputMp4), { recursive: true })
  const filters = []

  if (speed !== 1) {
    filters.push(`setpts=${(1 / speed).toFixed(4)}*PTS`)
  }

  const vf = filters.length ? ['-vf', filters.join(',')] : []
  const inputArgs = trimStartSeconds > 0 ? ['-ss', String(trimStartSeconds)] : []

  execFileSync(
    'ffmpeg',
    [
      '-y',
      ...inputArgs,
      '-i',
      inputWebm,
      '-an',
      ...vf,
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      '-r',
      '30',
      outputMp4,
    ],
    { stdio: 'inherit' },
  )

  return outputMp4
}

export function projectTutorialPaths(root, slug) {
  const videosDir = join(root, 'tutorials', 'videos')
  return {
    videosDir,
    rawWebm: join(videosDir, `${slug}.raw.webm`),
    outputMp4: join(videosDir, `${slug}.mp4`),
  }
}
