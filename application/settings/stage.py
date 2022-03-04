from .base import *

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-&zhcp7kzyz&gycdxg&w^jjpuf5$hlmhki3v6w(c37*shl%b9#l'

EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# POSTGRES
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql_psycopg2',
        'NAME': 'diafilms',
        'TEST_CHARSET': "utf8",
        'TEST_COLLATION': "utf8_general_ci",
        'USER': 'diafilms',
        'PASSWORD': 'Ws&t6kMsCVny',
        'HOST': '185.185.127.207',
        'PORT': '5432',
    }
}

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.memcached.MemcachedCache',
        'LOCATION': '127.0.0.1:11211',
        'TIMEOUT': 900,
    },
    'renditions': {
        'BACKEND': 'django.core.cache.backends.memcached.MemcachedCache',
        'LOCATION': '127.0.0.1:11211',
        'TIMEOUT': 3600,
        # only for redis
        # 'OPTIONS': {
        #     'MAX_ENTRIES': 1000,
        # },
    },
    'treenode': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    },
}

ALLOWED_HOSTS = [
    '95.217.209.1',
    '127.0.0.1',
    '.localhost',
    'diafilms.local',
    '.diafilms.designdepot.ru',
]


try:
    from .local import *
except ImportError:
    pass
