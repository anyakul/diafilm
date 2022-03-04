# Получение кода (последний стабильный релиз)

    git clone git@gitlab.com:toptalo/diafilm.git
    cd diafilm
    git checkout tags/$(git tag --list 'v*' | tail -1)

# Запуск / обновление

    make start

или

    docker compose -p diafilms up -d

# Просмотр логов

    make logs

или

# Остановка

    make stop

или

    docker compose -p diafilms down

# Инициализация БД

    curl diafilms-dump-xxx.sql
    docker compose -p diafilms exec -i database \
           psql -U difailms diafilms < path/to/dump.sql

или

    curl diafilms-database-xxx.tar.gz
    docker compose -p diafilms exec -i database \
           pg_restore -Fc -c -U diafilms -d diafilms \
           < diafilms-database-xxx.pgdmp

# Медиа

Загружается в виде архива для релиза

    curl diafilms-media-xxx.tar.gz
    tar xvzf diafilms-media-xxx.tar.gz

# Индекс ElasticSearch

Тут надо будет расшарить порт 9200, 
по-умолчанию я этого не делаю


    npm i elasticdump
    curl diafilms-elasticsearch-xxx.json.gz
    gzcat diafilms-elasticsearch-xxx.json.gz \
          | node_modules/elasticdump/bin/elasticdump \
          --input=$ \
          --output=http://127.0.0.1:9200
  

# Бэкап

Для восстановления сайта помимо кода нужны

- БД (./db)


    docker compose -p diafilms exec -i database \
           sh -c "pg_dump -Fc -U diafilms -d diafilms" \
           > diafilms-database-$(date '+%Y%m%d-%H%M').pgdmp

- Загружаемые пользователями материалы (./media)


    tar cvzf \
        media \
        diafilms-media-$(date '+%Y%m%d-%H%M').tar.gz

- Индекс ElasticSearch


    npm i elasticdump
    elasticdump \
        --input=http://127.0.0.1:9200/diafilms \
        --output=$ \
        | gzip > diafilms-elasticsearch-$(date '+%Y%m%d-%H%M').json.gz

# Сборка (Только для внесения изменений)

    git lfs fetch --all
    make build

или

    docker compose build

# Первый запуск контейнера

    docker login registry.gitlab.com
    # username: gitlab.com username
    # password: gitlab.com api token (https://gitlab.com/-/profile/personal_access_tokens  ткнуть галку в `api`)
    git pull
    cp deploy/env.example ./.env
    docker-compose pull
    docker-compose up -d
