# aka debian:stretch
FROM debian:9.2
MAINTAINER OUS AMG <erik@ousamg.io>

ENV DEBIAN_FRONTEND noninteractive
ENV LANGUAGE C.UTF-8
ENV LANG C.UTF-8
ENV LC_ALL C.UTF-8

RUN echo 'Acquire::ForceIPv4 "true";' | tee /etc/apt/apt.conf.d/99force-ipv4

# Install as much as reasonable in one go to reduce image size
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gnupg2 \
    python \
    python-dev \
    bash \
    curl \
    make \
    build-essential \
    gcc \
    supervisor \
    postgresql \
    postgresql-contrib \
    postgresql-client \
    libpq-dev \
    libffi-dev \
    ca-certificates \
    git \
    less \
    sudo \
    nano \
    nginx-light \
    htop \
    imagemagick \
    ghostscript \
    fontconfig && \
    echo "Additional tools:" && \
    curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - && echo "deb http://dl.yarnpkg.com/debian/ stable main" > /etc/apt/sources.list.d/yarn.list && \
    curl -sLk https://deb.nodesource.com/setup_8.x | bash - && \
    apt-get install -y -q nodejs yarn && \
    curl -SLk 'https://bootstrap.pypa.io/get-pip.py' | python && \
    curl -L https://github.com/tianon/gosu/releases/download/1.7/gosu-amd64 -o /usr/local/bin/gosu && chmod u+x /usr/local/bin/gosu && \
	echo "Google Chrome:" && \
	curl -sS -o - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - && \
    echo "deb https://dl-ssl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list && \
	apt-get -yqq update && \
    apt-get -yqq install google-chrome-stable && \
    echo "Cleanup:" && \
    apt-get clean && \
    apt-get autoclean && \
    rm -rf /var/lib/apt/lists/* && \
    cp -R /usr/share/locale/en\@* /tmp/ && rm -rf /usr/share/locale/* && mv /tmp/en\@* /usr/share/locale/ && \
    rm -rf /usr/share/doc/* /usr/share/man/* /usr/share/groff/* /usr/share/info/* /tmp/* /var/cache/apt/* /root/.cache

# Add our requirements files
COPY ./requirements.txt /dist/requirements.txt
COPY ./requirements-test.txt  /dist/requirements-test.txt
COPY ./requirements-prod.txt  /dist/requirements-prod.txt

# pip
RUN cd /dist && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir -r requirements-test.txt && \
    pip install --no-cache-dir -r requirements-prod.txt

# npm
# changes to package.json does a fresh install as Docker won't use it's cache
COPY ./package.json /dist/package.json
COPY ./yarn.lock /dist/yarn.lock

RUN cd /dist &&  \
    yarn install && \
    yarn cache clean

RUN mkdir -p /logs /socket /repo/imported/ /repo/incoming/ /repo/genepanels

# See .dockerignore for files that won't be copied
COPY . /ella
WORKDIR /ella

ENV PYTHONPATH="/ella/src:${PYTHONPATH}"

# Set production as default cmd
CMD supervisord -c /ella/ops/prod/supervisor.cfg
