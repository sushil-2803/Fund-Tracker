FROM node:22-alpine AS build

WORKDIR /app


RUN npm ci --workspace=backend

COPY backend ./backend

RUN npm --prefix backend run build

FROM node:22-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app


COPY backend/package.json backend/package.json
RUN npm ci --workspace backend --omit=dev && npm cache clean --force
EXPOSE 3000
RUN npm --prefix backend run migrate
CMD ["npm", "--prefix", "backend", "start"]



