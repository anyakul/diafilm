"""
Django settings for application project.

Generated by 'django-admin startproject' using Django 3.2.7.

For more information on this file, see
https://docs.djangoproject.com/en/3.2/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/3.2/ref/settings/
"""

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
import os
import sys
from pprint import pprint
from typing import List, Optional, Set, Tuple, Union

from pydantic import (AnyUrl, BaseSettings, Field, PostgresDsn, RedisDsn,
                      validator)


class RedisSettings(RedisDsn):
    def __init__(self, *args, **kwargs):
        super(RedisSettings, self).__init__(*args, **kwargs)
        self.redis_settings = self.get_redis_settings()

    def get_redis_settings(self) -> "RedisSettings":
        from arq.connections import RedisSettings
        params = {
            "host": self.host,
            "port": int(self.port),
            "database": int(self.path.strip("/")),
            "password": self.password,
        }
        result = RedisSettings(**params)

        params = {
            "address": f"redis://{params['host']}:{params['port']}",
            "db": params["database"],
            "password": params["password"],
        }
        result.as_dict = lambda: params

        return result


class Settings(BaseSettings):
    BASE_URL: str = 'https://diafilm.online'
    SECRET_KEY: str = 'django-insecure-1s+gcnl3+03v7%)n*q737qitkwn506*j%vzrl0axm%qy2n3_i2'
    DEBUG: bool = True
    HOSTS: Union[str, List[str]] = "127.0.0.1,localhost"

    DB_URL: PostgresDsn = 'postgres://postgres:psswd@127.0.0.1:5432/diafilms'
    CACHE_URL: str = "redis://127.0.0.1:6379/0"
    EMAIL_URL: Optional[AnyUrl] = None  # smtps://info:psswd@diafilm.online

    SENTRY_URL: str = ""
    SENTRY_RATE: float = 1.0

    ES_INDEX: str = "diafilms"
    ES_URL: str = "127.0.0.1:9200"
    ES_TIMEOUT: str = "30s"

    EMAIL_BACKEND: str = "console"
    EMAIL_HOST: str = ""
    EMAIL_PORT: Optional[int]
    EMAIL_USE_TLS: Optional[bool]
    EMAIL_USER: str = ""
    EMAIL_PASSWORD: str = ""
    EMAIL_SUBJECT_PREFIX: str = ""

    MANAGERS: Union[str, List[Tuple[str, str]]] = "Sergey Trofimov <truetug@gmail.com>, Admin <admin@localhost>"

    @validator("HOSTS", pre=True)
    def hosts(cls, value):
        if isinstance(value, str):
            return [x.strip() for x in value.split(",")]

        return value

    @validator("MANAGERS", pre=True)
    def managers(cls, value):
        if isinstance(value, str):
            import re
            record_list = (
                re.findall(r"([^<]+)<([^>]+)>", x)[0]
                for x in value.split(",") if "@" in x
            )

            return [
                (k.strip(), v.strip())
                for k, v in record_list
            ]

        return value


config = CONFIG = Settings()

IS_RUNSERVER = sys.argv[0] == "runserver"

if config.DEBUG and IS_RUNSERVER:
    pprint(config.dict())


PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE_DIR = os.path.dirname(PROJECT_DIR)


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/3.2/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config.SECRET_KEY

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config.DEBUG

ALLOWED_HOSTS = list(config.HOSTS)


# Application definition

INSTALLED_APPS = [
    "django_filters",
    "wagtail_pointsblock",
    "wagtail_typograf",
    "treenode",
    "instance_selector",

    'core',
    'search',
    # 'projects',

    # 'wagtail_localize',
    # 'wagtail_localize.locales',
    'wagtail.contrib.styleguide',
    'wagtail.contrib.modeladmin',
    'wagtail.contrib.forms',
    'wagtail.contrib.redirects',
    'wagtail.embeds',
    'wagtail.sites',
    'wagtail.users',
    'wagtail.snippets',
    'wagtail.documents',
    'wagtail.images',
    'wagtail.search',
    'wagtail.admin',
    'wagtail.core',

    'modelcluster',
    'taggit',

    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

MIDDLEWARE = [
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    # 'django.middleware.locale.LocaleMiddleware',
    # 'core.middleware.DumbLocaleMiddleware',

    'wagtail.contrib.redirects.middleware.RedirectMiddleware',

    'htmlmin.middleware.HtmlMinifyMiddleware',
    'htmlmin.middleware.MarkRequestMiddleware',
]

ROOT_URLCONF = 'application.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [
            os.path.join(PROJECT_DIR, 'templates'),
            os.path.join(PROJECT_DIR, 'markup'),
        ],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'application.wsgi.application'


# Database
# https://docs.djangoproject.com/en/3.2/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.path.join(BASE_DIR, 'db.sqlite3'),
    }
}

# LOGGING
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,

    'formatters': {
        'simple': {
            'format': '%(levelname)s %(asctime)s %(message)s',
        },
        'verbose': {
            'format': '%(levelname)s %(asctime)s %(module)s %(process)d %(thread)d %(message)s',
        },
    },

    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse'
        }
    },

    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },

    'loggers': {
        'django.request': {
            'handlers': ['console'],
            'level': 'ERROR',
            'propagate': True,
        },
    },
}

# CACHE


# Password validation
# https://docs.djangoproject.com/en/3.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/3.2/topics/i18n/

LANGUAGE_CODE = 'ru-ru'

TIME_ZONE = 'Europe/Moscow'

USE_I18N = True

USE_L10N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/3.2/howto/static-files/

STATICFILES_FINDERS = [
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
]

STATICFILES_DIRS = [
    os.path.join(PROJECT_DIR, 'static'),
]

# ManifestStaticFilesStorage is recommended in production, to prevent outdated
# JavaScript / CSS assets being served from cache (e.g. after a Wagtail upgrade).
# See https://docs.djangoproject.com/en/3.2/ref/contrib/staticfiles/#manifeststaticfilesstorage
STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.ManifestStaticFilesStorage'

STATIC_ROOT = os.path.join(BASE_DIR, 'static')
STATIC_URL = '/static/'

MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
MEDIA_URL = '/media/'

# Security
X_FRAME_OPTIONS = 'SAMEORIGIN'


# Wagtail settings
WAGTAIL_SITE_NAME = config.BASE_URL
WAGTAIL_ALLOW_UNICODE_SLUGS = False

WAGTAIL_DATE_FORMAT = '%d.%m.%Y'
WAGTAIL_DATETIME_FORMAT = '%d.%m.%Y %H:%M'

WAGTAILIMAGES_MAX_UPLOAD_SIZE = 20 * 1024 * 1024

WAGTAIL_ENABLE_UPDATE_CHECK = False

# Base URL to use when referring to full URLs within the Wagtail admin backend -
# e.g. in notification emails. Don't include '/admin' or a trailing slash
BASE_URL = config.BASE_URL

# WAGTAIL_LOCALIZE
INSTALLED_APPS += []

# MIDDLEWARE += []

ELASTICSEARCH_INDEX = config.ES_INDEX
ELASTICSEARCH_DSL = config.ES_URL
ELASTICSEARCH_TIMEOUT = config.ES_TIMEOUT

ELASTICSEARCH_MAPPINGS = {
    # "dynamic": "strict",
    "dynamic": "true",
    "properties": {
        "word": {
            "type": "text",
            "analyzer": "ru",
        },
    }
}
ELASTICSEARCH_ANALYSIS = {
    "filter": {
        "russian_stop": {
            "type": "stop",
            "stopwords": "_russian_",
        },
        "russian_stemmer": {
            "type": "stemmer",
            "language": "russian",
        }
    },
    "analyzer": {
        "ru": {
            "tokenizer": "standard",
            "filter": [
                "lowercase",
                "russian_stop",
                "russian_stemmer",
            ]
        }
    }
}
ELASTICSEARCH_SETTINGS = {
  "settings": {
    "refresh_interval": "1s",
    "analysis": ELASTICSEARCH_ANALYSIS,
  },
  "mappings": ELASTICSEARCH_MAPPINGS,
}

# SVG
INSTALLED_APPS += ["wagtailsvg", "generic_chooser"]
WAGTAILSVG_UPLOAD_FOLDER = "svg"

# EMAIL
"""
from django.core.mail.backends import *
console|dummy|filebased|locmem|smtp
"""
if config.EMAIL_BACKEND:
    EMAIL_BACKEND = f"django.core.mail.backends.{config.EMAIL_BACKEND}.EmailBackend"
if config.EMAIL_HOST:
    EMAIL_HOST = config.EMAIL_HOST
if config.EMAIL_PORT:
    EMAIL_PORT = config.EMAIL_PORT

EMAIL_USE_TLS = config.EMAIL_USE_TLS
EMAIL_SUBJECT_PREFIX = config.EMAIL_SUBJECT_PREFIX

if config.EMAIL_USER:
    EMAIL_HOST_USER = config.EMAIL_USER
if config.EMAIL_PASSWORD:
    EMAIL_HOST_PASSWORD = config.EMAIL_PASSWORD

# ADMINS and MANAGERS
MANAGERS = config.MANAGERS

# SENTRY
if config.SENTRY_URL:
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration

    sentry_sdk.init(
        dsn=config.SENTRY_URL,
        integrations=[DjangoIntegration()],

        # Set traces_sample_rate to 1.0 to capture 100%
        # of transactions for performance monitoring.
        # We recommend adjusting this value in production.
        traces_sample_rate=config.SENTRY_RATE,

        # If you wish to associate users to errors (assuming you are using
        # django.contrib.auth) you may enable sending PII data.
        send_default_pii=False,
    )
