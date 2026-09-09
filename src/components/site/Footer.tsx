import Image from "next/image"
import Link from "next/link"
import { ASSETS, CONTACT, SITE } from "@/lib/site"

/**
 * The real logo lockup lives here, on a bone chip — the PNG is navy-on-white,
 * so a light surface is the one place on this ground it can be shown as-is.
 */
export function Footer() {
  return (
    <footer className="border-line bg-ink-deep border-t">
      <div className="shell flex flex-col gap-10 py-12 md:flex-row md:items-start md:justify-between md:gap-16">
        <div className="max-w-sm">
          <div className="bg-bone inline-block rounded-xl p-2.5">
            <Image
              src={ASSETS.logoFull}
              alt={`${SITE.name} logo`}
              width={132}
              height={132}
              className="h-[74px] w-auto"
            />
          </div>
          <p className="display text-bone mt-5 text-[1.4rem]">{SITE.name}</p>
          <p className="hud text-sky-brand mt-2.5">{SITE.tagline}</p>
          <p className="text-faint mt-5 text-xs">
            © {new Date().getFullYear()} {SITE.name} All rights reserved.
          </p>
        </div>

        <div className="grid gap-10 sm:grid-cols-2 md:gap-16">
          <div>
            <p className="hud text-faint">Contact</p>
            <ul className="text-mute mt-4 space-y-2.5 text-sm">
              <li>
                <a
                  className="hover:text-sky-brand transition-colors"
                  href={CONTACT.phoneHref}
                >
                  {CONTACT.phone}
                </a>
              </li>
              <li>
                <a
                  className="hover:text-sky-brand transition-colors"
                  href={CONTACT.emailHref}
                >
                  {CONTACT.email}
                </a>
              </li>
              <li>
                <a
                  className="hover:text-sky-brand transition-colors"
                  href={CONTACT.instagram}
                  target="_blank"
                  rel="noreferrer"
                >
                  {CONTACT.instagramHandle}
                </a>
              </li>
              <li>{CONTACT.city}</li>
            </ul>
          </div>

          <div>
            <p className="hud text-faint">Site</p>
            <ul className="text-mute mt-4 space-y-2.5 text-sm">
              <li>
                <a className="hover:text-sky-brand transition-colors" href="/#products">
                  Products
                </a>
              </li>
              <li>
                <a className="hover:text-sky-brand transition-colors" href="/#services">
                  Services
                </a>
              </li>
              <li>
                <a className="hover:text-sky-brand transition-colors" href="/#gallery">
                  Gallery
                </a>
              </li>
              <li>
                <Link
                  className="hover:text-sky-brand transition-colors"
                  href="/estimate"
                >
                  Estimate
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  )
}
