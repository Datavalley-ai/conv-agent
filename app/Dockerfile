FROM node:20-slim

WORKDIR /app

# Copy package files (no app/ prefix since we're in app directory)
COPY package*.json ./

# Install dependencies
RUN npm install --only=production && npm cache clean --force

# Copy application code (no app/ prefix)
COPY . ./

# Create group and user
RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs -m nextjs

# Change ownership and switch to non-root user
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port 8081 (not 3000)
EXPOSE 8081

# Health check for port 8081
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl --fail http://localhost:8081/api/v1/healthz || exit 1

# Start the application
CMD ["node", "src/app.js"]
