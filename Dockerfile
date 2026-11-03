FROM node:24-alpine@sha256:a0b9bf06e4e6193cf7a0f58816cc935ff8c2a908f81e6f1a95432d679c54fbfd AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
RUN npm run prisma:generate
COPY tsconfig.json vitest.config.ts eslint.config.js .prettierrc.json ./
COPY src ./src
RUN npm run build

FROM node:24-alpine@sha256:a0b9bf06e4e6193cf7a0f58816cc935ff8c2a908f81e6f1a95432d679c54fbfd AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
# devDependencies such as eslint, vitest, tsx, and TypeScript are not copied
# into this image. The Prisma CLI is only a devDependency, but the container
# command runs `npm run prisma:migrate`, so install that CLI explicitly.
RUN npm ci --omit=dev \
  && npm install --no-save --omit=dev prisma@6.19.3 \
  && rm -rf node_modules/typescript \
  && rm -f node_modules/.bin/tsc node_modules/.bin/tsserver
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
RUN npx prisma generate
COPY --chown=node:node --from=build /app/dist ./dist
RUN chown -R node:node /app
USER node
EXPOSE 3000
CMD ["sh", "-c", "npm run prisma:migrate && npm start"]
