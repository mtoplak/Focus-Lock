import { useEffect, useRef, useState } from 'react'
import { useLocalStorage } from './useLocalStorage'

export type AmbientTrack =
  | 'off'
  | 'white'
  | 'pink'
  | 'brown'
  | 'rain'
  | 'cafe'
  | 'fireplace'

export interface AmbientState {
  track: AmbientTrack
  volume: number
  playing: boolean
}

const DEFAULTS: AmbientState = { track: 'off', volume: 0.4, playing: false }

export const AMBIENT_TRACKS: Array<{
  id: AmbientTrack
  label: string
  kind: 'noise' | 'file'
}> = [
  { id: 'off', label: 'None', kind: 'noise' },
  { id: 'white', label: 'White noise', kind: 'noise' },
  { id: 'pink', label: 'Pink noise', kind: 'noise' },
  { id: 'brown', label: 'Brown noise', kind: 'noise' },
  { id: 'rain', label: 'Rain', kind: 'file' },
  { id: 'cafe', label: 'Café', kind: 'file' },
  { id: 'fireplace', label: 'Fireplace', kind: 'file' },
]

const FILE_SOURCES: Partial<Record<AmbientTrack, string>> = {
  rain: '/sounds/rain.mp3',
  cafe: '/sounds/cafe.mp3',
  fireplace: '/sounds/fireplace.mp3',
}

function generateNoiseBuffer(
  ctx: AudioContext,
  kind: 'white' | 'pink' | 'brown',
): AudioBuffer {
  const seconds = 2
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate)
  const data = buffer.getChannelData(0)

  if (kind === 'white') {
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1
    }
  } else if (kind === 'brown') {
    let last = 0
    for (let i = 0; i < data.length; i++) {
      const w = Math.random() * 2 - 1
      last = (last + 0.02 * w) / 1.02
      data[i] = last * 3.5
    }
  } else {
    // Pink: Paul Kellet's economical filter approximation.
    let b0 = 0,
      b1 = 0,
      b2 = 0,
      b3 = 0,
      b4 = 0,
      b5 = 0,
      b6 = 0
    for (let i = 0; i < data.length; i++) {
      const w = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + w * 0.0555179
      b1 = 0.99332 * b1 + w * 0.0750759
      b2 = 0.969 * b2 + w * 0.153852
      b3 = 0.8665 * b3 + w * 0.3104856
      b4 = 0.55 * b4 + w * 0.5329522
      b5 = -0.7616 * b5 - w * 0.016898
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11
      b6 = w * 0.115926
    }
  }
  return buffer
}

export interface UseAmbientResult {
  state: AmbientState
  setTrack: (track: AmbientTrack) => void
  setVolume: (volume: number) => void
  togglePlay: () => void
  /** True if the currently chosen file failed to load (e.g. user hasn't dropped the MP3 in yet). */
  fileError: boolean
}

export function useAmbient(): UseAmbientResult {
  const [state, setState] = useLocalStorage<AmbientState>('fl.ambient', DEFAULTS)
  const [fileError, setFileError] = useState(false)

  const audioCtxRef = useRef<AudioContext | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const noiseSourceRef = useRef<AudioBufferSourceNode | null>(null)
  const audioElRef = useRef<HTMLAudioElement | null>(null)

  // Build / tear down audio graph whenever track or playing changes.
  useEffect(() => {
    // Always tear down what's running.
    if (noiseSourceRef.current) {
      try {
        noiseSourceRef.current.stop()
      } catch {
        // ignore
      }
      noiseSourceRef.current.disconnect()
      noiseSourceRef.current = null
    }
    if (audioElRef.current) {
      audioElRef.current.pause()
      audioElRef.current.src = ''
      audioElRef.current = null
    }
    setFileError(false)

    if (!state.playing || state.track === 'off') return

    const fileSrc = FILE_SOURCES[state.track]
    if (fileSrc) {
      const audio = new Audio(fileSrc)
      audio.loop = true
      audio.volume = state.volume
      audio.preload = 'auto'
      audio.addEventListener('error', () => {
        setFileError(true)
        // eslint-disable-next-line no-console
        console.warn(
          `[ambient] failed to load ${fileSrc} — drop an MP3 at /public${fileSrc} (see public/sounds/README.md)`,
        )
      })
      void audio.play().catch((e) => {
        // eslint-disable-next-line no-console
        console.warn('[ambient] play() rejected', e)
      })
      audioElRef.current = audio
      return
    }

    // Procedural noise via Web Audio.
    if (!audioCtxRef.current) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext
      audioCtxRef.current = new Ctx()
      gainRef.current = audioCtxRef.current.createGain()
      gainRef.current.connect(audioCtxRef.current.destination)
    }
    const ctx = audioCtxRef.current
    const gain = gainRef.current!
    gain.gain.value = state.volume

    if (ctx.state === 'suspended') {
      void ctx.resume()
    }

    const buffer = generateNoiseBuffer(
      ctx,
      state.track as 'white' | 'pink' | 'brown',
    )
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true
    source.connect(gain)
    source.start()
    noiseSourceRef.current = source
    // We intentionally read state.volume during build (initial gain), but
    // don't restart on volume changes — that's handled in the next effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.track, state.playing])

  // Live volume update without restarting playback.
  useEffect(() => {
    if (gainRef.current) gainRef.current.gain.value = state.volume
    if (audioElRef.current) audioElRef.current.volume = state.volume
  }, [state.volume])

  return {
    state,
    setTrack: (track) =>
      setState((s) => ({
        ...s,
        track,
        playing: track === 'off' ? false : s.playing,
      })),
    setVolume: (volume) =>
      setState((s) => ({ ...s, volume: Math.max(0, Math.min(1, volume)) })),
    togglePlay: () =>
      setState((s) => ({
        ...s,
        playing: s.track === 'off' ? false : !s.playing,
      })),
    fileError,
  }
}
