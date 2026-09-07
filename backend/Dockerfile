FROM node:22-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app/backend

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY . ./

EXPOSE 3001
CMD ["npm", "start"]

