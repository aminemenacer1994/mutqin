/**
 * Visual progress bar display — keeps shown % accurate while ensuring
 * small non-zero values remain visible. Does not inflate the percentage.
 *
 * @param {number} percent Raw percentage (0–100).
 * @returns {{ percent: number, fillWidth: string, hasProgress: boolean }}
 */
export function progressBarDisplay(percent) {
  const value = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)))

  if (value <= 0) {
    return { percent: 0, fillWidth: '0%', hasProgress: false }
  }

  const fill = value >= 100 ? 100 : Math.max(value, 2)

  return {
    percent: value,
    fillWidth: `${fill}%`,
    hasProgress: true,
  }
}
