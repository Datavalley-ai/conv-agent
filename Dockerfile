# Use Debian-based Node.js LTS for full compatibility
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files from app subdirectory
COPY app/package*.json ./

# Install dependencies
RUN npm install --only=production && npm cache clean --force

# Copy application code from app subdirectory
COPY app/ ./

# Create group and user with Debian commands
RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs -m nextjs

# Change ownership and switch to non-root user
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3000

# Health check with curl (pre-installed in node:20-slim)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl --fail http://localhost:3000/api/v1/healthz || exit 1

# Start the application
CMD ["node", "src/app.js"]
