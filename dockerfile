FROM node:14

WORKDIR /usr/src/app

COPY package.json ./

RUN npm i

COPY . .

EXPOSE 8080
CMD [ "node", "bot.js"]
