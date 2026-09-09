import Image from "next/image"
import { GALLERY } from "@/lib/site"

/**
 * Only the three files in public/projects are photographs of real work.
 * public/hero.jpg, which the old page showed under the caption "Real
 * ShadeMaster install • Vancouver condo", is actually the logo on a plain
 * background — so it is not used here. The first photo is given the wide slot
 * because the work is the strongest thing on the page.
 */
export function Gallery() {
  const [feature, ...rest] = GALLERY

  return (
    <section id="gallery" className="py-20 md:py-28" aria-labelledby="gallery-title">
      <div className="shell">
        <div className="reveal flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="hud text-faint">Gallery</p>
            <h2
              id="gallery-title"
              className="display text-bone mt-4 max-w-[18ch] text-[clamp(34px,4.6vw,64px)]"
            >
              Recent projects around Greater Vancouver
            </h2>
            <p className="text-mute mt-5 max-w-[38rem] text-[clamp(1rem,1.4vw,1.14rem)] leading-[1.65]">
              A peek at our latest work in condos, townhomes, and custom homes.
            </p>
          </div>
          <p className="text-faint max-w-sm text-sm leading-[1.65]">
            Full gallery coming soon. For now, ask us to bring photos and examples
            that match your style.
          </p>
        </div>

        <div className="reveal mt-12 grid gap-4 lg:grid-cols-3">
          <figure className="border-line relative aspect-[16/11] overflow-hidden rounded-2xl border lg:col-span-2 lg:aspect-auto">
            <Image
              src={feature.src}
              alt={feature.alt}
              fill
              sizes="(min-width: 1024px) 66vw, 100vw"
              className="object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.03] motion-reduce:transition-none motion-reduce:hover:scale-100"
              priority
            />
          </figure>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {rest.map((shot) => (
              <figure
                key={shot.src}
                className="border-line relative aspect-[4/3] overflow-hidden rounded-2xl border lg:aspect-[4/3]"
              >
                <Image
                  src={shot.src}
                  alt={shot.alt}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.03] motion-reduce:transition-none motion-reduce:hover:scale-100"
                />
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
