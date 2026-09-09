import { useEffect, useState } from "react"

/**
 * Returns the id of the section currently under the top of the viewport, for
 * highlighting the active nav item.
 *
 * `topOffset` has to sit BELOW where an anchor jump parks a section. The page
 * sets that offset once, as `scroll-padding-top: 5.5rem` (88px) on <html>, and
 * deliberately sets no `scroll-margin-top` on sections — the two stack, and the
 * doubled offset would park a clicked section under this threshold, so the
 * indicator would only ever update on a manual scroll afterwards.
 */
export function useScrollSpy(
  ids: readonly string[],
  topOffset = 120
): string | null {
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    if (ids.length === 0) return

    let frame = 0

    const update = () => {
      frame = 0
      const sections = ids
        .map((id) => document.getElementById(id))
        .filter((el): el is HTMLElement => el !== null)
      if (sections.length === 0) return

      let current = sections[0].id
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= topOffset) current = section.id
        else break
      }

      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2
      if (atBottom) current = sections[sections.length - 1].id

      setActive(current)
    }

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [ids, topOffset])

  return active
}
