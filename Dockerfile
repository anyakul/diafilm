FROM python:3.8-slim as base


FROM base as builder

RUN apt-get update --yes --quiet \
    && apt-get install --yes --quiet --no-install-recommends \
               libpq-dev libjpeg62-turbo-dev zlib1g-dev

WORKDIR /app
COPY requirements /requirements
RUN python -m venv env \
    && env/bin/pip install -U pip \
    && env/bin/pip install --no-binary pydantic -r /requirements/base.txt \
    && env/bin/pip uninstall -y pip \
    && mkdir static && mkdir media


FROM base

# Version
ARG VERSION
# Port used by this container to serve HTTP.
EXPOSE 8000
# Set environment variables.
# 1. Force Python stdout and stderr streams to be unbuffered.
# 2. Set PORT variable that is used by Gunicorn. This should match "EXPOSE"
#    command.
ENV PYTHONUNBUFFERED=1 \
    PORT=8000 \
    DJANGO_SETTINGS_MODULE="application.settings.production" \
    PATH="/app/env/bin:${PATH}"

# User
ARG USER=wagtail
RUN useradd ${USER}
USER ${USER}

WORKDIR /app
COPY --from=builder --chown=${USER}:${USER} /app .
COPY --chown=${USER}:${USER} . .

RUN V=$(echo "${VERSION}" | grep -o "[0-9.]*") \
    && echo "Parsed version: ${V}" \
    && echo "VERSION = \"${V}\"" > application/version.py

ENTRYPOINT ["deploy/docker-entrypoint.sh"]
CMD ["gunicorn", "-c", "deploy/gunicorn.py.conf", "application.wsgi:application"]
