FROM node:20-alpine

WORKDIR /app

# Salin package.json & package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Salin semua source code
COPY . .

# Expose port sesuai server.js
EXPOSE 4040

# Jalankan server.js
CMD ["node", "server.js"]
