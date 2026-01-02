FROM node:22.20.0

WORKDIR /app

COPY package*.json ./

COPY . .
RUN npm install 

EXPOSE 3000
CMD ["sh", "-c", "npm run build && npm run dev"]