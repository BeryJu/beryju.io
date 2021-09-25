FROM debian as build

RUN apt-get update && apt-get install wget git -y

ARG HUGO_VERSION="0.87.0"
RUN wget --quiet "https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_${HUGO_VERSION}_Linux-64bit.deb" && \
    dpkg -i "hugo_${HUGO_VERSION}_Linux-64bit.deb"

COPY ./ /site
WORKDIR /site
RUN hugo --gc --minify

# Copy static files to Nginx
FROM nginx:alpine
COPY --from=build /site/public /usr/share/nginx/html
COPY ./nginx.conf /etc/nginx/nginx.conf

WORKDIR /usr/share/nginx/html
