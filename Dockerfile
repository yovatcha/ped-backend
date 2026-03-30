FROM node:20-alpine

WORKDIR /app

# Install wget for healthchecks
RUN apk add --no-cache wget

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create required directories for Strapi
RUN mkdir -p public/uploads && \
  chmod -R 755 public

# Build Strapi admin panel
RUN NODE_ENV=production npm run build

# Expose Strapi port
EXPOSE 1337

# Set production environment
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=1337

# Health check for Strapi using wget
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:1337/_health || exit 1

# Start Strapi
CMD ["npm", "run", "start"]