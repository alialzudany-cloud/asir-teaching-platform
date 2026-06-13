FROM node:22-alpine

WORKDIR /app

COPY package.json ./
COPY server.js ./
COPY public ./public
COPY scripts ./scripts

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8020

RUN mkdir -p /app/data /app/uploads

EXPOSE 8020

CMD ["npm", "start"]
