/**
 * Security headers for the public site and the admin UI.
 *
 * These are sent by the Next.js server. They are separate from, and additional to,
 * the ones Spring Security sends on the API — a browser talking to two origins
 * gets each origin's policy, so both have to be set.
 */

/**
 * The admin UI calls the API cross-origin, so a Content-Security-Policy that only
 * allowed 'self' would block every admin request with nothing in the UI to explain
 * why. The API origin is read from the same variable the client uses, so the policy
 * cannot drift from the thing it is describing.
 */
const apiOrigin = (() => {
  // An empty string is not nullish, so `?? default` does not catch it — and a
  // hosting panel that creates the variable before you fill it in supplies exactly
  // that. The build then died on `new URL("")` complaining the value was invalid,
  // which is a confusing way to say "you forgot to set it". Blank is treated as
  // unset, like any other absent configuration.
  const configured = process.env.NEXT_PUBLIC_ADMIN_API_BASE;
  const raw =
    typeof configured === "string" && configured.trim() !== ""
      ? configured.trim()
      : "http://localhost:8080";

  try {
    return new URL(raw).origin;
  } catch {
    // A value that is present but malformed is a different matter: it would produce
    // a policy that silently blocks every API call. Fail the build instead.
    throw new Error(
      `NEXT_PUBLIC_ADMIN_API_BASE is not a valid URL: ${JSON.stringify(raw)}. ` +
        `Expected an origin such as https://api.example.com`
    );
  }
})();

/**
 * next dev builds every module into an eval() call for hot reloading, so the
 * dev server cannot run at all under a policy without 'unsafe-eval' — the page
 * renders as static HTML and then every click does nothing, which is a
 * miserable thing to debug. A production build contains no eval, so the
 * relaxation is scoped to development and never ships.
 */
const isDev = process.env.NODE_ENV === "development";

const csp = [
  "default-src 'self'",
  // 'unsafe-inline' is required: the App Router inlines hydration and streaming
  // scripts, and there is no nonce plumbed through a static export. It still
  // pins every *external* script origin out, which is the common XSS delivery
  // route. Tightening this further means adding a nonce middleware.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigin}`,
  // The invoice PDF opens in a blob URL.
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // Nothing here should ever be framed — this is the clickjacking control.
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

/** Applied to every route. */
const baseHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "geolocation=(), camera=(), microphone=(), payment=(), usb=()",
  },
  {
    // Ignored by browsers over plain http, so this is inert locally and takes
    // effect as soon as the site is served over TLS.
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
];

/**
 * Keeps a route out of search results.
 *
 * <p>Deliberately a header rather than a robots.txt Disallow: a Disallow line is a
 * public file that names the exact paths you would rather people did not visit,
 * which is the opposite of what it is being used for here. X-Robots-Tag tells the
 * crawler the same thing without publishing a list of interesting URLs.
 */
const noIndex = [
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Traces the modules actually imported and emits a self-contained server, so
  // the runtime image carries those rather than all of node_modules. Purely
  // additive: `next start` behaves exactly as before when not using Docker.
  output: "standalone",

  // Removes "X-Powered-By: Next.js" — free version disclosure otherwise.
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: baseHeaders,
      },
      {
        // Never cached anywhere: an admin screen holds customer names, addresses
        // and prices, and a shared or proxy cache has no business keeping them.
        source: "/admin/:path*",
        headers: [
          ...noIndex,
          { key: "Cache-Control", value: "no-store, max-age=0, must-revalidate" },
        ],
      },
      {
        source: "/admin",
        headers: [
          ...noIndex,
          { key: "Cache-Control", value: "no-store, max-age=0, must-revalidate" },
        ],
      },
      {
        // The pre-quote calculator is unlinked from the public site; this stops
        // search engines putting it back in front of customers.
        source: "/estimate",
        headers: noIndex,
      },
    ];
  },
};

export default nextConfig;
