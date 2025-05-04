# Stage 1: Build environment
FROM node:lts-alpine AS frontend-build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy all files
COPY . .

# Build the app
RUN npm run build

# Stage 2: Production environment
FROM node:lts-alpine

WORKDIR /app

# Set environment variables
ENV NODE_ENV=production

# Copy built files from the previous stage
COPY --from=frontend-build /app/package*.json ./
COPY --from=frontend-build /app/node_modules ./node_modules
COPY --from=frontend-build /app/.next ./.next
COPY --from=frontend-build /app/public ./public
COPY --from=frontend-build /app/next.config.js ./

# Expose the port the app runs on
EXPOSE 3000

# Command to run the app
CMD ["npm", "start"] 