FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Install dependencies first (optimizes build cache)
COPY package*.json ./
RUN npm install

# Copy all source files
COPY . .

# Expose port (Railway will inject PORT env var, but this is good practice)
EXPOSE 3000

# Start server
CMD ["npm", "start"]
