FROM node:20-slim

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy all source code INCLUDING src/ directory
COPY src   ./src
COPY public ./public

# Create non-root user
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -m nextjs
USER nextjs

# Expose port
EXPOSE 8081

# Start with experimental fetch flag
CMD ["node", "--experimental-fetch", "src/app.js"]
