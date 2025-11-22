FROM node:22.20.0

# Use the official Node image requested by the user.
WORKDIR /app

# Install dependencies early to leverage the Docker cache. Prefer npm ci when
# a lockfile is present for reproducible installs.
COPY package*.json ./
# Use npm install in the image build to ensure package-lock mismatch doesn't break the build
# RUN npm install

# Copy the rest of the application and build TypeScript
COPY . .
RUN npm install 

EXPOSE 3000
CMD ["sh", "-c", "npm run build && npm run dev"]