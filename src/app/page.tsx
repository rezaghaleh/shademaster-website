"use client"

import { About } from "@/components/site/About"
import { Arrival } from "@/components/site/Arrival"
import { Contact } from "@/components/site/Contact"
import { Gallery } from "@/components/site/Gallery"
import { Hero } from "@/components/site/Hero"
import { LightBeat } from "@/components/site/LightBeat"
import { Process } from "@/components/site/Process"
import { Products } from "@/components/site/Products"
import { useRevealOnScroll } from "@/hooks/useRevealOnScroll"

/**
 * Scrolling this page draws a shade from top to bottom.
 *
 * The hero window opens and light arrives; the products are four ways of
 * shaping it; the services pin one window and change it stage by stage; the
 * light beat is the light itself, scrubbed by scroll down to a single calm
 * band; then the shade settles at the position it was measured for.
 */
export default function Page() {
  useRevealOnScroll("home")

  return (
    <main id="main" tabIndex={-1}>
      <Hero />
      <Products />
      <Process />
      <Gallery />
      <LightBeat />
      <About />
      <Contact />
      <Arrival />
    </main>
  )
}
