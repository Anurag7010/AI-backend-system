import { useState, useCallback } from 'react'
import { useAsyncState } from './useAsyncState'
import { useAbortController } from './useAbortController'
import { aiService } from '../services/ai-service'
import type { Message, AskResponse } from '../types'
import type { AsyncState } from '../types'

export function useAsk(): {
  state: AsyncState<AskResponse>
  messages: Message[]
  ask: (query: string) => Promise<void>
  clearHistory: () => void
} {
  const { state, execute, reset } = useAsyncState<AskResponse>()
  const { signal, abort, reset: resetSignal } = useAbortController()
  const [messages, setMessages] = useState<Message[]>([])

  const ask = useCallback(async (query: string) => {
    // If a previous ask is in-flight, abort it before starting a new one.
    // Without this: two concurrent asks race to update state — whichever
    // arrives last wins regardless of which was sent last. User sees wrong answer.
    abort()
    resetSignal()

    // Capture history BEFORE appending the new user message.
    // The AI backend receives previous context but not the current question
    // duplicated — the question is in the 'query' field, not the history array.
    const historyBeforeThisMessage = [...messages]

    // Append user message immediately — before the API call.
    // This gives instant visual feedback: user sees their message appear
    // the moment they send it, not after the AI responds (which could take seconds).
    setMessages(prev => [...prev, { role: 'user', content: query }])

    await execute(async () => {
      const response = await aiService.ask({
        query,
        history: historyBeforeThisMessage,
        signal,
      })

      if (response.error) {
        throw new Error(response.error.message)
      }

      const data = response.data!

      // Append assistant message only on success.
      // On error we do not append — no fake or empty assistant message
      // appears in the chat. The error surfaces in state.error instead.
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer }])

      return data
    })
  }, [messages, execute, abort, resetSignal, signal])

  const clearHistory = useCallback(() => {
    setMessages([])
    reset()
  }, [reset])

  return { state, messages, ask, clearHistory }
}