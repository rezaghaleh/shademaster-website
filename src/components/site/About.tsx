import { LEAD_TIMES, TIMELINE } from "@/lib/site"

const POINTS = [
  {
    title: "No-pressure quoting",
    desc: "We’ll give you clear pricing and options—you decide when you’re ready.",
  },
  {
    title: "Smart-home ready",
    desc: "LL OneTouch™ motorization with options for app, remote, or voice control.",
  },
  {
    title: "Metro Vancouver coverage",
    desc: "From North Shore to Vancouver, Tri-Cities, Richmond, and Surrey/Langley.",
  },
]

export function About() {
  return (
    <section id="about" className="py-20 md:py-28" aria-labelledby="about-title">
      <div className="shell grid items-start gap-14 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
        <div className="reveal">
          <p className="hud text-faint">About</p>
          <h2
            id="about-title"
            className="display text-bone mt-4 text-[clamp(34px,4.6vw,64px)]"
          >
            Family-run, Vancouver-based, detail-obsessed
          </h2>
          <p className="text-mute mt-6 max-w-[40rem] text-[clamp(1rem,1.4vw,1.14rem)] leading-[1.65]">
            ShadeMaster Blinds LTD. is a local team focused on clean installs,
            honest quotes, and designs that feel like they were built for your
            home—not pulled off a shelf.
          </p>

          <ul className="mt-10 space-y-8">
            {POINTS.map((point, i) => (
              <li key={point.title} className="border-line flex gap-5 border-t pt-6">
                <span className="hud text-sky-brand shrink-0 pt-1">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="display text-bone text-[clamp(21px,2.2vw,30px)]">
                    {point.title}
                  </h3>
                  <p className="text-mute mt-2 max-w-[34rem] text-[0.95rem] leading-[1.65]">
                    {point.desc}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="reveal space-y-4">
          <div className="border-line bg-ink-raised/50 rounded-2xl border p-6">
            <p className="hud text-faint">How a typical project works</p>
            <ol className="mt-6 space-y-6">
              {TIMELINE.map((t, i) => (
                <li key={t.step} className="flex gap-4">
                  <span className="border-sky-brand/40 text-sky-brand hud mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[0.6rem]">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-bone text-sm font-semibold">{t.step}</p>
                    <p className="text-mute mt-1.5 text-sm leading-[1.6]">
                      {t.desc}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="text-faint mt-6 text-xs">
              *Integration depends on hardware; ask us for details.
            </p>
          </div>

          <div className="border-line bg-ink-raised/50 rounded-2xl border p-6">
            <p className="hud text-faint">Typical lead times</p>
            <dl className="mt-5 grid grid-cols-3 gap-4">
              {LEAD_TIMES.map((lead) => (
                <div key={lead.name}>
                  <dt className="text-bone text-xs font-semibold">{lead.name}</dt>
                  <dd className="display text-sky-brand mt-2 text-[clamp(16px,1.7vw,22px)]">
                    {lead.time}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="border-line bg-ink-raised/50 rounded-2xl border p-6">
            <p className="hud text-faint">Testimonials</p>
            <p className="text-bone mt-4 text-sm font-semibold">
              Testimonials coming soon
            </p>
            <p className="text-mute mt-2 text-sm leading-[1.6]">
              We are working on this section and will be adding real customer
              feedback soon.
            </p>
            <span className="hud text-faint border-line mt-5 inline-block rounded-full border px-3 py-1.5">
              Coming soon
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
