# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Avoid reinstalling deps when only app code changes
COPY package*.json ./
RUN npm ci

# Copy the rest
COPY . .

# Ensure public exists AND is non-empty so multi-stage COPY won't fail
RUN mkdir -p public && touch public/.keep

# Build
RUN npm run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Only production deps
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev

# App artifacts
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["npm","start"]
