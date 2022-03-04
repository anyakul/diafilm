#!/usr/bin/env bash

# Multiarch
docker buildx build \
    --push \
    --platform linux/amd64,linux/arm64/v8 \
    --tag registry.truetug.info/diafilm.online/backend \
    .

# Run
# docker compose -f docker-compose.yml up
