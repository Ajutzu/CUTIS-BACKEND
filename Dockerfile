# Use Node.js 20 LTS on Alpine (lightweight & secure)
FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy only package files first (for better caching)
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy the rest of the app source code
COPY . .

# Expose your app's port (default Express = 3000)
EXPOSE 3000

# Run the app
CMD ["node", "server.js"]
