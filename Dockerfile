# =============================================================================
# ShadeMaster public site + admin UI (Next.js)
#
# Optional: Railway can build this project without Docker. It is here so the
# build is identical everywhere, and so the Node version is pinned by this file
# rather than by whatever the platform happens to default to.
# =============================================================================

# ---------------------------------------------------------------- deps stage
FROM node:22-alpine AS deps
WORKDIR /app

# Only the manifests, so this layer is cached until a dependency actually changes.
COPY package.json package-lock.json ./
RUN npm ci

# --------------------------------------------------------------- build stage
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* values are inlined into the client bundle at build time, not read
# at runtime, so they have to be present HERE. Passing them only as runtime
# environment variables is the classic mistake: the site builds, starts, looks
# fine, and every admin API call goes to localhost.
#
# NEXT_PUBLIC_ADMIN_API_BASE also determines the CSP's connect-src, so a wrong
# value here shows up as an admin UI that cannot reach its own backend.
ARG NEXT_PUBLIC_ADMIN_API_BASE
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_ADMIN_API_BASE=$NEXT_PUBLIC_ADMIN_API_BASE
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ------------------------------------------------------------- runtime stage
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Run as a non-root user rather than the default root.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# The standalone output carries its own minimal server and only the modules the
# app actually imports. static/ and public/ are not included in it and have to be
# copied alongside, or the site renders with no CSS and no images.
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

USER nextjs

ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

CMD ["node", "server.js"]
