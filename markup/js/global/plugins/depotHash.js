/**
 * @name depotHash ~
 * @version 1.6.0
 * @author Виктор Дмитриевцев <v.dmitrievcev@designdepot.ru>
 * @see git@git.designdepot.ru:frontend/depotHash.git
 * @license MIT
 * @changes:
 * (fix) Поправил добавление хеша
 * (add) Добавил метод `create(hashSource)` Конвертирует источник в строку, добавляет `#!` в начало и возвращает её
 * (add) Добавил метод `replaceMatchedCompile(re, value, save)` Находит и заменяет значение параметра подходящего под регулярку
 * (add) Добавил метод `toObject(hashString)` Конвертирует строку хеша в объект
 */

(function ($) {
    'use strict';
    var CACHE_ARRAY = {};
    var CACHE_OBJECT = {};
    var CALLBACKS = [];

    function _clearHash(hash) {
        return hash ? hash.replace(/^[#]?[!]?/, '') : hash;
    }

    function _fromArray(array) {
        return array ? array.sort().join('&') : '';
    }

    function _fromObject(object) {
        return object ? _fromArray(Object.keys(object).reduce(function (result, key) {
            var value = object[key];
            var current = value === true ? key : key + '=' + value;
            if (Array.isArray(value)) {
                current = value.map(function (currentValue) {
                    return key + '=' + currentValue;
                });
            }
            return Array.prototype.concat(result, current);
        }, [])) : '';
    }

    function DepotHash() {
        var hash = this;

        window.addEventListener('hashchange', function (event) {
            function call(callback) {
                callback.call(null, event);
            }

            CALLBACKS.forEach(call);
        }, false);

        return hash;
    }

    DepotHash.prototype = {
        onChange: function (callback) {
            if (typeof callback === 'function') {
                CALLBACKS.push(callback);
            }

            return this;
        },

        offChange: function (callback) {
            var indexOfCallback = CALLBACKS.indexOf(callback);

            if (indexOfCallback !== -1) {
                CALLBACKS.splice(indexOfCallback, 1);
            }

            return this;
        },

        /**
         * Возвращает хеш строку
         * @param {Object|String} [target = window.location.hash] целевой объект (строка)
         * @return {String} хеш строка
         */
        get: function (target) {
            var hash;

            if (target) {
                if (target.hash) {
                    hash = _clearHash(target.hash);
                } else if (typeof target === 'string') {
                    hash = _clearHash(target);
                }
            } else if (target === undefined) {
                hash = _clearHash(window.location.hash);
            }

            return hash;
        },

        /**
         * Конвертирует источник в строку, добавляет `#!` в начало и возвращает её
         * @param {String|Array.<String>|Object} hashSource Исходная строка (объект, массив строк) хеша
         * @return {String} хеш строка
         */
        create: function (hashSource) {
            var hash = '#!';

            if (typeof hashSource === 'string' || typeof hashSource === 'number') {
                hash += hashSource;
            } else if (Array.isArray(hashSource)) {
                hash += _fromArray(hashSource);
            } else if (typeof hashSource === 'object') {
                hash += _fromObject(hashSource);
            }

            return hash;
        },

        /**
         * Устанавливает хеш строку, заменяя старую
         * @param {String|Array.<String>|Object} hashSource новая хеш строка
         * @param {Boolean} [save=false] тригирить ли событие hashchange
         * @return {String} хеш строка
         */
        set: function (hashSource, save) {
            var hash = this.create(hashSource);

            if (hash !== window.location.hash) {
                if (save) {
                    window.location.hash = hash;
                } else {
                    var currentLocation = window.location.toString().split('#')[0];
                    var newLocation = currentLocation + hash;
                    window.location.replace(newLocation);
                }
            }

            return hash;
        },

        /**
         * Добавляет хеш значение
         * @param {String|Array.<String>|Object} hashSource новая хеш строка
         * @param {Boolean} [save=false] тригирить ли событие hashchange
         * @return {String} хеш строка
         */
        add: function (hashSource, save) {
            var targetObject = this.toObject();
            var hashObject = this.toObject(hashSource);

            Object.keys(hashObject).forEach(function (key) {
                targetObject[key] = hashObject[key];
            });

            return this.set(targetObject, save);
        },

        /**
         * Заменяет старое значение на новое
         * @param {String} oldHash старое хеш значение
         * @param {String} newHash новое хеш значение
         * @param {Boolean} [save=false] тригирить ли событие hashchange
         * @return {String|Boolean} хеш строка или false если старое значение не найдено
         */
        replace: function (oldHash, newHash, save) {
            var oldIndex = this.indexOf(oldHash);
            var newIndex = this.indexOf(newHash);

            if (oldIndex !== -1 && newIndex === -1) {
                var hashArray = this.toArray();

                hashArray[oldIndex] = newHash;

                return this.set(hashArray, save);
            } else if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
                return this.remove(oldHash, save);
            } else if (oldIndex === -1 && newIndex === -1) {
                return this.add(newHash, save);
            }

            return false;
        },

        /**
         * Удаляет хеш значение из строки браузера
         * @param {String} hash искомое хеш значение
         * @param {Boolean} [save=false] тригирить ли событие hashchange
         */
        remove: function (hash, save) {
            var index = this.indexOf(hash);

            if (index !== -1) {
                var hashArray = this.toArray();

                hashArray.splice(index, 1);

                return this.set(hashArray, save);
            }

            return false;
        },

        /**
         * Очищает хеш строки браузера
         * @param {Boolean} [save=false] тригирить ли событие hashchange
         */
        clear: function (save) {
            return this.set('', save);
        },

        /**
         * Конвертирует строку хеша в массив
         * @param {String} [currentHash = location.hash] строка для конвертации
         */
        toArray: function (currentHash) {
            var hashArray = [];
            currentHash = currentHash || this.get();

            if (currentHash) {
                if (CACHE_ARRAY[currentHash]) {
                    hashArray = CACHE_ARRAY[currentHash];
                } else {
                    currentHash.split('&').forEach(function (hash) {
                        if (hashArray.indexOf(hash) === -1) {
                            hashArray = hashArray.concat([hash]);
                        }
                    });
                    CACHE_ARRAY[currentHash] = hashArray;
                }
            }

            return hashArray.concat();
        },

        /**
         * Конвертирует исходный хеш в объект
         * @param {String|Array.<String>|Object} [currentHash = location.hash] currentHash источник для конвертации
         */
        toObject: function (currentHash) {
            var hashObject = {};
            currentHash = currentHash || this.get();

            if (Array.isArray(currentHash)) {
                currentHash = _fromArray(currentHash);
            }

            if (typeof currentHash === 'string' || typeof currentHash === 'number') {
                if (CACHE_OBJECT[currentHash]) {
                    hashObject = CACHE_OBJECT[currentHash];
                } else {
                    currentHash.split('&').sort().forEach(function (hash) {
                        var keyValue = hash.split('=');
                        var key = keyValue[0];
                        var value = keyValue[1];

                        if (key !== '') {
                            if (hashObject[key] === undefined) {
                                hashObject[key] = value === undefined ? true : value;
                            } else {
                                var sourceValuesArray = Array.prototype.concat(hashObject[key]);
                                if (sourceValuesArray.indexOf(value) === -1) {
                                    hashObject[key] = Array.prototype.concat(sourceValuesArray, value);
                                }
                            }
                        }
                    });
                    CACHE_OBJECT[currentHash] = hashObject;
                }
            } else if (typeof currentHash === 'object') {
                hashObject = currentHash;
            }

            return $.extend(null, hashObject);
        },

        indexOf: function (hash) {
            var hashArray = this.toArray();
            return hash !== undefined && hashArray.length ? hashArray.indexOf(hash.toString()) : -1;
        },

        has: function (hash) {
            return hash instanceof RegExp ? !!this.getMatched(hash).length : this.indexOf(hash) !== -1;
        },

        /**
         * Находит и заменяет значение параметра подходящего под регулярку
         * @param {RegExp} re Регулярка для поиска
         * @param {String} value Новое значение
         * @param {Boolean} [save=false] тригирить ли событие hashchange
         */
        replaceMatchedCompile: function (re, value, save) {
            var hashArray = this.toArray();
            var replaced = false;

            function compileMatched(hash) {
                if (re.test(hash)) {
                    replaced = true;
                    return hash.replace(re, function (sourceHash, sourceValue) {
                        return sourceHash.replace(sourceValue, value);
                    });
                } else {
                    re.toString().replace(re, value);
                }

                return hash;
            }

            return this.set(hashArray.map(compileMatched), save);
        },

        /**
         * @name getMatchedCallback
         * @function
         * @param {String} value Текущий параметр хеша
         * @param {Array} matches Найденные подстроки
         */
        /**
         * Выполняет коллбэк функцию для всех найденных вхождений по регулярке
         * @param {RegExp} re Регулярка для поиска
         * @param {getMatchedCallback} callback Функция обратного вызова, вызывается для каждого параметра хеша
         */
        getMatched: function (re, callback) {
            var hashArray = this.toArray();
            var matched = [];

            function addMatched(value) {
                var matches = value.match(re);
                if (matches && value.length) {
                    matched.push(value);
                    if (typeof callback === 'function') {
                        callback.call(null, value, matches);
                    }
                }
            }

            hashArray.forEach(addMatched);

            return matched;
        },

        removeMatched: function (re, save) {
            var hashArray = this.toArray();
            var notMatched = [];

            function rmMatched(value) {
                if (!re.test(value) && value.length) {
                    notMatched.push(value);
                }
            }

            hashArray.forEach(rmMatched);

            return this.set(notMatched, save);
        },

        replaceMatched: function (re, hash, save) {
            var hashArray = this.toArray();
            var notMatched = [];

            function rmMatched(value) {
                if (!re.test(value) && value.length) {
                    notMatched.push(value);
                }
            }

            hashArray.forEach(rmMatched);

            if (hash !== undefined && hash.length) {
                notMatched.push(hash);
            }

            return this.set(notMatched, save);
        },

        /**
         * Выполняет коллбэк функцию когда в хеше есть совпадения с регуляркой
         * @param {RegExp} re Регулярка для поиска
         * @param callback Функция обратного вызова
         */
        whenMatched: function (re, callback) {
            var _this = this;
            var check = function () {
                if (_this.has(re)) {
                    _this.removeMatched(re);
                    callback.call(null);
                }
            };

            if (typeof callback === 'function') {
                check();
                this.onChange(check);
            }

            return this;
        }
    };

    $.depotHash = new DepotHash();
}(jQuery));
