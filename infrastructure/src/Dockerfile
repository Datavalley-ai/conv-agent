FROM node:20-alpine
WORKDIR /app
COPY server/package.json ./
RUN npm i --omit=dev
COPY server/ ./
EXPOSE 3000
CMD ["node", "index.js"]
