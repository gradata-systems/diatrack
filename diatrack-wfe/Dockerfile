# Builds the Angular web app
# Ref: https://dev.to/avatsaev/create-efficient-angular-docker-images-with-multi-stage-builds-1f3n

FROM node:lts as build
WORKDIR /app

# Copy sources required for package installation
COPY . ./
RUN npm ci

# Build the app
RUN npm run build-prod --configuration=production

FROM nginx:alpine

# Remove default static files
RUN rm -rf /usr/share/nginx/html/*

# Copy Angular app to deployment image, to be served as static files
COPY --from=build /app/dist /usr/share/nginx/html/

# Override configuration file
COPY ./config/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

# Inject environment variables into `env.js` for use in Angular on bootstrap
CMD ["/bin/sh", "-c", "envsubst < /usr/share/nginx/html/assets/env.template.js > /usr/share/nginx/html/assets/env.js && exec nginx -g 'daemon off;'"]
