import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getStepBody } from './StepBodies'

interface CalloutPayload {
  stepId: string
  step: number
  welcome: boolean
  subStep: boolean
  label: string
  title: string
  autoAdvanceHint: string | null
  successAction: string | null
  mainStepIndex: number
  totalMain: number
  itemsAddedCount: number
  shortcuts: { quickAdd: string; openList: string; reference: string }
}

export function CalloutWindow(): JSX.Element | null {
  const [payload, setPayload] = useState<CalloutPayload | null>(null)
  const [itemsAdded, setItemsAdded] = useState<number>(0)
  const observerRef = useRef<ResizeObserver | null>(null)
  const lastReportedHeightRef = useRef<number>(0)

  // Continuously measure the callout's natural size and ask main to resize
  // the BrowserWindow to match. We attach to the stable .onb-root div via a
  // callback ref — NOT to the motion.div inside, which remounts on every
  // step transition (key={stepId}) and would leave a stale observer
  // pointing at a detached node. The callback ref also handles the
  // payload-was-null-on-mount case: when the root first appears, attachRoot
  // fires with the node and we set up the observer then.
  const attachRoot = useCallback((node: HTMLDivElement | null) => {
    observerRef.current?.disconnect()
    observerRef.current = null
    if (!node) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h = Math.ceil(
          entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height
        )
        // Skip zeros (which fire transiently between AnimatePresence's exit
        // and enter under mode="wait") and skip duplicates so we don't IPC
        // every micro-jitter back to main.
        if (h > 0 && h !== lastReportedHeightRef.current) {
          lastReportedHeightRef.current = h
          void window.api.onboarding.requestResize(h)
        }
      }
    })
    ro.observe(node)
    observerRef.current = ro
  }, [])

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect()
      observerRef.current = null
    }
  }, [])

  // On mount, ask main for the current step in case the show-step push
  // arrived before this renderer was ready.
  useEffect(() => {
    window.api.onboarding.getState().then((p) => {
      if (p) {
        setPayload(p)
        setItemsAdded(p.itemsAddedCount)
      }
    })

    const offShow = window.api.onboarding.onShowStep((p) => {
      setPayload(p)
      setItemsAdded(p.itemsAddedCount)
    })
    const offProgress = window.api.onboarding.onItemsProgress((count) => {
      setItemsAdded(count)
    })

    return () => {
      offShow()
      offProgress()
    }
  }, [])

  if (!payload) return null

  const isWelcome = payload.welcome
  const isFinal = payload.stepId === 'done'

  const advance = (): void => {
    void window.api.onboarding.advance()
  }
  const back = (): void => {
    void window.api.onboarding.back()
  }
  const close = (): void => {
    void window.api.onboarding.close()
  }

  // Auto-advance hint with the live "X of 3 added" counter swapped in
  // during capture-add. Tail copy nudges the user toward the *next*
  // action specifically (not just "keep going") so the prompt stays
  // useful as they progress.
  const captureAddTail = (count: number): string => {
    if (count === 1) return 'Open another Entry Form and save another.'
    if (count === 2) return 'One more time.'
    return 'Mission Accomplished.'
  }
  const hint =
    payload.stepId === 'capture-add' && itemsAdded > 0
      ? `${itemsAdded} of 3 added — ${captureAddTail(itemsAdded)}`
      : payload.autoAdvanceHint

  return (
    <div ref={attachRoot} className={`onb-root ${isWelcome ? 'onb-welcome' : ''}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={payload.stepId}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
          className="onb-callout"
        >
          {/* Header — counter, label, dismiss X. Welcome screen omits all of it. */}
          {!isWelcome && (
            <div className="onb-header">
              <div className="onb-counter">
                <span className="onb-counter-num">
                  {String(payload.mainStepIndex).padStart(2, '0')}
                </span>
                <span className="onb-counter-sep">/</span>
                <span className="onb-counter-total">
                  {String(payload.totalMain).padStart(2, '0')}
                </span>
                <span className="onb-counter-label"> · {payload.label}</span>
              </div>
              <button
                type="button"
                className="onb-dismiss"
                aria-label="Dismiss tour"
                onClick={close}
              >
                ×
              </button>
            </div>
          )}

          {/* Title */}
          <div className="onb-title">{payload.title}</div>

          {/* Body */}
          <div className="onb-body">
            {getStepBody(payload.stepId, { shortcuts: payload.shortcuts })}
          </div>

          {/* Auto-advance hint with green pulse */}
          {hint && (
            <div className="onb-hint">
              <span className="onb-hint-pulse" />
              {hint}
            </div>
          )}

          {/* Footer — buttons + progress dots */}
          <div className="onb-footer">
            {!isWelcome && (
              <div className="onb-progress">
                {Array.from({ length: payload.totalMain }).map((_, i) => {
                  const stepNum = i + 1
                  const state =
                    stepNum < payload.mainStepIndex
                      ? 'done'
                      : stepNum === payload.mainStepIndex
                        ? 'active'
                        : 'pending'
                  return <span key={i} className={`onb-dot onb-dot-${state}`} />
                })}
              </div>
            )}
            <div className="onb-buttons">
              {isWelcome ? (
                <>
                  <button
                    type="button"
                    className="onb-btn onb-btn-secondary"
                    onClick={close}
                  >
                    Skip
                  </button>
                  <button
                    type="button"
                    className="onb-btn onb-btn-primary"
                    onClick={advance}
                  >
                    Start Tour
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="onb-btn onb-btn-secondary"
                    onClick={back}
                    disabled={payload.stepId === 'capture'}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className={`onb-btn ${isFinal ? 'onb-btn-primary' : 'onb-btn-secondary'}`}
                    onClick={advance}
                  >
                    {isFinal ? "Let's go" : 'Next →'}
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
