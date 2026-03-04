FROM node:22-alpine

WORKDIR /app

# Instala dependências primeiro (cache Docker)
COPY package.json .
RUN npm install

# Copia o código fonte
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
