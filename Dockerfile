# syntax=docker/dockerfile:1.7
FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies early to leverage Docker layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy application source
COPY . .

# Vite dev server needs to listen on all interfaces inside the container
ENV HOST=0.0.0.0
EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
