# Use a specific Node.js version for better reproducibility (Alpine version)
FROM node:23.9-alpine AS builder

# Ensure we have root privileges for package installation
USER node
USER root

# Create the .ssh directory and copy your SSH key
RUN mkdir -p /home/node/.ssh
COPY ./ssh-repo-key /home/node/.ssh/id_rsa
RUN chmod 600 /home/node/.ssh/id_rsa

# Install required packages using apk
RUN apk update && apk add --no-cache git python3 make g++ openssh

# Add GitHub to known hosts so SSH works properly
RUN ssh-keyscan github.com >> /home/node/.ssh/known_hosts
RUN chown -R node:node /home/node/.ssh

# Install pnpm globally
RUN npm install -g pnpm@10.4.0

# Set Python 3 as the default python (Alpine installs python3 as /usr/bin/python3)
RUN ln -sf /usr/bin/python3 /usr/bin/python

# Set the working directory
WORKDIR /app

# Copy package configuration files
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY tsconfig.json ./

# Copy the rest of the application code
COPY ./src ./src

# Create dist directory and set appropriate permissions
RUN mkdir -p /app/dist && \
    chown -R node:node /app && \
    chmod -R 755 /app

# Switch to the non-root 'node' user
USER node

# Install dependencies and build the project
RUN pnpm install --frozen-lockfile
RUN pnpm build

# Create a new stage for the final image
FROM node:23.9-alpine

# Install runtime dependencies if needed
RUN npm install -g pnpm@10.4.0
RUN apk update && apk add --no-cache git python3

WORKDIR /app

# Copy built artifacts and production dependencies from the builder stage
COPY --from=builder /app/package.json /app/
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/src /app/src
COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/tsconfig.json /app/
COPY --from=builder /app/pnpm-lock.yaml /app/

EXPOSE 3000

# Set the command to run the application
CMD ["pnpm", "start", "--non-interactive"]