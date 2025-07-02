# ---- Base image ----
FROM node:20-alpine

# ---- Working directory ----
WORKDIR /app

# ---- Install dependencies ----
COPY package.json package-lock.json* ./
RUN npm install

# ---- Copy project files ----
COPY . .

# ---- Build Next.js app ----
RUN npm run build

# ---- Expose ports ----
EXPOSE 3000 3001

# ---- Run both frontend and backend ----
CMD ["sh", "-c", "node ws-server.js & npm run start"]
