# 1) compila o site React
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install --no-fund --no-audit
COPY . .
RUN npm run build

# 2) serve o site com Nginx e repassa /api para o Node-RED
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
