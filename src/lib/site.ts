/**
 * Site content and configuration.
 *
 * Every string in this file is copy that already existed in the project — it
 * was lifted verbatim out of the previous landing page, the layout metadata or
 * the estimate page. Nothing here is invented. Where a line is reused in a new
 * position, the comment says where it came from.
 */

export const SITE = {
  name: "ShadeMaster Blinds LTD.",
  /** layout.tsx metadata.description */
  description:
    "Premium custom window coverings — designed, measured & installed across Metro Vancouver.",
  /** header sub-label */
  location: "Vancouver • Since 2021",
  /** footer */
  tagline: "Design • Measure • Install • Motorize",
} as const

export const CONTACT = {
  phone: "(604) 360-6102",
  phoneHref: "tel:+16043606102",
  email: "shade.master@outlook.com",
  emailHref: "mailto:shade.master@outlook.com",
  instagram: "https://instagram.com/shademaster.blinds",
  instagramHandle: "@shademasterblinds",
  base: "Vancouver • Mobile across Metro Vancouver",
  city: "Vancouver, BC",
} as const

export const NAV = [
  { id: "home", label: "Home", kind: "section" },
  { id: "products", label: "Products", kind: "section" },
  { id: "services", label: "Services", kind: "section" },
  { id: "gallery", label: "Gallery", kind: "section" },
  { id: "about", label: "About", kind: "section" },
  { id: "contact", label: "Contact", kind: "section" },
  { id: "estimate", label: "Estimate", kind: "page", href: "/estimate" },
] as const

/** Ids the scroll-spy watches, in document order. */
export const SPY_IDS = [
  "home",
  "products",
  "services",
  "gallery",
  "about",
  "contact",
] as const

export const AREAS = [
  "Vancouver",
  "North & West Vancouver",
  "Burnaby",
  "New Westminster",
  "Coquitlam / Tri-Cities",
  "Richmond",
  "Surrey & Langley",
] as const

export const STATS = [
  { value: "100+ building projects", label: "5★ installs" },
  { value: "5+", label: "Years experience" },
  { value: "20+", label: "Cities served" },
] as const

export const PRODUCTS = [
  {
    id: "roller",
    name: "Roller Shades",
    desc: "Clean, modern, and customizable in hundreds of fabrics.",
  },
  {
    id: "zebra",
    name: "Zebra / Dual Shades",
    desc: "Light control with a sleek, contemporary look.",
  },
  {
    id: "fauxwood",
    name: "Faux Wood Blinds",
    desc: "Classic style with durable, low-maintenance finishes.",
  },
  {
    id: "motorized",
    name: "Motorization",
    /** services[].desc for Motorization */
    desc: "LL OneTouch™ setup and smart-home integration ready.",
  },
] as const

export const SERVICES = [
  {
    title: "Precision Measure",
    desc: "Free in-home measurements across Metro Vancouver.",
  },
  {
    title: "Design Consult",
    desc: "Fabric, opacity, and hardware guidance to match your space.",
  },
  {
    title: "Motorization",
    desc: "LL OneTouch™ setup and smart-home integration ready.",
  },
  {
    title: "Pro Install",
    desc: "Clean, insured installation—done right the first time.",
  },
] as const

export const TIMELINE = [
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
] as const

export const LEAD_TIMES = [
  { name: "Roller / Zebra", time: "2–4 weeks" },
  { name: "Faux Wood", time: "2–4 weeks" },
  { name: "Motorized", time: "3–6 weeks" },
] as const

export const GALLERY = [
  {
    src: "/projects/project1.JPEG",
    alt: "Roller shades installation Vancouver",
  },
  {
    src: "/projects/project2.JPEG",
    alt: "Zebra shades condo install",
  },
  {
    src: "/projects/project3.JPG",
    alt: "Faux wood blinds installation",
  },
] as const

/** Exact on-disk filenames — the old page referenced these with the wrong case,
 *  which works on Windows and breaks on a case-sensitive host.
 *
 *  public/hero.jpg is deliberately absent: despite its name and the old page's
 *  "Real ShadeMaster install • Vancouver condo" caption, the file is the logo on
 *  a plain background, not a photograph. It needs a real hero photo before it
 *  can be shown as one. */
export const ASSETS = {
  logoNav: "/shademaster-logo Nav.PNG",
  logoFull: "/shademaster-logo.png",
} as const
