# Ingeniux CMS MCP Server Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY dist ./dist
COPY .env.example ./

ENV NODE_ENV=production

# Expose default port (can be overridden)
EXPOSE 3000

CMD ["node", "dist/index.js"]