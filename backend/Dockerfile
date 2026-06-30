FROM node:20-slim

RUN apt-get update && apt-get install -y \
    nmap \
    iproute2 \
    iputils-ping \
    dnsutils \
    net-tools \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY src ./src

RUN mkdir -p /app/data

EXPOSE 3001

CMD ["node", "src/index.js"]
