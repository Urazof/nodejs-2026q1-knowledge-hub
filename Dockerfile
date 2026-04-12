FROM node:24 AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Copy Prisma schema first — needed for `prisma generate`
COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

FROM node:24-alpine AS production
ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
# prisma is now in dependencies, so it's installed here
RUN npm ci --omit=dev

# Copy generated Prisma client engine from build stage
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

# Copy schema + migrations (required by `prisma migrate deploy`)
COPY prisma ./prisma

COPY --from=build /app/dist ./dist

COPY start.sh ./start.sh

EXPOSE 4000
USER node
ENTRYPOINT ["sh", "./start.sh"]
