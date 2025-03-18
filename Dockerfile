FROM node:18 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --frozen-lockfile
COPY . .
RUN npm run build --configuration=production

# Debug
RUN ls -l /app/dist/chat-app-ui/

FROM nginx:stable
WORKDIR /usr/share/nginx/html
RUN rm -rf ./* 

COPY --from=build /app/dist/chat-app-ui/browser/. /usr/share/nginx/html/  

# Debug
RUN ls -l /usr/share/nginx/html/

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]