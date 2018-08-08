FROM node:alpine AS build

RUN apk update && apk add yarn

WORKDIR /app
COPY ["./src/", "./src/"]
COPY [".babelrc", "package.json", "yarn.lock", "./"]
RUN yarn install

FROM node:alpine AS runtime
LABEL version="1.1.0"
WORKDIR /app
COPY --from=build ["/app/node_modules/", "./node_modules/"]
COPY --from=build ["/app/src/", "./src/"]
COPY --from=build ["/app/.babelrc", "/app/package.json", "./"]
EXPOSE 3000
ENTRYPOINT ["npm", "start"]
