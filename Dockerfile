FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY app ./app
COPY actions ./actions
COPY components ./components
COPY lib ./lib
COPY shared ./shared
COPY public ./public
COPY auth.ts ./
COPY middleware.ts* ./
COPY next.config.ts tsconfig.json tailwind.config.ts postcss.config.mjs components.json next-env.d.ts ./
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

CMD ["npm", "run", "start"]
