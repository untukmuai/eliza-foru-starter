# Use the Node.js Alpine base image for the build stage
FROM node:23.8.0-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++ \
    && npm install -g pnpm@10.4.0

# Set the working directory
WORKDIR /app

# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml tsconfig.json ./

# Copy the rest of the application code
COPY ./src ./src

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the application
RUN pnpm build

# Create a new stage for the final image
FROM node:23.8.0-alpine

# Install runtime dependencies if needed
RUN apk add --no-cache \
    git \
    python3

# Set the working directory
WORKDIR /app

# Copy built artifacts and production dependencies from the builder stage
COPY --from=builder /app/package.json /app/
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/src /app/src
COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/tsconfig.json /app/
COPY --from=builder /app/pnpm-lock.yaml /app/

# Expose the application port
EXPOSE 3000

# Set the command to run the application
CMD ["pnpm", "start", "--non-interactive"]