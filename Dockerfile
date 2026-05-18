FROM node:24 AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

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
# npm install instead of npm ci: lockfile may lack platform-specific optional deps on Windows hosts
RUN npm install --omit=dev

# Copy generated Prisma client engine from build stage
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

# Copy schema + migrations (required by `prisma migrate deploy`)
COPY prisma ./prisma

COPY --from=build /app/dist ./dist

COPY start.sh ./start.sh

RUN mkdir -p /app/logs && chown -R node:node /app/logs

EXPOSE 4000
USER node
ENTRYPOINT ["sh", "./start.sh"]
