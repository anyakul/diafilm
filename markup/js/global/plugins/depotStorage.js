/**
 * @name depotStorage~
 * @version 1.2.1
 * @author Виктор Дмитриевцев <v.dmitrievcev@designdepot.ru>
 * @see git@git.designdepot.ru:frontend/depotStorage.git
 * @license MIT
 * @changes:
 * (fix) Подправил функцию `_getExpirationDate`
 */
(function ($) {
    'use strict';

    var CALLBACKS = [];
    var DEFAULTS = {
        type: 'local',
        path: '/'
    };

    function _encode(value) {
        var result;

        if (typeof value === 'object') {
            result = encodeURIComponent(JSON.stringify(value));
        } else {
            result = encodeURIComponent(value);
        }

        return result;
    }

    function _decode(value) {
        var decodedValue = decodeURIComponent(value);
        var result;

        try {
            result = JSON.parse(decodedValue);
        } catch (error) {
            if (decodedValue === 'NaN') {
                result = NaN;
            } else if (decodedValue !== 'undefined') {
                result = decodedValue;
            }
        }

        return result;
    }

    function _getMilliseconds(timeString) {
        var replaceResult = (timeString || '').toString().replace(/^([0-9.-]+)(Y|M|D|h|m|s|ms)$/, function (source, value, dimension) {
            var result = parseFloat(value);
            var timeFactor = 1;

            switch (dimension) {
                case 'Y':
                    timeFactor = 365 * 24 * 60 * 60 * 1000;
                    break;
                case 'M':
                    timeFactor = 30 * 24 * 60 * 60 * 1000;
                    break;
                case 'D':
                    timeFactor = 24 * 60 * 60 * 1000;
                    break;
                case 'h':
                    timeFactor = 60 * 60 * 1000;
                    break;
                case 'm':
                    timeFactor = 60 * 1000;
                    break;
                case 's':
                    timeFactor = 1000;
                    break;
                default:
                    timeFactor = 1;
            }

            return !isNaN(result) ? result * timeFactor : 0;
        });

        var floatResult = parseFloat(replaceResult);

        return !isNaN(floatResult) ? floatResult : 0;
    }

    function _getExpirationDate(timeString) {
        var dateTime = false;
        var ms = _getMilliseconds(timeString);

        if (ms) {
            dateTime = new Date();
            dateTime.setTime(dateTime.getTime() + ms);
        }

        return dateTime;
    }

    function _changeEvent(storage, type, name, originalEvent) {
        CALLBACKS.forEach(function (callback) {
            if (typeof callback === 'function') {
                callback.call(storage, type, name, originalEvent);
            }
        });
    }

    function _getDocumentCookies() {
        var cookies = $.depotProto.cleanObject();

        document.cookie.split(/\s?;\s?/).forEach(function (cookie) {
            var parts = cookie.match(/^([^=]+)=([^=;]+)$/);
            if (parts) {
                cookies[parts[1]] = parts[2];
            }
        });

        return cookies;
    }

    function DepotStorage() {
        var storage = this;

        $(window).on('storage.depotStorage', function (event) {
            _changeEvent(storage, 'local', event.originalEvent.key, event.originalEvent);
        });

        return storage;
    }


    DepotStorage.prototype = {
        onChange: function (callback) {
            if (typeof callback === 'function' && CALLBACKS.indexOf(callback) === -1) {
                CALLBACKS.push(callback);
            }
            return this;
        },

        offChange: function (callback) {
            if (typeof callback === 'function' && CALLBACKS.indexOf(callback) !== -1) {
                CALLBACKS.splice(CALLBACKS.indexOf(callback), 1);
            } else if (callback === 'all') {
                CALLBACKS = [];
            }

            return this;
        },

        setItem: function (name, value, options) {
            var storage = this;
            var success = false;

            var params = $.extend(true, {}, DEFAULTS, options);

            var stringValue = _encode(value);

            if (params.expires) {
                var expirationDate = _getExpirationDate(params.expires);
                params.expires = expirationDate ? expirationDate.toUTCString() : 0;
            }

            switch (params.type) {
                case 'cookie':
                    var cookie = name + '=' + stringValue;

                    if (params) {
                        Object.keys(params).forEach(function (param) {
                            var value = params[param];
                            if (param !== 'type') {
                                cookie += '; ' + param + '=' + value;
                            }
                        });
                    }

                    try {
                        document.cookie = cookie;
                        success = true;
                    } catch (error) {
                        console.error(error);
                    }

                    break;
                case 'session':
                    var session = _encode(
                        $.extend(true, params, {
                            value: stringValue
                        })
                    );

                    try {
                        sessionStorage.setItem(name, session);
                        success = true;
                    } catch (error) {
                        console.error(error);
                    }

                    break;
                default:
                    var local = _encode(
                        $.extend(true, params, {
                            value: stringValue
                        })
                    );

                    try {
                        localStorage.setItem(name, local);
                        success = true;
                    } catch (error) {
                        console.error(error);
                    }
            }

            _changeEvent(storage, params.type, name);

            return success;
        },

        getItem: function (name, type) {
            var storage = this;

            var item;

            if (typeof type === 'object') {
                type = type.type;
            }

            switch (type) {
                case 'cookie':
                    try {
                        var cookies = _getDocumentCookies();
                        if (cookies[name]) {
                            item = _decode(cookies[name]);
                        }
                    } catch (error) {
                        console.error(error);
                    }

                    break;
                case 'session':
                    try {
                        var sessionItem = _decode(sessionStorage.getItem(name));
                        if (sessionItem) {
                            if (typeof sessionItem === 'object') {
                                var sessionExpires = Date.parse(sessionItem.expires);
                                if (sessionExpires && sessionExpires < Date.now()) {
                                    storage.removeItem(name, type);
                                } else {
                                    item = _decode(sessionItem.value);
                                }
                            } else {
                                item = sessionItem;
                            }
                        }
                    } catch (error) {
                        console.error(error);
                    }

                    break;
                default:
                    try {
                        var localItem = _decode(localStorage.getItem(name));
                        if (localItem) {
                            if (typeof localItem === 'object') {
                                var localExpires = Date.parse(localItem.expires);
                                if (localExpires && localExpires < Date.now()) {
                                    storage.removeItem(name, type);
                                } else {
                                    item = _decode(localItem.value);
                                }
                            } else {
                                item = localItem;
                            }
                        }
                    } catch (error) {
                        console.error(error);
                    }
            }

            return item;
        },

        getItemMeta: function (name, type) {
            var meta;

            if (typeof type === 'object') {
                type = type.type;
            }

            switch (type) {
                case 'cookie':
                    break;
                case 'session':
                    try {
                        meta = _decode(sessionStorage.getItem(name));
                    } catch (error) {
                        console.error(error);
                    }
                    break;
                default:
                    try {
                        meta = _decode(localStorage.getItem(name));
                    } catch (error) {
                        console.error(error);
                    }
            }

            return meta;
        },

        removeItem: function (name, type, options) {
            var storage = this;

            if (typeof type === 'object') {
                type = type.type;
                options = type;
            }

            switch (type) {
                case 'cookie':
                    try {
                        var params = {
                            type: type,
                            expires: '-1Y'
                        };
                        if (options && options.domain) {
                            params.domain = options.domain;
                        }
                        storage.setItem(name, null, params);
                    } catch (error) {
                        console.error(error);
                    }
                    break;
                case 'session':
                    try {
                        sessionStorage.removeItem(name);
                    } catch (error) {
                        console.error(error);
                    }
                    break;
                default:
                    try {
                        localStorage.removeItem(name);
                    } catch (error) {
                        console.error(error);
                    }
            }

            _changeEvent(storage, type, name);
        },

        removeMatched: function (re, type) {
            var storage = this;

            if (typeof type === 'object') {
                type = type.type;
            }

            switch (type) {
                case 'cookie':
                    try {
                        var cookies = _getDocumentCookies();
                        Object.keys(cookies).forEach(function (name) {
                            if (new RegExp(re, 'i').test(name)) {
                                storage.removeItem(name, type);
                            }
                        });
                    } catch (error) {
                        console.error(error);
                    }
                    break;
                case 'session':
                    try {
                        Object.keys(sessionStorage).forEach(function (name) {
                            if (new RegExp(re, 'i').test(name)) {
                                sessionStorage.removeItem(name);
                            }
                        });
                    } catch (error) {
                        console.error(error);
                    }
                    break;
                default:
                    try {
                        Object.keys(localStorage).forEach(function (name) {
                            if (new RegExp(re, 'i').test(name)) {
                                localStorage.removeItem(name);
                            }
                        });
                    } catch (error) {
                        console.error(error);
                    }
            }

            _changeEvent(storage, type);
        },

        clear: function (type) {
            var storage = this;

            switch (type) {
                case 'cookie':
                    try {
                        var cookies = _getDocumentCookies();
                        Object.keys(cookies).forEach(function (name) {
                            storage.removeItem(name, type);
                        });
                    } catch (error) {
                        console.error(error);
                    }
                    break;
                case 'session':
                    try {
                        sessionStorage.clear();
                    } catch (error) {
                        console.error(error);
                    }
                    break;
                default:
                    try {
                        localStorage.clear();
                    } catch (error) {
                        console.error(error);
                    }
            }

            _changeEvent(storage, type);
        }
    };

    if (!navigator.cookieEnabled) {
        $.depotNotifications.warn({
            ru: 'Для полной функциональности этого сайта необходимо включить файлы cookie.',
            en: 'For full functionality of this site it is necessary to enable cookies.'
        }, {
            timeout: 60000
        });
    }

    $.depotStorage = new DepotStorage();
}(jQuery));
