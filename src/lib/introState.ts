import { useSyncExternalStore } from "react"

/**
 * Tracks whether the once-per-session brand intro has finished, so the hero
 * sequence can wait for it without prop-drilling through the tree. If the intro
 * was already seen this session it starts `true` immediately.
 */

const SEEN_KEY = "sm-intro-seen-v1"

function alreadySeen(): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) === "1"
  } catch {
    // storage blocked (private mode, embedded frame) — skip the intro
    return true
  }
}

let done = typeof window === "undefined" ? true : alreadySeen()
const listeners = new Set<() => void>()

export function shouldPlayIntro(): boolean {
  return !done
}

export function markIntroSeen(): void {
  try {
    sessionStorage.setItem(SEEN_KEY, "1")
  } catch {
    /* storage blocked — fine, the intro just plays again next time */
  }
}

export function finishIntro(): void {
  if (done) return
  done = true
  listeners.forEach((fn) => fn())
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

/** Reactively `true` once the intro is done, or was never needed. */
export function useIntroDone(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => done,
    () => true
  )
}
