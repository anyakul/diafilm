from .base import *

# POSTGRES
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql_psycopg2',
        'NAME': config.DB_URL.path.strip("/"),
        'USER': config.DB_URL.user,
        'PASSWORD': config.DB_URL.password,
        'HOST': config.DB_URL.host,
        'PORT': config.DB_URL.port,
        'TEST_CHARSET': "utf8",
        'TEST_COLLATION': "utf8_general_ci",
    }
}

CACHES = {
    'default': {
        'BACKEND': "django_redis.cache.RedisCache",
        'LOCATION': config.CACHE_URL,
        'TIMEOUT': 900,
    },
    'renditions': {
        'BACKEND': "django_redis.cache.RedisCache",
        'LOCATION': config.CACHE_URL,
        'TIMEOUT': 3600,
        'OPTIONS': {
            'MAX_ENTRIES': 1000,
        },
    },
    'treenode': {
        'BACKEND': "django_redis.cache.RedisCache",
        'LOCATION': config.CACHE_URL,
        'TIMEOUT': 3600,
    },
}


try:
    from .local import *
except ImportError:
    pass
