# 참조: https://youtu.be/yIpDRI5cTdI?si=cLfllcWoQesWjqmP
# choose the proper node image.... https://hub.docker.com
FROM node:18-alpine as BUILD_IMAGE
WORKDIR /app/react-app

# Accept build arguments and set them as environment variables
ARG VITE_BASE_URL
ARG VITE_REACT_APP_SERVER_URL
ENV VITE_BASE_URL=${VITE_BASE_URL}
ENV VITE_REACT_APP_SERVER_URL=${VITE_REACT_APP_SERVER_URL}

#copy package.json
COPY package.json package-lock.json ./

# install all our packages
RUN npm install

# copy all our remaining files
COPY . .

# Finally build our project
RUN npm run build

# Here, we are implementing the multi-stage build. It greatly reduces our size
# it also won't expose our code in our container as we will only copy
# the build output from the first stage.


# beginning of second stage
FROM node:18-alpine as PRODUCTION_IMAGE
WORKDIR /app/react-app


# here, we are copying /app/react-app/dist folder from BUILD IMAGE to
# /app/react-app/dist in this stage.

# Why dist folder ????
# When we run pm run build, vite will generate dist directory that contents

# our build files
# COPY --from=BUILD_IMAGE /app/react-app/dist/ /app/react-app/dist/
COPY --from=BUILD_IMAGE /app/react-app/dist /app/react-app/dist

# to run npm commands as: npm run preview
# we need package.json
COPY package.json .
COPY vite.config.ts . 

# we also need typescript as this project is based on typescript
RUN npm install typescript && npm install -g vite

EXPOSE 8080
CMD [ "npm", "run", "preview" ]

# That's it ! We are good to go....

# docker build -t crypto-splitter-client:latest .
# docker images | grep crypto-splitter-client
# docker run -p 8080:8080 crypto-splitter-client:latest