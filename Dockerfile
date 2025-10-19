# Stage 1 - Install dependencies
FROM registry.access.redhat.com/ubi9/nodejs-22:latest AS deps
USER 0

# Install yarn and libs for building isolated-vm with node-gyp
RUN    curl --silent --location https://dl.yarnpkg.com/rpm/yarn.repo | tee /etc/yum.repos.d/yarn.repo \
    && dnf install -y brotli-devel yarn zlib-devel

COPY ./backstage.json ./package.json ./yarn.lock ./
COPY ./packages ./packages
COPY ./plugins ./plugins
COPY .yarnrc.yml ./
COPY .yarn/ ./.yarn

# Remove all files except package.json
RUN find packages plugins -mindepth 2 -maxdepth 2 \! -name "package.json" -exec rm -rf {} \+

RUN yarn install --immutable --network-timeout 600000
RUN chown 1001:0 ".yarn/install-state.gz"

# Stage 2 - Build packages
FROM registry.access.redhat.com/ubi9/nodejs-22:latest AS build
USER 0

# Install yarn
RUN    curl --silent --location https://dl.yarnpkg.com/rpm/yarn.repo | tee /etc/yum.repos.d/yarn.repo \
    && dnf install -y yarn \
    && git config --global --add safe.directory /opt/app-root/src

COPY . .
COPY --from=deps /opt/app-root/src .

RUN yarn tsc
RUN yarn build:backend

# Stage 3 - Build the actual backend image and install production dependencies
FROM ghcr.io/radiorabe/ubi9-minimal:0.10.1

ENV APP_ROOT=/opt/app-root \
    # The $HOME is not set by default, but some applications need this variable
    HOME=/opt/app-root/src \
    NPM_RUN=start \
    PLATFORM="el9" \
    NODEJS_VERSION=22 \
    NPM_RUN=start \
    NAME=backstage

ENV SUMMARY="RaBe Backstage Image" \
    DESCRIPTION="RaBe Backstage Image" \
    NPM_CONFIG_PREFIX=$HOME/.npm-global \
    PATH=$HOME/node_modules/.bin/:$HOME/.npm-global/bin/:$PATH

LABEL summary="$SUMMARY" \
      description="$DESCRIPTION" \
      io.k8s.description="$DESCRIPTION" \
      io.k8s.display-name="RaBe Backstage" \
      io.openshift.expose-services="8080:http" \
      io.openshift.tags="builder,$NAME,${NAME}${NODEJS_VERSION}" \
      io.openshift.s2i.scripts-url="image:///usr/libexec/s2i" \
      io.s2i.scripts-url="image:///usr/libexec/s2i" \
      com.redhat.dev-mode="DEV_MODE:false" \
      com.redhat.deployments-dir="${APP_ROOT}/src" \
      com.redhat.dev-mode.port="DEBUG_PORT:5858" \
      com.redhat.component="backstage" \
      name="radiorabe/backstage"

RUN    microdnf -y module disable nodejs \
    && microdnf -y module enable nodejs:$NODEJS_VERSION \
    && microdnf install -y --nodocs --setopt=install_weak_deps=0 \
         epel-release \
    && microdnf install -y --nodocs --setopt=install_weak_deps=0 \
         findutils \
         gzip \
         nodejs \
         nodejs-nodemon \
         nodejs-full-i18n \
         npm \
         python3.11 \
         python3.11-pip \
         shadow-utils \
         tar \
         yarnpkg \
    && ln /usr/bin/python3.11 /usr/bin/python \
    && ln /usr/bin/pydoc3.11 /usr/bin/pydoc \
    && ln /usr/bin/pip3.11 /usr/bin/pip \
    && pip install --no-cache \
         mkdocs \
         mkdocs-material \
         mkdocs-gen-files \
         mkdocs-literate-nav \
         mkdocs-section-index \
         mkdocs-autorefs \
         'mkdocstrings[python]' \
         mkdocs-techdocs-core \
         mkdocs-monorepo-plugin \
    && microdnf clean all \
    && useradd -u 1001 -r -g 0 -s /sbin/nologin \
         -c "Default Application User" default \
    && microdnf remove -y \
         libsemanage \
         shadow-utils

# Switch to nodejs user
RUN mkdir -p "$HOME" && chown -R 1001:0 "$APP_ROOT" && chmod -R ug+rwx "$APP_ROOT"
WORKDIR "$HOME"
USER 1001

# Copy the install dependencies from the build stage and context
COPY --from=build /opt/app-root/src/.yarn ./.yarn
COPY --from=build /opt/app-root/src/backstage.json /opt/app-root/src/package.json /opt/app-root/src/yarn.lock /opt/app-root/src/.yarnrc.yml /opt/app-root/src/packages/backend/dist/skeleton.tar.gz ./
RUN tar xzf skeleton.tar.gz && rm skeleton.tar.gz

# Install production dependencies, ignoring scripts so we don't need a node-gyp toolchain to rebuild binary modules
RUN YARN_ENABLE_SCRIPTS=false yarn workspaces focus --all --production && rm -rf "$(yarn cache clean)"
# Copy binary modules from build stage where we have proper toolchains
COPY --from=build --chown=1001:0 /opt/app-root/src/node_modules/isolated-vm    ./node_modules/isolated-vm
COPY --from=build --chown=1001:0 /opt/app-root/src/node_modules/ssh2           ./node_modules/ssh2
COPY --from=build --chown=1001:0 /opt/app-root/src/node_modules/cpu-features   ./node_modules/cpu-features

# Copy built module to image and submodule search path for https://github.com/radiorabe/rabe-backstage/issues/834
COPY --from=build --chown=1001:0 /opt/app-root/src/node_modules/better-sqlite3               ./node_modules/better-sqlite3
COPY --from=build --chown=1001:0 /opt/app-root/src/node_modules/better-sqlite3/build/Release ./node_modules/@backstage/backend-defaults/node_modules/better-sqlite3/Release

# Copy the built packages from the build stage
COPY --from=build /opt/app-root/src/packages/backend/dist/bundle.tar.gz .
RUN tar xzf bundle.tar.gz && rm bundle.tar.gz

# Copy any other files that we need at runtime
COPY ./app-config.yaml .
COPY ./app-config.production.yaml .

# The fix-permissions script is important when operating in environments that dynamically use a random UID at runtime, such as OpenShift.
# The upstream backstage image does not account for this and it causes the container to fail at runtime.
#RUN fix-permissions ./

CMD ["node", "packages/backend", "--config", "app-config.yaml", "--config", "app-config.production.yaml"]
