FROM node:slim

COPY app.js server.js package*.json ./
RUN npm install --only=production

EXPOSE 3000

CMD [ "npm", "start" ]