import { AREAS, CONTACT } from "@/lib/site"

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="M5 3h3l2 5-2.5 1.5a12 12 0 0 0 5 5L14 12l5 2v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 3 5.2 2 2 0 0 1 5 3z" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 6.5 8.5 6 8.5-6" />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function Contact() {
  return (
    <section id="contact" className="py-20 md:py-28" aria-labelledby="contact-title">
      <div className="shell grid items-start gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div className="reveal">
          <p className="hud text-faint">Contact</p>
          <h2
            id="contact-title"
            className="display text-bone mt-4 text-[clamp(34px,4.6vw,64px)]"
          >
            Book your free in-home measure
          </h2>
          <p className="text-mute mt-6 max-w-[38rem] text-[clamp(1rem,1.4vw,1.14rem)] leading-[1.65]">
            We’ll bring fabric samples, measure every window, and provide a clear
            quote.
          </p>

          <ul className="mt-10 space-y-1">
            <li>
              <a
                className="border-line hover:text-sky-brand hover:border-sky-brand/40 group flex items-center gap-4 border-t py-5 transition-colors duration-200"
                href={CONTACT.phoneHref}
              >
                <span className="text-sky-brand block h-5 w-5 shrink-0">
                  <PhoneIcon />
                </span>
                <span className="display text-[clamp(22px,2.8vw,34px)]">
                  {CONTACT.phone}
                </span>
              </a>
            </li>
            <li>
              <a
                className="border-line hover:text-sky-brand hover:border-sky-brand/40 flex items-center gap-4 border-t py-5 transition-colors duration-200"
                href={CONTACT.emailHref}
              >
                <span className="text-sky-brand block h-5 w-5 shrink-0">
                  <MailIcon />
                </span>
                <span className="display break-all text-[clamp(19px,2.4vw,30px)]">
                  {CONTACT.email}
                </span>
              </a>
            </li>
            <li>
              <a
                className="border-line hover:text-sky-brand hover:border-sky-brand/40 flex items-center gap-4 border-y py-5 transition-colors duration-200"
                href={CONTACT.instagram}
                target="_blank"
                rel="noreferrer"
              >
                <span className="text-sky-brand block h-5 w-5 shrink-0">
                  <InstagramIcon />
                </span>
                <span className="display text-[clamp(22px,2.8vw,34px)]">
                  {CONTACT.instagramHandle}
                </span>
              </a>
            </li>
          </ul>

          <p className="text-mute mt-8 flex items-center gap-3 text-sm">
            <span className="text-sky-brand block h-4 w-4 shrink-0">
              <PinIcon />
            </span>
            {CONTACT.base}
          </p>
        </div>

        <div className="reveal space-y-4">
          <div className="border-line bg-ink-raised/50 rounded-2xl border p-6">
            <p className="hud text-faint">Areas we serve</p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {AREAS.map((area) => (
                <li
                  key={area}
                  className="border-line text-mute rounded-full border px-3 py-1.5 text-xs"
                >
                  {area}
                </li>
              ))}
            </ul>
            <div className="border-line text-mute mt-6 flex flex-wrap gap-x-6 gap-y-2 border-t pt-5 text-sm">
              <span>Insured installation</span>
              <span>Light control &amp; privacy experts</span>
            </div>
          </div>

          <div className="border-line bg-ink-raised/50 rounded-2xl border p-6">
            <p className="hud text-faint">Tell us about your project</p>
            <p className="text-mute mt-4 text-sm leading-[1.65]">
              Online project requests will be available soon.
            </p>
            <span className="hud text-faint border-line mt-5 inline-block rounded-full border px-3 py-1.5">
              Coming soon
            </span>
            <p className="text-faint mt-5 text-xs leading-[1.6]">
              For now, please call, email, or message us on Instagram for project
              inquiries.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
