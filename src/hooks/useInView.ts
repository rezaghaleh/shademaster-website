import { useEffect, useRef, useState } from "react"
import type { RefObject } from "react"

interface Options {
  threshold?: number
  rootMargin?: string
  /** Keep firing as the element enters and leaves; default latches once. */
  once?: boolean
}

/**
 * Small IntersectionObserver hook. Returns a ref to attach and whether the
 * element is (or has been) in view — this is what lets the product demos run on
 * touch devices, where there is no hover to trigger them.
 */
export function useInView<T extends Element = HTMLDivElement>({
  threshold = 0.2,
  rootMargin = "0px 0px -10% 0px",
  once = true,
}: Options = {}): [RefObject<T>, boolean] {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          if (once) observer.disconnect()
        } else if (!once) {
          setInView(false)
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold, rootMargin, once])

  return [ref, inView]
}
