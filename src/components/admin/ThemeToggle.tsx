"use client"

import { useCallback, useEffect, useState } from "react"
import { getCurrentUser, setTheme, subscribeToAuth, type Theme } from "@/lib/admin-api"

/**
 * Where the theme is remembered between the page loading and the account arriving.
 *
 * <p>The account is the source of truth, but it takes a round trip to fetch, and a white
 * page flashing to navy on every load is worse than no theme at all. So the last applied
 * theme is mirrored here and painted immediately, then corrected the moment the real
 * answer lands — which only differs if it was changed on another device.
 *
 * <p>It is also what themes the sign-in screen, where there is no account yet.
 */
const CACHE_KEY = "sm-theme"

function readCache(): Theme | null {
  try {
    const stored = window.localStorage.getItem(CACHE_KEY)
    return stored === "LIGHT" || stored === "DARK" ? stored : null
  } catch {
    // private windows and blocked site data throw rather than return null
    return null
  }
}

function writeCache(theme: Theme) {
  try {
    window.localStorage.setItem(CACHE_KEY, theme)
  } catch {
    // a cache that cannot be written is a slower first paint, not a broken app
  }
}

/** What the device asks for, used only until an account says otherwise. */
function systemTheme(): Theme {
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "LIGHT" : "DARK"
}

/**
 * Paints the theme by stamping the root element, which is what every token in
 * globals.css keys off.
 *
 * <p>On the document element rather than a wrapper so the page's own background and the
 * browser's own furniture — scrollbars, select popups, date pickers — change with it.
 */
function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme === "LIGHT" ? "light" : "dark"
}

/**
 * The account's theme, applied to the page.
 *
 * <p>Lives in the admin layout so it runs whether or not anyone is signed in — the
 * sign-in screen gets the last theme used on this device, and the account's own choice
 * takes over the moment it arrives.
 *
 * <p>Two states, not three: a "system" option sounds tidy but means the answer to "what
 * theme am I in" depends on the device, which is exactly what putting the choice on the
 * account was meant to stop. The device preference is still honoured — but only as the
 * opening guess for someone who has never chosen.
 */
export function useAccountTheme() {
  const [theme, setThemeState] = useState<Theme>("DARK")
  const [saving, setSaving] = useState(false)

  // First paint: the cached choice, or what the device asks for.
  useEffect(() => {
    const initial = readCache() ?? systemTheme()
    setThemeState(initial)
    apply(initial)
  }, [])

  // Then the account, which wins — and which is how a change made on another
  // device arrives on this one.
  useEffect(() => {
    const sync = () => {
      const user = getCurrentUser()
      if (!user) return
      setThemeState(user.theme)
      apply(user.theme)
      writeCache(user.theme)
    }
    sync()
    return subscribeToAuth(sync)
  }, [])

  /**
   * The theme is stamped on the document, which outlives this area of the app. Leaving
   * it set would follow the user out to the public site, which is a deliberately dark
   * page and not part of this preference.
   */
  useEffect(() => {
    return () => {
      delete document.documentElement.dataset.theme
    }
  }, [])

  const choose = useCallback(async (next: Theme) => {
    // Applied first, saved second: the switch should feel instant, and a failed save
    // must not make the click feel broken.
    setThemeState(next)
    apply(next)
    writeCache(next)
    setSaving(true)
    try {
      await setTheme(next)
    } catch {
      // The screen already changed and the cache holds, so this device keeps the
      // choice — it just has not reached the other ones yet.
    } finally {
      setSaving(false)
    }
  }, [])

  return { theme, choose, saving }
}

/** Light/dark switch for the admin bar. */
export function ThemeToggle({
  theme,
  onChoose,
  saving = false,
}: {
  theme: Theme
  onChoose: (theme: Theme) => void
  saving?: boolean
}) {
  const light = theme === "LIGHT"

  return (
    <button
      type="button"
      onClick={() => onChoose(light ? "DARK" : "LIGHT")}
      aria-pressed={light}
      aria-label={`Switch to ${light ? "dark" : "light"} mode`}
      title={`Switch to ${light ? "dark" : "light"} mode`}
      disabled={saving}
      className="hud border-line-strong text-mute hover:text-bone hover:border-sky-brand/45 flex h-11 shrink-0 items-center gap-2 rounded-lg border px-3 transition-colors disabled:opacity-60"
    >
      {/* the icon shows the state you are in; the label says where a tap leads */}
      <span aria-hidden="true" className="text-[0.95rem] leading-none">
        {light ? "☀" : "☾"}
      </span>
      <span className="hidden sm:inline">{light ? "Light" : "Dark"}</span>
    </button>
  )
}
