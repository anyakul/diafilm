from .base import *

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-&zhcp7kzyz&gycdxg&w^jjpuf5$hlmhki3v6w(c37*shl%b9#l'

# SECURITY WARNING: define the correct hosts in production!
ALLOWED_HOSTS = ['*']

EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# STATIC_URL = "https://diafilms.designdepot.ru/static/"
# MEDIA_URL = "https://diafilms.designdepot.ru/media/"


LOGGING['loggers']['elasticsearch'] = {
    'handlers': ['console'],
    'level': 'DEBUG',
    'propagate': True,
}
# LOGGING['loggers']['django.db.backends'] = {
#     'handlers': ['console'],
#     'level': 'DEBUG',
# }

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'diafilms',
        'TEST_CHARSET': "utf8",
        'TEST_COLLATION': "utf8_general_ci",
        'USER': 'root',
        'PASSWORD': 'root',
        'HOST': '127.0.0.1',
        'PORT': '',
    }
}

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

RGDB_DSN = "dbname=diafilms host=localhost user=postgres password=psswd"

# ARQ
# from arq.constants import default_queue_name
#
# ARQ_QUEUES = {
#     default_queue_name: config.arq_dsn.redis_settings,
# }

try:
    from .local import *
except ImportError as exc:
    print("Import settings failed: %s", exc)
