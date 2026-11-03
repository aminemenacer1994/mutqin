// PCM capture runs on the audio rendering thread, independently of Vue/layout.
class RecitationPcmCapture extends AudioWorkletProcessor {
  constructor() {
    super()
    this.samples = new Float32Array(1024)
    this.offset = 0
    this.active = true
    this.port.onmessage = ({ data }) => {
      if (data === 'stop') {
        this.flush()
        this.active = false
        this.port.postMessage({ stopped: true })
      }
    }
  }

  flush() {
    if (!this.offset) return
    const pcm = new Int16Array(this.offset)
    let squares = 0
    let peak = 0
    let clipped = 0
    for (let i = 0; i < this.offset; i++) {
      const sample = Math.max(-1, Math.min(1, this.samples[i]))
      squares += sample * sample
      peak = Math.max(peak, Math.abs(sample))
      if (Math.abs(sample) >= 0.995) clipped++
      pcm[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff
    }
    this.port.postMessage({ buffer: pcm.buffer, squares, peak, clipped, count: this.offset }, [pcm.buffer])
    this.offset = 0
  }

  process(inputs) {
    if (!this.active) return false
    const input = inputs[0]?.[0]
    if (input) {
      for (const sample of input) {
        this.samples[this.offset++] = sample
        if (this.offset === this.samples.length) this.flush()
      }
    }
    // Output remains silence; the microphone is never played through speakers.
    return true
  }
}

registerProcessor('recitation-pcm-capture', RecitationPcmCapture)
