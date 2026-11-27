FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN DATABASE_URL="mysql://user:pass@localhost:3306/db" \
    ORIGIN="http://localhost:3000" \
    BETTER_AUTH_SECRET="build-only-placeholder-0123456789abcdef" \
    BETTER_AUTH_URL="http://localhost:3000" \
    PUBLIC_MAPBOX_TOKEN="build-only-placeholder-0123456789abcdef" \
    npm run build
RUN npm prune --omit=dev

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY package.json .
EXPOSE 3000
CMD ["node", "build"]