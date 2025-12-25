FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build Strapi admin panel
RUN NODE_ENV=production npm run build

# Expose Strapi port
EXPOSE 1337

# Set production environment
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=1337

# Health check for Strapi
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:1337/_health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start Strapi
CMD ["npm", "run", "start"]