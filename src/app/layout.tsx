import "./globals.css"
import type { Metadata, Viewport } from "next"
import { Shell } from "@/components/site/Shell"
import { SITE } from "@/lib/site"

export const metadata: Metadata = {
  title: SITE.name,
  description: SITE.description,
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
