import { useCallback, useEffect, useRef, useState } from 'react'
import {
  appViewFromCommand,
  matchVoiceCommand,
  timerModeFromCommand,
  type VoiceAppView,
  type VoiceCommandMatch,
} from '../lib/voice/commands'
import { getSpeechRecognitionCtor, voiceControlSupported } from '../lib/voice/speechSupport'
import type { TimerMode } from '../types'

export type VoiceControlHandlers = {
  onStart: () => void
  onPause: () => void
  onReset: () => void
  onSkip: () => void
  onSetMode: (mode: TimerMode) => void
  onNavigate: (view: VoiceAppView) => void
}

export type VoiceControlState = {
  supported: boolean
  enabled: boolean
  listening: boolean
  status: 'idle' | 'listening' | 'processing' | 'error'
  lastMatch: VoiceCommandMatch | null
  lastTranscript: string
  errorMessage: string | null
  toggleListening: () => void
}

export function useVoiceControl(
  enabled: boolean,
  handlers: VoiceControlHandlers,
): VoiceControlState {
  const supported = voiceControlSupported()
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  const [listening, setListening] = useState(false)
  const [status, setStatus] = useState<VoiceControlState['status']>('idle')
  const [lastMatch, setLastMatch] = useState<VoiceCommandMatch | null>(null)
  const [lastTranscript, setLastTranscript] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const runCommand = useCallback((match: VoiceCommandMatch) => {
    const h = handlersRef.current
    switch (match.id) {
      case 'start':
        h.onStart()
        break
      case 'pause':
        h.onPause()
        break
      case 'reset':
        h.onReset()
        break
      case 'skip':
        h.onSkip()
        break
      default: {
        const view = appViewFromCommand(match.id)
        if (view) {
          h.onNavigate(view)
          break
        }
        const mode = timerModeFromCommand(match.id)
        if (mode) h.onSetMode(mode)
      }
    }
  }, [])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setListening(false)
    setStatus((current) => (current === 'listening' ? 'idle' : current))
  }, [])

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor || !enabled) return

    setErrorMessage(null)
    setLastMatch(null)

    const recognition = new Ctor()
    recognition.lang = 'en-US'
    recognition.continuous = false
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setListening(true)
      setStatus('listening')
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript
      }
      setLastTranscript(transcript)

      const isFinal = event.results[event.results.length - 1]?.isFinal
      if (!isFinal) return

      setStatus('processing')
      const match = matchVoiceCommand(transcript)
      if (match) {
        setLastMatch(match)
        runCommand(match)
        setStatus('idle')
      } else if (transcript.trim()) {
        setErrorMessage(`Didn't understand "${transcript.trim()}"`)
        setStatus('error')
      } else {
        setStatus('idle')
      }
      setListening(false)
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'aborted' || event.error === 'no-speech') {
        setStatus('idle')
        setListening(false)
        if (event.error === 'no-speech') {
          setErrorMessage('No speech detected — try again.')
          setStatus('error')
        }
        return
      }
      setErrorMessage(event.message || event.error)
      setStatus('error')
      setListening(false)
    }

    recognition.onend = () => {
      setListening(false)
      setStatus((current) => (current === 'listening' ? 'idle' : current))
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch {
      setErrorMessage('Could not start microphone.')
      setStatus('error')
      setListening(false)
    }
  }, [enabled, runCommand])

  const toggleListening = useCallback(() => {
    if (!enabled || !supported) return
    if (listening) {
      stopListening()
    } else {
      startListening()
    }
  }, [enabled, supported, listening, startListening, stopListening])

  useEffect(() => {
    if (!enabled && listening) {
      stopListening()
    }
  }, [enabled, listening, stopListening])

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort()
    }
  }, [])

  return {
    supported,
    enabled: enabled && supported,
    listening,
    status,
    lastMatch,
    lastTranscript,
    errorMessage,
    toggleListening,
  }
}
