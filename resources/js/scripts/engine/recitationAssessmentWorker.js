/** Run long final comparisons off the UI thread when workers are available. */
export async function assessRecitationInWorker(targetText, words, options) {
  if (typeof Worker !== 'function') return null
  let worker
  try {
    // Vue arrays/objects may be proxies and cannot be structured-cloned.
    const input = JSON.parse(JSON.stringify({ targetText, words, options }))
    worker = new Worker(new URL('./recitationAssessment.worker.js', import.meta.url))
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Recitation analysis timed out.')), 30000)
      worker.onmessage = ({ data }) => {
        clearTimeout(timer)
        if (data?.error) reject(new Error(data.error))
        else resolve(data?.result || null)
      }
      worker.onerror = error => { clearTimeout(timer); reject(error) }
      worker.postMessage(input)
    })
  } catch (error) {
    console.warn('Background recitation analysis unavailable:', error?.message || error)
    return null
  } finally {
    worker?.terminate()
  }
}
