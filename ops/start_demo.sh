#!/bin/bash -eu

docker run -d \
    --name ${DEMO_NAME} \
    --user ${DEMO_USER}:${DEMO_GROUP} \
    -e VIRTUAL_HOST=${DEMO_NAME} \
    -e PORT=${DEMO_PORT} \
    -p ${DEMO_HOST_PORT}:${DEMO_PORT} \
    ${DEMO_OPTS} \
    ${DEMO_IMAGE}
docker exec ${DEMO_NAME} make dbreset
