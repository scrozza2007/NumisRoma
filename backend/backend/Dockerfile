# Stage 1: Build the backend
FROM node:lts-alpine AS backend-build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Stage 2: Production image
FROM node:lts-alpine

WORKDIR /app

# Copy built files from previous stage
COPY --from=backend-build /app/package*.json ./
COPY --from=backend-build /app/node_modules ./node_modules
COPY --from=backend-build /app/src ./src

# Set environment variables
ENV NODE_ENV=production
ENV PORT=4000

# Expose the port the app runs on
EXPOSE 4000

# Command to run the app
CMD ["node", "src/index.js"] 