"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PhoneCall,
  Mail,
  MapPin,
  SunMedium,
  Ruler,
  Wrench,
  Cog,
  ShieldCheck,
  Star,
  Instagram,
} from "lucide-react";

const navItems = [
  { label: "Home", href: "#home" },
  { label: "Products", href: "#products" },
  { label: "Services", href: "#services" },
  { label: "Gallery", href: "#gallery" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
];

const products = [
  {
    name: "Roller Shades",
    desc: "Clean, modern, and customizable in hundreds of fabrics.",
    type: "roller",
  },
  {
    name: "Zebra / Dual Shades",
    desc: "Light control with a sleek, contemporary look.",
    type: "zebra",
  },
  {
    name: "Faux Wood Blinds",
    desc: "Classic style with durable, low-maintenance finishes.",
    type: "fauxwood",
  },
];

const services = [
  { icon: Ruler, title: "Precision Measure", desc: "Free in-home measurements across Metro Vancouver." },
  { icon: SunMedium, title: "Design Consult", desc: "Fabric, opacity, and hardware guidance to match your space." },
  { icon: Cog, title: "Motorization", desc: "LL OneTouch™ setup and smart-home integration ready." },
  { icon: Wrench, title: "Pro Install", desc: "Clean, insured installation—done right the first time." },
];

function ShadePreview({ type }: { type: string }) {
  if (type === "roller") {
    return (
      <div className="relative h-36 w-full overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <div className="absolute left-0 right-0 top-0 h-3 bg-neutral-300" />
        <div className="absolute left-7 right-7 top-3 bottom-4 rounded-b-lg border border-neutral-200 bg-neutral-100 shadow-sm" />
      </div>
    );
  }

  if (type === "zebra") {
    return (
      <div className="relative h-36 w-full overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <div className="absolute left-0 right-0 top-0 h-3 bg-neutral-300" />
        <div className="absolute left-7 right-7 top-3 bottom-4 overflow-hidden rounded-b-lg border border-neutral-200 bg-white">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className={`h-[16px] ${i % 2 === 0 ? "bg-neutral-200" : "bg-white"}`}
            />
          ))}
        </div>
      </div>
    );
  }

  if (type === "fauxwood") {
    return (
      <div className="relative h-36 w-full overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <div className="absolute left-0 right-0 top-0 h-3 bg-neutral-300" />
        <div className="absolute left-6 right-6 top-5 bottom-5 rounded-lg border border-neutral-200 bg-neutral-50 p-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="mb-[6px] h-[10px] rounded-sm bg-neutral-300 last:mb-0" />
          ))}
        </div>
      </div>
    );
  }

  return null;
}

export default function ShadeMasterLanding() {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a[href^="#"]') as HTMLAnchorElement | null;
      if (!anchor) return;
      const id = anchor.getAttribute("href");
      if (id && id.startsWith("#")) {
        e.preventDefault();
        document.querySelector(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const stats = [
    { label: "5★ installs", value: "100+ building projects", icon: Star },
    { label: "Years experience", value: "5+", icon: ShieldCheck },
    { label: "Cities served", value: "20+", icon: MapPin },
  ];

  const timeline = [
    {
      step: "1. Quick call or form",
      desc: "Tell us about your windows, timeline, and style.",
    },
    {
      step: "2. In-home design visit",
      desc: "We bring samples, measure precisely, and quote on the spot.",
    },
    {
      step: "3. Professional install",
      desc: "We handle the heavy lifting so you just enjoy the results.",
    },
  ];

  const areas = [
    "Vancouver",
    "North & West Vancouver",
    "Burnaby",
    "New Westminster",
    "Coquitlam / Tri-Cities",
    "Richmond",
    "Surrey & Langley",
  ];

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">
      <header
        className="sticky top-0 z-50 w-full border-b border-neutral-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/80"
        id="home"
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <a href="#home" className="flex items-center gap-3">
            <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600">
              <Image
                src="/shademaster-logo Nav.png"
                alt="ShadeMaster Blinds logo"
                fill
                className="object-contain p-1 brightness-0 invert"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold tracking-wide text-neutral-900">
                ShadeMaster Blinds LTD.
              </span>
              <span className="text-xs text-neutral-600">Vancouver • Since 2021</span>
            </div>
          </a>

          <nav className="hidden items-center gap-6 md:flex">
            {navItems.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="text-sm text-neutral-700 transition hover:text-neutral-900"
              >
                {n.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <a href="#contact">
              <Button size="sm" className="rounded-2xl bg-sky-500 hover:bg-sky-600 text-white">
                Free Quote
              </Button>
            </a>
          </div>
        </div>
      </header>

      <section className="w-full border-b border-neutral-200 bg-gradient-to-b from-sky-50 to-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:py-16">
          <div>
            <Badge className="border border-blue-200 bg-blue-100 text-sky-700">
              Metro Vancouver • Mobile Showroom
            </Badge>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-5xl">
              Premium custom window coverings—
              <span className="text-sky-500"> designed, measured,</span> & installed.
            </h1>
            <p className="mt-4 text-base text-neutral-700 md:text-lg">
              ShadeMaster Blinds LTD. helps homeowners and designers across Metro Vancouver find
              the perfect roller, zebra, and motorized shades—without the showroom hassle.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <a href="#contact">
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-2xl border-neutral-300 bg-white text-neutral-900"
                >
                  Book Free Measure
                </Button>
              </a>
              <div className="flex items-center gap-3 text-sm text-neutral-600">
                <div className="flex -space-x-2">
                  <div className="h-7 w-7 rounded-full border border-white bg-sky-200" />
                  <div className="h-7 w-7 rounded-full border border-white bg-sky-300" />
                  <div className="h-7 w-7 rounded-full border border-white bg-blue-200" />
                </div>
                <span>400+ windows measured & installed locally</span>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-6 text-sm text-neutral-600">
              {stats.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100">
                    <s.icon className="h-4 w-4 text-sky-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-900">{s.value}</p>
                    <p className="text-xs text-neutral-600">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <Card className="rounded-2xl border-neutral-200 bg-white/80 backdrop-blur">
              <CardContent className="p-4 md:p-5">
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
                  <Image
                    src="/hero.jpg"
                    alt="Custom roller and zebra shades in a modern Vancouver condo"
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
                <p className="mt-3 text-xs text-neutral-600">
                  Real ShadeMaster install • Vancouver condo • Roller & zebra combo
                </p>
                <div className="mt-4 grid grid-cols-2 gap-4 text-xs text-neutral-600">
                  <div>
                    <p className="font-semibold text-neutral-900">Popular for</p>
                    <p>Condos • Townhomes • Single family homes</p>
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-900">Controls</p>
                    <p>Chain • Cordless • Motorized (LL OneTouch™)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="products" className="w-full border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Blinds & shades we install every day
              </h2>
              <p className="mt-2 text-neutral-600">
                Top choices for condos, townhomes, and single-family homes across Metro Vancouver.
              </p>
            </div>
            <p className="max-w-md text-sm text-neutral-600">
              Every product is measured to the millimeter and installed cleanly—no light gaps, no
              guesswork.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {products.map((p, i) => (
              <Card
                key={i}
                className="overflow-hidden rounded-2xl border-neutral-200 bg-white transition hover:bg-white/80"
              >
                <CardContent className="p-4">
                  <ShadePreview type={p.type} />
                </CardContent>
                <CardHeader className="pt-0">
                  <CardTitle className="text-base font-semibold">{p.name}</CardTitle>
                </CardHeader>
                <CardContent className="text-neutral-600">
                  <p className="text-sm">{p.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="services" className="w-full border-b border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                We measure & install
              </h2>
              <p className="mt-2 text-neutral-600">
                Everything from fabric samples to final adjustments, handled by ShadeMaster.
              </p>
            </div>
            <p className="max-w-md text-sm text-neutral-600">
              We bring physical samples to your home, measure every window, and provide clear
              pricing before we order anything.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {services.map((s, i) => (
              <Card key={i} className="rounded-2xl border-neutral-200 bg-white">
                <CardContent className="pt-5">
                  <div className="mb-3 inline-flex items-center justify-center rounded-xl border border-sky-100 bg-sky-50 p-3">
                    <s.icon className="h-5 w-5 text-sky-600" />
                  </div>
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-neutral-600">{s.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="gallery" className="w-full border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Recent projects around Greater Vancouver
              </h2>
              <p className="mt-2 text-neutral-600">
                A peek at our latest work in condos, townhomes, and custom homes.
              </p>
            </div>
            <p className="max-w-md text-sm text-neutral-600">
              Full gallery coming soon. For now, ask us to bring photos and examples that match your
              style.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">

<div className="relative aspect-square overflow-hidden rounded-xl border border-neutral-200">
  <Image
    src="/projects/project1.JPEG"
    alt="Roller shades installation Vancouver"
    fill
    className="object-cover"
  />
</div>

<div className="relative aspect-square overflow-hidden rounded-xl border border-neutral-200">
  <Image
    src="/projects/project2.JPEG"
    alt="Zebra shades condo install"
    fill
    className="object-cover"
  />
</div>

<div className="relative aspect-square overflow-hidden rounded-xl border border-neutral-200">
  <Image
    src="/projects/project3.jpg"
    alt="Faux wood blinds installation"
    fill
    className="object-cover"
  />
</div>

</div>
        </div>
      </section>

      <section id="about" className="w-full border-b border-neutral-200 bg-neutral-50">
        <div className="mx-auto grid max-w-6xl items-start gap-12 px-4 py-12 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] md:py-16">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Family-run, Vancouver-based, detail-obsessed
            </h2>
            <p className="mt-3 text-neutral-600">
              ShadeMaster Blinds LTD. is a local team focused on clean installs, honest quotes, and
              designs that feel like they were built for your home—not pulled off a shelf.
            </p>
            <ul className="mt-6 space-y-4 text-neutral-700">
              <li className="flex gap-3">
                <ShieldCheck className="mt-1 h-5 w-5 text-sky-600" />
                <div>
                  <p className="font-semibold">No-pressure quoting</p>
                  <p className="text-sm text-neutral-600">
                    We’ll give you clear pricing and options—you decide when you’re ready.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <Cog className="mt-1 h-5 w-5 text-sky-600" />
                <div>
                  <p className="font-semibold">Smart-home ready</p>
                  <p className="text-sm text-neutral-600">
                    LL OneTouch™ motorization with options for app, remote, or voice control.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <MapPin className="mt-1 h-5 w-5 text-sky-600" />
                <div>
                  <p className="font-semibold">Metro Vancouver coverage</p>
                  <p className="text-sm text-neutral-600">
                    From North Shore to Vancouver, Tri-Cities, Richmond, and Surrey/Langley.
                  </p>
                </div>
              </li>
            </ul>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-neutral-200 bg-white p-6">
              <h3 className="text-lg font-semibold">How a typical project works</h3>
              <div className="mt-4 space-y-4 text-sm text-neutral-600">
                {timeline.map((t, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="mt-1">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-sky-100 bg-sky-50 text-xs font-semibold text-sky-700">
                        {i + 1}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900">{t.step}</p>
                      <p>{t.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-neutral-500">
                *Integration depends on hardware; ask us for details.
              </p>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-white p-6">
              <h3 className="text-lg font-semibold">Typical lead times</h3>
              <div className="mt-4 grid grid-cols-3 gap-3 text-sm text-neutral-600">
                <div>
                  <p className="font-semibold text-neutral-900">Roller / Zebra</p>
                  <p>2–4 weeks</p>
                </div>
                <div>
                  <p className="font-semibold text-neutral-900">Faux Wood</p>
                  <p>2–4 weeks</p>
                </div>
                <div>
                  <p className="font-semibold text-neutral-900">Motorized</p>
                  <p>3–6 weeks</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Testimonials
              </h2>
              <p className="mt-2 text-neutral-600">
                We’re currently working on adding client reviews and recent feedback here.
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-neutral-200 bg-neutral-50 p-8 text-center">
            <p className="text-lg font-semibold text-neutral-900">Testimonials coming soon</p>
            <p className="mt-3 text-neutral-600">
              We are working on this section and will be adding real customer feedback soon.
            </p>
            <span className="mt-5 inline-block rounded-full bg-neutral-200 px-4 py-1 text-sm font-medium text-neutral-700">
              Coming soon
            </span>
          </div>
        </div>
      </section>

      <section id="contact" className="w-full bg-neutral-50">
        <div className="mx-auto grid max-w-6xl items-start gap-10 px-4 py-12 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:py-16">
          <div className="space-y-6">
            <div className="rounded-3xl border border-neutral-200 bg-white p-6 md:p-7">
              <h3 className="text-2xl font-semibold">Book your free in-home measure</h3>
              <p className="mt-1 text-neutral-600">
                We’ll bring fabric samples, measure every window, and provide a clear quote.
              </p>
              <div className="mt-6 grid gap-4 text-sm text-neutral-600">
                <div className="flex items-center gap-3">
                  <PhoneCall className="h-4 w-4 text-sky-600" />
                  <span>(604) 360-6102</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-sky-600" />
                  <span>shade.master@outlook.com</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-sky-600" />
                  <span>Vancouver • Mobile across Metro Vancouver</span>
                </div>
              </div>

              <div className="mt-6">
                <p className="text-sm font-medium text-neutral-900">Areas we serve</p>
                <p className="mt-2 flex flex-wrap gap-1 text-sm text-neutral-600">
                  {areas.map((a, i) => (
                    <span key={i} className="inline-flex items-center gap-1">
                      {i !== 0 && <span>•</span>}
                      <span>{a}</span>
                    </span>
                  ))}
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-4 text-sm text-neutral-600">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-sky-600" />
                  <span>Insured installation</span>
                </div>
                <div className="flex items-center gap-2">
                  <SunMedium className="h-4 w-4 text-sky-600" />
                  <span>Light control & privacy experts</span>
                </div>
              </div>

              <div className="mt-6 space-y-3 text-sm text-neutral-600">
                <a
                  href="https://instagram.com/shademaster.blinds"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sky-600 hover:underline"
                >
                  <Instagram className="h-4 w-4" />
                  @shademasterblinds
                </a>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-neutral-200 bg-white p-6 md:p-7">
            <h3 className="text-xl font-semibold">Tell us about your project</h3>
            <p className="mt-3 text-neutral-600">
              Online project requests will be available soon.
            </p>

            <div className="mt-6 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
              <p className="text-sm text-neutral-500">This feature is coming soon.</p>
              <span className="mt-4 inline-block rounded-full bg-neutral-200 px-4 py-1 text-sm font-medium text-neutral-700">
                Coming soon
              </span>
            </div>

            <p className="mt-6 text-xs text-neutral-500">
              For now, please call, email, or message us on Instagram for project inquiries.
            </p>
          </div>
        </div>
      </section>

      <footer className="w-full border-t border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-6 md:flex-row md:items-center">
          <div>
            <p className="font-medium">ShadeMaster Blinds LTD.</p>
            <p className="text-sm text-neutral-600">Design • Measure • Install • Motorize</p>
            <p className="mt-2 text-xs text-neutral-500">
              © {new Date().getFullYear()} ShadeMaster Blinds LTD. All rights reserved.
            </p>
          </div>
          <div className="space-y-1 text-sm text-neutral-600 md:text-right">
            <p className="flex items-center gap-2 md:justify-end">
              <MapPin className="h-4 w-4" /> Vancouver, BC
            </p>
            <p className="flex items-center gap-2 md:justify-end">
              <PhoneCall className="h-4 w-4" /> (604) 360-6102
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}