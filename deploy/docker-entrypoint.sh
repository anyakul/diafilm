#!/bin/bash

if [ "$1" = "gunicorn" ]; then
    env/bin/python manage.py collectstatic --noinput || exit 1
elif [ "$1" = "migrate" ]; then
    env/bin/python manage.py migrate --noinput || exit 1
else
    echo "Execute $1"
fi

exec "$@"
