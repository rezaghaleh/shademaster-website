/**
 * The ShadeMaster mark, traced from public/shademaster-logo.png: a headrail
 * bracket, four slats with their angled left tabs, and two cords with teardrop
 * pulls.
 *
 * The real logo files are flat navy-on-white PNGs, so they cannot sit on the
 * navy ground (they would render as a white box — which is what the old header
 * did). Redrawing the same geometry as SVG lets the mark live on the dark
 * ground, stay crisp at any size, and — the reason it matters here — lets its
 * slats actually lift during the brand intro. The full PNG lockup is still used
 * verbatim in the footer, on a light chip.
 */
export function LogoMark({
  size = 34,
  className = "",
  slatClassName,
}: {
  size?: number
  className?: string
  /** Per-slat class, used by the intro to lift them in sequence. */
  slatClassName?: (index: number) => string
}) {
  const slatY = [10.5, 19, 27.5, 36]

  return (
    <svg
      viewBox="0 0 64 52"
      width={size}
      height={(size * 52) / 64}
      className={className}
      fill="none"
      aria-hidden="true"
    >
      {/* headrail bracket */}
      <path
        d="M4 2h56v3.6H4zM4 2h3.4v44H4zM56.6 2H60v44h-3.4z"
        fill="currentColor"
      />

      {/* slats — angled tab on the left, long blade on the right */}
      {slatY.map((y, i) => (
        <g key={y} className={slatClassName?.(i)}>
          <path
            d={`M9 ${y + 6.2}L12.4 ${y}h5.1v6.2z`}
            fill="currentColor"
            opacity="0.9"
          />
          <rect
            x="20.4"
            y={y}
            width="34.6"
            height="6.2"
            fill="currentColor"
          />
        </g>
      ))}

      {/* cords + pulls */}
      <g stroke="currentColor" strokeWidth="1.1" opacity="0.55">
        <path d="M18.6 5.6v36.2" />
        <path d="M23.4 5.6v22.8" />
      </g>
      <circle cx="18.6" cy="43.2" r="1.9" fill="currentColor" opacity="0.55" />
      <circle cx="23.4" cy="29.8" r="1.9" fill="currentColor" opacity="0.55" />
    </svg>
  )
}

/** Mark + wordmark, the lockup used in the header, menu and intro. */
export function Logo({
  size = 30,
  className = "",
}: {
  size?: number
  className?: string
}) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} className="text-sky-brand shrink-0" />
      <span className="flex flex-col leading-none">
        <span className="display text-bone text-[0.98rem] tracking-[-0.045em]">
          ShadeMaster
        </span>
        <span className="hud text-faint mt-[3px] text-[0.52rem]">
          Blinds Ltd.
        </span>
      </span>
    </span>
  )
}
