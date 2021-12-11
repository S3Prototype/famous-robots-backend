FROM node:16
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json /usr/src/app
RUN npm install

COPY . /usr/src/app
EXPOSE 3100
CMD ["npm", "start"]