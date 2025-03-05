# Use a specific Node.js version for better reproducibility
FROM node:23.9-slim AS builder

USER node
USER root

COPY ./ssh-repo-key /home/node/.ssh/id_rsa
RUN chmod 600 /home/node/.ssh/id_rsa
RUN apt-get update && \
    apt-get install -y git python3 make g++ openssh-client && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
RUN ssh-keyscan github.com >> /home/node/.ssh/known_hosts
RUN chown -R node:node /home/node/.ssh

# Install pnpm globally and install necessary build tools
RUN npm install -g pnpm@10.4.0

# Set Python 3 as the default python
RUN ln -s /usr/bin/python3 /usr/bin/python

# Set the working directory
WORKDIR /app

# Copy package.json and other configuration files
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY tsconfig.json ./

# Copy the rest of the application code
COPY ./src ./src

# Create dist directory and set permissions
RUN mkdir -p /app/dist && \
    chown -R node:node /app && \
    chmod -R 755 /app

# Switch to node user
USER node

# Install dependencies and build the project
RUN pnpm install --frozen-lockfile
RUN pnpm build 

# # Create a new stage for the final image
FROM node:23.9-slim

# Install runtime dependencies if needed
RUN npm install -g pnpm@10.4.0
RUN apt-get update && \
    apt-get install -y git python3 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

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