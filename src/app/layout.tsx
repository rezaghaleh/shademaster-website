import "./globals.css"
import type { Metadata, Viewport } from "next"
import { Shell } from "@/components/site/Shell"
import { SITE } from "@/lib/site"

/**
 * Absolute base for Open Graph and Twitter image URLs.
 *
 * Next resolves those against localhost when this is unset, so link previews are
 * broken everywhere the site is shared. Set NEXT_PUBLIC_SITE_URL to the public
 * origin at build time — it is read here rather than hardcoded so staging and
 * production each describe themselves correctly.
 */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: SITE.name,
  description: SITE.description,
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: SITE.name,
    description: SITE.description,
    url: siteUrl,
  },
}

export const viewport: Viewport = {
  themeColor: "#061D3F",
  colorScheme: "dark",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className="bg-ink scroll-smooth motion-reduce:scroll-auto"
      // tells Next to suppress smooth scrolling during route transitions
      data-scroll-behavior="smooth"
    >
      <body className="bg-ink text-bone font-body m-0 min-h-[100dvh] antialiased">
        <Shell>{children}</Shell>
      </body>
    </html>
  )
}
