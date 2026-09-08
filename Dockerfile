FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY app ./app
COPY actions ./actions
COPY components ./components
COPY config ./config
COPY lib ./lib
COPY shared ./shared
COPY public ./public
COPY auth.ts ./
COPY middleware.ts* ./
COPY next.config.ts tsconfig.json tailwind.config.ts postcss.config.mjs components.json next-env.d.ts ./
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY scripts/validate-production-env.mjs ./scripts/validate-production-env.mjs
COPY scripts/prepare_demo_reader.mjs ./scripts/prepare_demo_reader.mjs

EXPOSE 3000

CMD ["npm", "run", "start:production"]
