/**
 * @name depotProto
 * @version 5.1.0
 * @author Виктор Дмитриевцев <v.dmitrievcev@designdepot.ru>
 * @see git@git.designdepot.ru:frontend/depotProto.git
 * @license MIT
 * @changes:
 * (add) добавил метод `matchMedia`
 * (add) добавил ограничение в пол года на отправку сообщений об ошибках
 * (add) добавил в шаблонизатор тег _{path|fallbackPath?} для вывода строк словаря (аналог self.getText(path, fallbackPath?))
 * (add) добавил третий необязательный аргумент в метод self.getText(path, fallbackPath?, dictionary?)) - `dictionary` - словарь по которому производится поиск
 * (add) добавил фильтр `escapeHTML` для фильтрации HTML
 * (add) добавил фильтр `split` для фильтрации HTML
 * (add) добавил возможность прокидывать свой фильтр через контекст `filters: {filterName: filter}`
 * (rename) переименовал внутреннею переменную `waitingDelaysCount` на `waitingDelaysQuantity`
 * (rename) переименовал внутренний метод `initExtensions` на `applyMixins`
 */

(function ($) {
    'use strict';
    var DELAYS = Object.create(null);
    var SCRIPTS = [];

    function now() {
        return performance && performance.now && performance.now() || Date.now && Date.now() || new Date().getTime();
    }

    function getType(target) {
        return Object.prototype.toString.call(target).slice(8, -1).toLowerCase();
    }

    function liteMD(args) {
        var tags = {
            '`': {
                set: 'border:1px solid;border-radius:.3em;padding:.1em.2em',
                reset: ''
            },
            '*': {
                set: 'font-weight:bolder',
                reset: ''
            },
            '_': {
                set: 'font-style:italic',
                reset: ''
            }
        };

        var result = [];
        var lastIndex = 0;
        var string = args.shift();
        var tagsRe = /([`*_])((?:(?!\1)[^`*_])+)\1(?![`*_A-zА-яЁё])/g;
        var argsRe = /%([Oosc]|(?:[0-9.]+)?[dif])/g;

        result.unshift(string.replace(tagsRe, function (sub, tagKey, text, index) {
            var tag = tags[tagKey];
            var subString = string.substring(lastIndex, index);
            var argsBefore = subString.match(argsRe);
            var argsBeforeLength = argsBefore ? argsBefore.length : 0;
            var argsInside = text.match(argsRe);
            var argsInsideLength = argsInside ? argsInside.length : 0;
            lastIndex = index;

            if (argsBeforeLength > 0) {
                for (var i = 0; i < argsBeforeLength; i += 1) {
                    result.push(args.shift());
                }
            }

            result.push(tag.set);

            if (argsInsideLength > 0) {
                for (var j = 0; j < argsInsideLength; j += 1) {
                    result.push(args.shift());
                }
            }

            result.push(tag.reset);

            return '%c' + text + '%c';
        }));

        return result.concat(args);
    }

    function deepTranslate(obj, language) {
        if (obj && getType(obj) === 'object' || getType(obj) === 'array') {
            var result = obj[language];

            if (result) {
                obj = result;
            } else if (!result && getType(obj) === 'object' || getType(obj) === 'array') {
                $.each(obj, function (key, value) {
                    if (value && getType(value) === 'object' || getType(value) === 'array') {
                        var deepResult = value[language];

                        if (deepResult) {
                            obj[key] = deepResult;
                        } else {
                            obj[key] = deepTranslate(value, language);
                        }
                    }
                });
            }
        }

        return obj;
    }

    function stripPasswords(data) {
        return JSON.parse(JSON.stringify(data)
            .replace(/"(pass[^"]*)":"([^"]*)"/ig, '"$1":"***"')
            .replace(/(pass[^/=]*)=([^&]*)/ig, '$1=***')
        );
    }

    function collectTelemetry(self) {
        var telemetry = Object.create(null);
        telemetry.build = self && self.BUILD || undefined;
        telemetry.timestamp = now();

        telemetry.scrollPositionX = window.scrollX;
        telemetry.scrollPositionY = window.scrollY;

        if (navigator) {
            telemetry.userAgent = navigator.userAgent;
            telemetry.cookieEnabled = navigator.cookieEnabled;

            if (navigator.connection) {
                telemetry.connectionSaveData = navigator.connection.saveData;
                telemetry.connectionDownlink = navigator.connection.downlink;
                telemetry.connectionEffectiveType = navigator.connection.effectiveType;
            }
        }

        if (screen) {
            telemetry.screenWidth = screen.width;
            telemetry.screenHeight = screen.height;
            telemetry.screenOrientation = screen.orientation.type;
        }

        return telemetry;
    }

    function arrayFromRange(range) {
        var array = [];
        var matches = range && range.match(/^([0-9-]+)\.\.([0-9-]+)$/);

        if (matches) {
            var start = parseInt(matches[1], 10);
            var end = parseInt(matches[2], 10);
            if (start <= end) {
                for (var i = start; i <= end; i += 1) {
                    array.push(i);
                }
            } else if (start > end) {
                for (var j = start; j >= end; j -= 1) {
                    array.push(j);
                }
            }
        }

        return array;
    }

    var depotProto = {
        pluginName: 'depotProto',

        DEBUG: !!window.location.host.match(/(127\.0\.0\.1|localhost|\.local|\.designdepot\.ru)/i),
        MARKUP: !!window.location.pathname.match(/\.html/i),
        BUILD: '<%= build %>',

        $WINDOW: $(window),
        $DOCUMENT: $(document),
        $HTML: $(document.documentElement),
        $BODY: $(document.body),
        $HTMLBODY: $([document.documentElement, document.body]),

        KEYS: {
            ARROW_DOWN: 40,
            ARROW_LEFT: 37,
            ARROW_RIGHT: 39,
            ARROW_UP: 38,
            ENTER: 13,
            ESCAPE: 27,
            SPACE: 32,
            TAB: 9
        },

        LANGUAGE: document.documentElement.lang || 'ru',

        defaults: {
            processingClassName: 'is-processing',
            selectedClassName: 'is-selected',
            visibleClassName: 'is-visible',
            activeClassName: 'is-active',
            getElementsOutside: false,
            dictionary: {
                month: {
                    0: {
                        full: {ru: 'Январь', en: 'January'},
                        plural: {ru: 'Января', en: 'January'},
                        short: {ru: 'Янв', en: 'Jan'}
                    },
                    1: {
                        full: {ru: 'Февраль', en: 'February'},
                        plural: {ru: 'Февраля', en: 'February'},
                        short: {ru: 'Фев', en: 'Feb'}
                    },
                    2: {
                        full: {ru: 'Март', en: 'March'},
                        plural: {ru: 'Марта', en: 'March'},
                        short: {ru: 'Мар', en: 'Mar'}
                    },
                    3: {
                        full: {ru: 'Апрель', en: 'April'},
                        plural: {ru: 'Апреля', en: 'April'},
                        short: {ru: 'Апр', en: 'Apr'}
                    },
                    4: {
                        full: {ru: 'Май', en: 'May'},
                        plural: {ru: 'Мая', en: 'May'},
                        short: {ru: 'Май', en: 'May'}
                    },
                    5: {
                        full: {ru: 'Июнь', en: 'June'},
                        plural: {ru: 'Июня', en: 'June'},
                        short: {ru: 'Июн', en: 'June'}
                    },
                    6: {
                        full: {ru: 'Июль', en: 'July'},
                        plural: {ru: 'Июля', en: 'July'},
                        short: {ru: 'Июл', en: 'July'}
                    },
                    7: {
                        full: {ru: 'Август', en: 'August'},
                        plural: {ru: 'Августа', en: 'August'},
                        short: {ru: 'Авг', en: 'Aug'}
                    },
                    8: {
                        full: {ru: 'Сентябрь', en: 'September'},
                        plural: {ru: 'Сентября', en: 'September'},
                        short: {ru: 'Сен', en: 'Sept'}
                    },
                    9: {
                        full: {ru: 'Октябрь', en: 'October'},
                        plural: {ru: 'Октября', en: 'October'},
                        short: {ru: 'Окт', en: 'Oct'}
                    },
                    10: {
                        full: {ru: 'Ноябрь', en: 'November'},
                        plural: {ru: 'Ноября', en: 'November'},
                        short: {ru: 'Ноя', en: 'Nov'}
                    },
                    11: {
                        full: {ru: 'Декабрь', en: 'December'},
                        plural: {ru: 'Декабря', en: 'December'},
                        short: {ru: 'Дек', en: 'Dec'}
                    }
                },
                weekday: {
                    0: {
                        full: {ru: 'Воскресенье', en: 'Sunday'},
                        short: {ru: 'Вс', en: 'Su'}
                    },
                    1: {
                        full: {ru: 'Понедельник', en: 'Monday'},
                        short: {ru: 'Пн', en: 'Mo'}
                    },
                    2: {
                        full: {ru: 'Вторник', en: 'Tuesday'},
                        short: {ru: 'Вт', en: 'Tu'}
                    },
                    3: {
                        full: {ru: 'Среда', en: 'Wednesday'},
                        short: {ru: 'Ср', en: 'We'}
                    },
                    4: {
                        full: {ru: 'Четверг', en: 'Thursday'},
                        short: {ru: 'Чт', en: 'Th'}
                    },
                    5: {
                        full: {ru: 'Пятница', en: 'Friday'},
                        short: {ru: 'Пт', en: 'Fr'}
                    },
                    6: {
                        full: {ru: 'Суббота', en: 'Saturday'},
                        short: {ru: 'Сб', en: 'Sa'}
                    }
                }
            },
            debounce: 300,
            extend: null,
            mixins: [],
            beforeInit: null,
            onInit: null
        },

        clamp: function (min, val, max) {
            return Math.max(min, Math.min(val, max));
        },

        getNameSpace: function () {
            return this.format('.${pluginName}-${hash}', this);
        },

        cleanObject: function () {
            var args = Array.prototype.slice.call(arguments).map(function (argument) {
                if (getType(argument) === 'array') {
                    var tmpObject = {};
                    $.each(argument, function (key, value) {
                        tmpObject[key] = value;
                    });
                    argument = tmpObject;
                }

                return argument;
            });

            var clean = Object.create(null);
            if (args.length) {
                clean = $.extend.apply($, [true, clean].concat(args));
            }

            return clean;
        },

        getInitialState: function () {
            return this.cleanObject();
        },

        getType: getType,

        now: now,

        prefersReducedMotion: function () {
            var prefers = false;

            if (window.matchMedia) {
                prefers = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            }

            return prefers;
        },

        error: function (source, force) {
            var self = this;
            var error = Object.create({
                message: undefined,
                name: undefined,
                description: undefined,
                number: undefined,
                filename: undefined,
                lineNumber: undefined,
                columnNumber: undefined,
                stack: undefined,
            });
            var sourceType = getType(source);
            if (sourceType === 'error') {
                $.each(error, function (key) {
                    if (source[key] !== undefined) {
                        error[key] = source[key];
                    }
                });
            } else if (sourceType === 'object') {
                error = $.extend(error, source);
            } else if (sourceType === 'string') {
                error.message = source;
                error.name = 'Error';
            }

            var errorData = {
                error: stripPasswords(error),
                telemetry: collectTelemetry(self)
            };

            var message = self.format('#{if name}${name}: #{endif}#{if number}${number} - #{endif}${message}', error);
            var _defaults = ['%c♦ %c%s:%c ' + message, 'color:#' + self.hash, 'color:tomato', self.pluginName, ''];

            Function.prototype.apply.call(
                console.error,
                console,
                liteMD(_defaults.concat(errorData))
            );

            return error;
        },

        warn: function () {
            var self = this;
            var pluginName = self.pluginName;
            var _arguments = Array.prototype.slice.call(arguments);
            if (!_arguments.length) {
                return;
            }
            var _text = _arguments.shift();
            var _defaults;

            if (typeof _text === 'string' && _text.indexOf('--debug') === 0) {
                if (!self.DEBUG) {
                    return undefined;
                }
                _text = _arguments.shift();
            }

            if (typeof _text === 'string' && _text.indexOf('::') === 0) {
                pluginName += _text;
                _text = _arguments.shift();
            }

            if (typeof _text === 'string') {
                _defaults = ['%c♦ %c%s:%c ' + _text, 'color:#' + self.hash, 'color:orange', pluginName, ''];
            } else {
                _defaults = ['%c♦ %c%s:%c', 'color:#' + self.hash, 'color:orange', pluginName, '', _text];
            }

            return Function.prototype.apply.call(
                console.warn,
                console,
                liteMD(_defaults.concat(_arguments))
            );
        },

        info: function () {
            var self = this;
            var pluginName = self.pluginName;
            var _arguments = Array.prototype.slice.call(arguments);
            if (!_arguments.length) {
                return;
            }
            var _text = _arguments.shift();
            var _defaults;

            if (typeof _text === 'string' && _text.indexOf('--debug') === 0) {
                if (!self.DEBUG) {
                    return undefined;
                }
                _text = _arguments.shift();
            }

            if (typeof _text === 'string' && _text.indexOf('::') === 0) {
                pluginName += _text;
                _text = _arguments.shift();
            }

            if (typeof _text === 'string') {
                _defaults = ['%c♦ %c%s:%c ' + _text, 'color:#' + self.hash, 'color:cyan', pluginName, ''];
            } else {
                _defaults = ['%c♦ %c%s:%c', 'color:#' + self.hash, 'color:cyan', pluginName, '', _text];
            }

            return Function.prototype.apply.call(
                console.info,
                console,
                liteMD(_defaults.concat(_arguments))
            );
        },

        log: function () {
            var self = this;
            var _arguments = Array.prototype.slice.call(arguments);
            var pluginName = self.pluginName;
            if (!_arguments.length) {
                return;
            }
            var _text = _arguments.shift();
            var _defaults;

            if (typeof _text === 'string' && _text.indexOf('--debug') === 0) {
                if (!self.DEBUG) {
                    return false;
                }
                _text = _arguments.shift();
            }

            if (typeof _text === 'string' && _text.indexOf('::') === 0) {
                pluginName += _text;
                _text = _arguments.shift();
            }

            if (typeof _text === 'string') {
                _defaults = ['%c♦ %c%s:%c ' + _text, 'color:#' + self.hash, 'color:dodgerblue;', pluginName, ''];
            } else {
                _defaults = ['%c♦ %c%s:%c', 'color:#' + self.hash, 'color:dodgerblue;', pluginName, '', _text];
            }

            return Function.prototype.apply.call(
                console.log,
                console,
                liteMD(_defaults.concat(_arguments))
            );
        },

        hashify: function (value, length) {
            var int = value;
            var magic = 2378757;
            if (typeof value === 'object' || typeof value === 'string' && !value.length) {
                value = JSON.stringify(value);
            }
            if (typeof value === 'function') {
                value = value.toString();
            }
            length = length ? length > 12 ? 12 : length : 6;
            if (typeof value === 'string') {
                int = 0;
                value.split('').forEach(function (currentValue, index) {
                    var charCode = currentValue.charCodeAt(0);
                    int += (charCode + index) / (magic + charCode);
                });
            } else if (typeof value === 'undefined' || typeof value === 'undefined') {
                int = Math.random();
            }
            return ((Math.abs(int) + 1) / (magic + int)).toString(16).substr(length * -1);
        },

        format: function (template, context) {
            var self = this;

            function getValue(valueToken, context) {
                var filters = {
                    hash: self.hashify,
                    plural: function filterPlural(quantity, one, two, many) {
                        var result;
                        var quantityString = quantity.toString();

                        if (quantityString.match(/([^1]|^)(1)$/)) {
                            result = one;
                        } else if (quantityString.match(/([^1]|^)([234])$/)) {
                            result = two === undefined ? '' : two;
                        } else {
                            result = many === undefined ? two === undefined ? '' : two : many;
                        }

                        return result;
                    },
                    digit: function filterDigit(number, fractionDigits) {
                        var stringNumber = fractionDigits === undefined ? number.toString() : number.toFixed(fractionDigits);
                        var partsNumber = stringNumber.split('.');
                        var ceilNumber = partsNumber[0];
                        var decNumber = partsNumber[1];

                        return number !== undefined ? ceilNumber
                            .split('')
                            .reverse()
                            .join('')
                            .split(/([0-9]{3})/)
                            .join(' ')
                            .split('').reverse()
                            .join('').trim() + (decNumber ? ',' + decNumber : '') : number;
                    },
                    ft: function filterFt(string) {
                        var defined = string !== undefined;
                        return defined ? string.toString().replace(/^[—]\s/ig, '&mdash;&nbsp;')
                            .replace(/\s[—]\s/ig, '&nbsp;&mdash;&thinsp;')
                            .replace(/[—]/ig, '&mdash;')
                            .replace(/([0-9])[x]+([0-9])/ig, '$1&times;$2')
                            .replace(/(?=[>])"([^"<>]+)"/ig, '&laquo;$1&raquo;')
                            .replace(/(^|\s|[^a-zа-яё0-9_-])([0-9]+|[a-zа-яё]{1,3})\s/ig, '$1$2&nbsp;') : string;
                    },
                    fixed: function filterFixed(number, digits, min) {
                        var fixed = number;

                        if (!isNaN(number)) {
                            fixed = parseFloat(number).toFixed(digits || 1);

                            if (min) {
                                fixed = parseFloat(fixed);
                            }
                        }

                        return fixed;
                    },
                    round: function filterRound(number) {
                        var notNaN = !isNaN(number);
                        return notNaN ? Math.round(number) : number;
                    },
                    zero: function filterZero(number) {
                        var parts = number.toString().split('.');
                        var intNumber = parseInt(parts[0], 10);
                        var floatNumber = parts[1] ? '.' + parts[1] : '';
                        var notNaN = !isNaN(number);
                        var notBig = intNumber < 10;
                        return notNaN && notBig ? ('0' + intNumber).substr(-2) + floatNumber : number;
                    },
                    split: function filterSplit(value, separator) {
                        var result = value;

                        if (getType(value) === 'string') {
                            result = value.split(separator ? separator : ',');
                        }

                        return result;
                    },
                    join: function filterJoin(value, separator) {
                        var result = value;

                        if (getType(value) === 'array') {
                            result = value.join(separator);
                        }

                        return result;
                    },
                    extra: function filterExtra(value) {
                        var result = [];

                        if (getType(value) === 'object') {
                            $.each(value, function (paramName, paramValue) {
                                result.push(paramName + '="' + paramValue + '"');
                            });
                        }

                        return result.join(' ');
                    },
                    default: function filterDefault(value, defaultToken) {
                        var result = value;

                        if (!value) {
                            if (defaultToken) {
                                var defaultValue = getValue(defaultToken, context);

                                if (defaultValue) {
                                    result = defaultValue;
                                } else {
                                    try {
                                        result = JSON.parse(defaultToken);
                                    } catch (error) {
                                        result = defaultToken;
                                    }
                                }
                            } else {
                                result = '';
                            }
                        }

                        return result;
                    },
                    substr: function filterSubstr(value, from, length) {
                        var result = value;

                        if (getType(value) === 'string') {
                            result = value.substr(from, length);
                        }

                        return result;
                    },
                    length: function filterLength(value) {
                        var result;
                        var valueType = getType(value);

                        if (valueType === 'array') {
                            result = value.length;
                        } else if (valueType === 'object') {
                            result = Object.keys(value).length;
                        } else if (valueType === 'string' || valueType === 'number') {
                            result = value.toString().length;
                        }

                        return result;
                    },
                    lower: function filterLower(value) {
                        return value !== undefined ? value.toString().toLowerCase() : value;
                    },
                    upper: function filterUpper(value) {
                        return value !== undefined ? value.toString().toUpperCase() : value;
                    },
                    date: function filterDate(rawDate, format) {
                        var result = rawDate;
                        if (rawDate) {
                            var date = getType(rawDate) === 'date' ? rawDate : new Date(rawDate);
                            var formatTemplate = format ? format.replace(/([a-z])/ig, '\${$1}') : '${Y}-${m}-${d}';
                            // https://docs.djangoproject.com/en/dev/ref/templates/builtins/#std:templatefilter-date
                            var context = {
                                // День
                                d: function () {
                                    // - Day of the month, 2 digits with leading zeros. '01' to '31'
                                    return getValue('d|zero', {d: date.getDate()});
                                },
                                j: function () {
                                    // - Day of the month without leading zeros. '1' to '31'
                                    return date.getDate();
                                },
                                D: function () {
                                    // - Day of the week, textual, 3 letters. 'Fri'
                                    return self.getText('weekday.' + date.getDay() + '.short');
                                },
                                l: function () {
                                    // Day of the week, textual, long. 'Friday'
                                    return self.getText('weekday.' + date.getDay() + '.full');
                                },
                                w: function () {
                                    // - Day of the week, digits without leading zeros. '0' (Sunday) to '6' (Saturday)
                                    return date.getDay();
                                },
                                N: function () {
                                    // - Day of the week, digits without leading zeros.	'1' (Monday) to '7' (Sunday)
                                    var dateDay = date.getDay();
                                    return dateDay === 0 ? 7 : dateDay + 1;
                                },
                                // Месяц
                                m: function () {
                                    // - Month, 2 digits with leading zeros. '01' to '12'
                                    return getValue('m|zero', {m: date.getMonth() + 1});
                                },
                                n: function () {
                                    // - Month without leading zeros. '1' to '12'
                                    return date.getMonth() + 1;
                                },
                                M: function () {
                                    // - Month, textual, 3 letters. 'Jan'
                                    return self.getText('month.' + date.getMonth() + '.short');
                                },
                                E: function () {
                                    // - Month, locale specific alternative representation usually used for long date representation. 'listopada' (for Polish locale, as opposed to 'Listopad')
                                    return self.getText('month.' + date.getMonth() + '.plural');
                                },
                                F: function () {
                                    // - Month, textual, long. 'January'
                                    return self.getText('month.' + date.getMonth() + '.full');
                                },
                                // Год
                                y: function () {
                                    // - Year, 2 digits. '99'
                                    return date.getFullYear().toString().substr(-2);
                                },
                                Y: function () {
                                    // - Year, 4 digits. '1999'
                                    return date.getFullYear();
                                },
                                // Время
                                H: function () {
                                    // Hour, 24-hour format. '00' to '23'
                                    return getValue('H|zero', {H: date.getHours()});
                                },
                                i: function () {
                                    // Minutes. '00' to '59'
                                    return getValue('i|zero', {i: date.getMinutes()});
                                },
                                s: function () {
                                    // Seconds, 2 digits with leading zeros. '00' to '59'
                                    return getValue('s|zero', {s: date.getSeconds()});
                                }
                            };
                            result = self.format(formatTemplate, context);
                        }

                        return result;
                    },
                    json: function filterJson(value) {
                        var result;
                        try {
                            result = JSON.stringify(value);
                        } catch (error) {
                            result = value;
                        }
                        return result;
                    },
                    escapeHTML: function filterEscapeHTML(value) {
                        var escapes = {
                            '&': '&amp',
                            '<': '&lt',
                            '>': '&gt',
                            '"': '&quot',
                            '\'': '&#39'
                        };
                        var re = /[&<>"']/g;
                        return value !== undefined && re.test(value) ? value.replace(re, function (char) {
                            return escapes[char];
                        }) : value;
                    }
                };

                var currentContext = self.cleanObject(context);
                var valueParts = valueToken.toString().split('|');
                var valuePath = valueParts.shift();
                var filtersChain = valueParts;

                var value = currentContext[valuePath];

                if (valuePath.indexOf('.') !== -1) {
                    $.each(valuePath.split('.'), function (i, subValueName) {
                        currentContext = currentContext[subValueName.trim()];
                        return !!currentContext;
                    });
                    value = currentContext;
                }

                if (getType(value) === 'function') {
                    value = value.call(self);
                }

                if (value !== undefined && filtersChain.length) {
                    $.each(filtersChain, function (i, rawFilter) {
                        var filterMatch = rawFilter.match(/^([^(]+)(?:\(([^)]+)\))?$/, 'g');
                        if (filterMatch) {
                            var filterName = filterMatch[1];
                            var filterParams = filterMatch[2] ? filterMatch[2].split(/[, ]+/) : [];
                            var filter = getType(filters[filterName]) === 'function' && filters[filterName];

                            if (!filter && getType(context.filters) === 'object' && getType(context.filters[filterName]) === 'function') {
                                filter = context.filters[filterName];
                            }

                            if (filter) {
                                value = filter.apply(null, Array.prototype.concat(value, filterParams));
                            } else {
                                self.warn('Шаблонный фильтр _%s_ не найден', filterName);
                            }
                        } else {
                            self.warn('Ошибка в написании фильтра _|%s_', rawFilter);
                        }
                    });
                }

                return value;
            }

            function loop(template, context) {
                var tagRegExp = /#{for\s+([^}!]+)}(((?:(?!#{(?:empty|endfor)}).)*)#{empty})?((?:(?!#{endfor}).)*(?:((?!#{for\s+[^}!]+}).)*))#{endfor}/gm;
                var result = template;

                function formatEach(template, items, itemName, context) {
                    var dataPropLength = getType(items) === 'array' ? items.length : Object.keys(items).length;
                    var eachResult = template;

                    if (dataPropLength) {
                        eachResult = '';
                        var loopIndex0 = 0;
                        $.each(items, function (_key, _item) {
                            var loopContext = $.extend(true, self.cleanObject(context), {
                                loop: {
                                    key: _key,
                                    isFirst: loopIndex0 === 0,
                                    isLast: loopIndex0 === dataPropLength - 1,
                                    index0: loopIndex0,
                                    index: loopIndex0 + 1,
                                    item: _item,
                                    isOnly: dataPropLength === 1
                                }
                            });

                            loopContext[itemName] = _item;
                            eachResult += self.format(template, loopContext);
                            loopIndex0 += 1;
                        });
                    }

                    return eachResult;
                }

                function replacer(templateTag, expression, emptyFlag, subTemplateYes, subTemplateNo) {
                    var items;
                    var replaceResult;
                    var expressionMatches = expression.match(/^(.*)\s+in\s+(.*)$/i);
                    var itemName = expressionMatches[1];
                    var itemsToken = expressionMatches[2];

                    if (itemsToken && itemsToken.indexOf('..') !== -1) {
                        items = arrayFromRange(itemsToken);
                    } else {
                        items = getValue(itemsToken, context);
                    }

                    if ((items !== undefined) && (getType(items) === 'array' || getType(items) === 'object')) {
                        var itemsQuantity = getType(items) === 'array' ? items.length : Object.keys(items).length;

                        if (itemsQuantity > 5000) {
                            self.warn('::format', 'Операция может занять много времени, вы не можете повлиять на это');
                        }

                        if (!emptyFlag && itemsQuantity) {
                            replaceResult = formatEach(subTemplateNo, items, itemName, context);
                        } else if (emptyFlag && itemsQuantity) {
                            replaceResult = formatEach(subTemplateYes, items, itemName, context);
                        } else if (emptyFlag && !itemsQuantity) {
                            replaceResult = formatEach(subTemplateNo, items, itemName, context);
                        }
                    }

                    return replaceResult === undefined ? templateTag : replaceResult;
                }

                if (context) {
                    var lastResult = result;
                    var shouldRepeat = true;
                    while (result.match(tagRegExp) && shouldRepeat) {
                        result = result.replace(tagRegExp, replacer);
                        if (lastResult !== result) {
                            lastResult = result;
                            shouldRepeat = true;
                        } else {
                            shouldRepeat = false;
                        }
                    }
                }

                return result;
            }

            function logic(template, context) {
                var tagRegExp = /#{if\s+([!]*)([^}!]+)}((((?!#{endif}).)*)#{else})?(((?!#{endif}).)*(((?!#{if\s+[^}]+}).)*))#{endif}/gm;
                var result = template;

                function replacer(templateTag, notFlag, valueToken, elseFlag, subTemplateYes, noop, subTemplateNo) {
                    var replaceResult = '';
                    var paramValue = getValue(valueToken, context);

                    if (!elseFlag && ((!notFlag && paramValue) || (notFlag && !paramValue))) {// yes
                        replaceResult = self.format(subTemplateNo, context);
                    } else if (elseFlag && ((!notFlag && paramValue) || (notFlag && !paramValue))) { // yes in else
                        replaceResult = self.format(subTemplateYes, context);
                    } else if (elseFlag && ((!notFlag && !paramValue) || (notFlag && paramValue))) { // else
                        replaceResult = self.format(subTemplateNo, context);
                    }

                    return replaceResult === undefined ? templateTag : replaceResult;
                }

                if (context) {
                    var lastResult = result;
                    var shouldRepeat = true;
                    while (result.match(tagRegExp) && shouldRepeat) {
                        result = result.replace(tagRegExp, replacer);
                        if (lastResult !== result) {
                            lastResult = result;
                            shouldRepeat = true;
                        } else {
                            shouldRepeat = false;
                        }
                    }
                }

                return result;
            }

            function variables(template, context) {
                var tagRegExp = /\${([^|$}]+(?:(?:\|)[^$}]*?)?)}/g;

                var result = template;

                if (context) {
                    var lastResult = result;
                    var shouldRepeat = true;
                    while (getType(result) === 'string' && result.match(tagRegExp) && shouldRepeat) {
                        result = result.replace(tagRegExp, function (templateTag, valueToken) {
                            var replaceResult = getValue(valueToken, context);
                            return replaceResult === undefined ? templateTag : replaceResult;
                        });

                        if (lastResult !== result) {
                            lastResult = result;
                            shouldRepeat = true;
                        } else {
                            shouldRepeat = false;
                        }
                    }
                }
                return result;
            }

            function i18n(template, context) {
                var tagRegExp = /_{([^|_}]+(?:(?:\|)[^_}]*?)?)}/g;
                var result = template;

                if (context) {
                    result = result.replace(tagRegExp, function (templateTag, valueToken) {
                        var valueParts = valueToken.split('|');
                        var path = valueParts[0];
                        var fallbackPath = valueParts[1];
                        var replaceResult = self.getText(path, fallbackPath, context.dictionary);
                        return replaceResult === undefined ? templateTag : replaceResult;
                    });
                }
                return result;
            }

            if (!template) {
                self.error({
                    action: 'DepotProto.format',
                    data: {
                        template: template,
                        context: context
                    },
                    name: 'ArgumentError',
                    message: 'переменная _template_ не получена'
                });

                return;
            }

            var result = template;

            result = variables(result, context || {});
            result = loop(result, context || {});
            result = logic(result, context || {});
            result = i18n(result, context || {});

            return result;
        },

        translate: function (dictionary) {
            var self = this;

            if (!dictionary) {
                self.error({
                    action: 'DepotProto.translate',
                    data: {
                        dictionary: dictionary
                    },
                    name: 'ArgumentError',
                    message: 'переменная _dictionary_ не получена'
                });
                return;
            }

            return deepTranslate(dictionary, self.LANGUAGE);
        },

        getText: function (path, fallbackPath, dictionary) {
            var self = this;

            if (!path) {
                self.error({
                    action: 'DepotProto.getText',
                    data: {
                        path: path,
                        fallbackPath: fallbackPath,
                        dictionary: dictionary
                    },
                    name: 'ArgumentError',
                    message: 'переменная _path_ не получена'
                });
                return;
            }

            var result = '';
            var pathKeys = path.split('.');

            if (!dictionary) {
                dictionary = self.params.dictionary;
            }

            $.each(pathKeys, function (i, key) {
                if (!result) {
                    result = dictionary[key];
                } else {
                    result = result[key];
                    if (!result) {
                        if (fallbackPath) {
                            result = self.getText(fallbackPath, undefined, dictionary);
                        } else {
                            return false;
                        }
                    }
                }
            });

            return result;
        },

        addEventNS: function (eventType, additionalNS) {
            var self = this;
            var events;
            var results = [];

            switch (getType(eventType)) {
                case 'array':
                    events = eventType;
                    break;
                case 'object':
                    events = [];
                    $.each(eventType, function (key, value) {
                        events.push(value);
                    });
                    break;
                default:
                    events = eventType && eventType !== 'all' ? eventType.split(/[ ]+/) : [''];
                    break;
            }

            $.each(events, function () {
                results.push(this + (self.eventNameSpace || '') + (additionalNS || ''));
            });

            return results.join(' ');
        },

        throttle: function (eventId, callback, debounce) {
            var self = this;

            if (typeof eventId === 'function') {
                debounce = callback;
                callback = eventId;
                eventId = self.hashify(callback);
            }

            if (typeof callback === 'function') {
                if (self.cache.throttleTimers === undefined) {
                    self.cache.throttleTimers = Object.create(null);
                }
                if (debounce === undefined) {
                    debounce = self.params.debounce;
                }

                var now = self.now();
                var timer = self.cache.throttleTimers[eventId];
                var clear = function () {
                    delete self.cache.throttleTimers[eventId];
                };

                if (timer === undefined) {
                    self.cache.throttleTimers[eventId] = {
                        timestamp: now,
                        timeout: self.delay(clear, debounce)
                    };
                    self.call(callback, eventId);
                } else {
                    if (now - timer.timestamp >= debounce) {
                        self.cancelDelay(timer.timeout);
                        delete self.cache.throttleTimers[eventId];
                        self.call(callback, eventId);
                    } else {
                        self.cancelDelay(timer.timeout);
                        self.cache.throttleTimers[eventId].timeout = self.delay(clear, debounce);
                    }
                }
            } else {
                self.warn('::throttle', 'Функция обратного вызова для `%s` не передана', eventId);
            }
        },

        debounce: function (eventId, callback, debounce) {
            var self = this;

            if (typeof eventId === 'function') {
                debounce = callback;
                callback = eventId;
                eventId = self.hashify(callback);
            }

            if (typeof callback === 'function') {
                if (self.cache.debounceTimers === undefined) {
                    self.cache.debounceTimers = Object.create(null);
                }

                if (self.cache.debounceTimers[eventId] === undefined) {
                    self.call(callback, eventId);
                } else {
                    self.cancelDelay(self.cache.debounceTimers[eventId]);
                }

                if (debounce === undefined) {
                    debounce = self.params.debounce;
                }

                self.cache.debounceTimers[eventId] = self.delay(function () {
                    delete self.cache.debounceTimers[eventId];
                }, debounce);
            } else {
                self.warn('::debounce', 'Функция обратного вызова для `%s` не передана', eventId);
            }
        },

        delay: function (callback, timeout, onCancel) {
            var self = this;
            var delayId = self.hashify();

            if (!timeout) {
                timeout = 0;
            }

            DELAYS[delayId] = {
                callback: callback,
                onCancel: onCancel
            };

            function requestAF(tick) {
                var rAF = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.msRequestAnimationFrame || window.oRequestAnimationFrame || undefined;
                if (!rAF) {
                    rAF = function (tick) {
                        return setTimeout(function () {
                            tick.call(window, delayId);
                        });
                    };
                }

                rAF.call(window, tick);

                return delayId;
            }

            function tick(timestamp) {
                if (DELAYS[delayId]) {
                    if (!DELAYS[delayId].start) {
                        DELAYS[delayId].start = timestamp;
                    }
                    var delta = timestamp - DELAYS[delayId].start;
                    if (delta >= timeout) {
                        self.call(DELAYS[delayId].callback, timestamp);
                        delete DELAYS[delayId];
                    } else {
                        requestAF(tick);
                    }
                }

                return delayId;
            }

            return requestAF(tick);
        },

        getDelays: function () {
            return $.extend(true, {}, DELAYS);
        },

        cancelDelay: function (delayId) {
            var self = this;
            var delay = DELAYS[delayId];
            if (delay && typeof delay.onCancel === 'function') {
                self.call(delay.onCancel);
            }
            return delay && delete DELAYS[delayId];
        },

        /**
         * @name stepFunction
         * @function
         * @param delta {Number} Изменение прогресса за шаг анимации
         * @param progress {Number} Прогресс выполнения анимации от 0 до 1
         * @param duration {Number} Продолжительность анимации
         * @param time {Number} Время в миллисекундах от начала анимации
         */
        /**
         * Анимация
         * @param duration {Number} продолжительность анимации в миллисекундах
         * @param step {stepFunction} функция вызываемая на каждый тик анимации
         * @param options {Object} Объект параметров анимации
         * @param options.done {Function} - Функция вызываемая при окончании анимации
         * @param options.cancel {Function} - Функция вызываемая при отмене анимации
         * @param options.easing {String|Function} - Имя или функция плавности. Доступное имя 'linear'
         * @returns {{cancel: function(): void, delayId: number}}
         */
        animate: function (duration, step, options) {
            options = options || {
                done: null,
                cancel: null,
                easing: 'linear'
            };

            var self = this;
            var startTime = self.now();
            var lastProgress = 0;
            var easing;
            var easings = {
                linear: function (x) {
                    return x;
                }
            };
            var result = {
                delayId: 0,
                cancel: function () {
                    self.cancelDelay(this.delayId);
                    self.call(options.cancel);
                }
            };

            if (getType(options.easing) === 'string') {
                easing = easings[options.easing] || easings.linear;
            } else if (getType(options.easing) === 'function') {
                easing = options.easing;
            } else {
                easing = easings.linear;
            }

            function frame(timestamp) {
                var time = timestamp - startTime;
                var progress = self.call(easing, self.clamp(0, time / duration, 1));
                var delta = progress - lastProgress;

                self.call(step, delta, progress, duration, time);
                lastProgress = progress;

                if (progress < 1) {
                    result.delayId = self.delay(frame);
                } else {
                    self.call(options.done);
                }
            }

            result.delayId = self.delay(frame);

            return result;
        },

        wait: function (waitingID, condition, callback, parallel) {
            var self = this;
            var waitingDelays = [10, 100, 200, 500];
            var maxWaitingTimes = 100;

            function abort() {
                if (self.params.debug) {
                    self.info('отмена %c%s%c', 'color: deepskyblue;', waitingID, '');
                }

                if (self.state.waitingTimeouts[waitingID]) {
                    self.state.waitingPhase[waitingID] = self.state.waitingDelaysQuantity[waitingID];

                    if (self.state.waitingBusyBy && self.state.waitingBusyBy === waitingID) {
                        self.state.waitingBusyBy = '';
                    }

                    self.cancelDelay(self.state.waitingTimeouts[waitingID]);
                }
            }

            function check(current) {
                var waitingID = current.waitingID;
                var condition = current.condition;
                var callback = current.callback;

                if (self.state.waitingBusyBy === waitingID || current.parallel) {
                    if (self.params.debug) {
                        self.info('проверка %c%s%c', 'color: deepskyblue;', waitingID, '');
                    }

                    if (!condition.call(self, abort)) {
                        if (self.state.waitingPhase[waitingID] === -1) {
                            self.call(abort);
                        } else if (self.state.waitingPhase[waitingID] < self.state.waitingDelaysQuantity[waitingID]) {
                            if (self.state.waitingTimes[waitingID] < maxWaitingTimes) {
                                self.state.waitingTimes[waitingID] += 1;
                            } else {
                                self.state.waitingTimes[waitingID] = 1;
                                self.state.waitingPhase[waitingID] += 1;
                            }

                            self.state.waitingTimeouts[waitingID] = self.delay(function () {
                                check(current);
                            }, waitingDelays[self.state.waitingPhase[waitingID]]);
                        } else {
                            if (self.state.waitingBusyBy && self.state.waitingBusyBy === waitingID) {
                                self.state.waitingBusyBy = '';
                            }
                            self.warn('Превышено время ожидания для %c%s%c', 'color: deepskyblue;', waitingID, '');
                        }
                    } else {
                        if (self.params.debug) {
                            var delta = parseFloat((now() - current.timestamp).toFixed(4));
                            self.info('%c%s%c готов%c (%dms)', 'color: deepskyblue;', waitingID, 'color: lime;', '', delta);
                        }

                        delete self.state.waitingTimes[waitingID];
                        delete self.state.waitingPhase[waitingID];
                        delete self.state.waitingDelaysQuantity[waitingID];

                        if (self.state.waitingBusyBy && self.state.waitingBusyBy === waitingID) {
                            self.state.waitingBusyBy = '';
                        }
                        self.call(callback);
                        if (!current.parallel) {
                            next();
                        }
                    }
                } else {
                    self.delay(function () {
                        check(current);
                    });
                }
            }

            function next(current) {
                if (!self.state.waitingBusyBy && self.state.waitingQueue.length) {
                    current = self.state.waitingQueue.shift();
                    self.state.waitingBusyBy = current.waitingID;

                    check(current);
                }
            }

            if (typeof condition === 'function' && typeof callback === 'function') {
                if (self.params.debug) {
                    self.info('ожидание %c%s%c...', 'color: deepskyblue;', waitingID, '');
                }

                if (self.state.waitingTimeouts === undefined) {
                    self.state.waitingTimeouts = Object.create(null);

                    self.state.waitingDelaysQuantity = self.state.waitingDelaysQuantity || {};

                    self.state.waitingTimes = self.state.waitingTimes || {};
                    self.state.waitingPhase = self.state.waitingPhase || {};

                    self.state.waitingQueue = self.state.waitingQueue || [];
                    if (!self.state.waitingBusyBy || self.state.waitingBusyBy && self.state.waitingBusyBy === waitingID) {
                        self.state.waitingBusyBy = '';
                    }
                }

                if (getType(waitingDelays) === 'array') {
                    self.state.waitingDelaysQuantity[waitingID] = waitingDelays.length;
                } else {
                    self.state.waitingDelaysQuantity[waitingID] = 1;
                }

                if (self.state.waitingTimes[waitingID] === undefined) {
                    self.state.waitingTimes[waitingID] = 0;
                    self.state.waitingPhase[waitingID] = 0;
                    var current = {
                        timestamp: now(),
                        waitingID: waitingID,
                        condition: condition,
                        callback: callback,
                        parallel: parallel,
                        abort: abort
                    };

                    if (parallel) {
                        if (self.params.debug) {
                            self.info('%c%s%c вне очереди', 'color: deepskyblue;', waitingID, '');
                        }
                        check(current);
                    } else {
                        if (self.params.debug) {
                            self.info('%c%s%c добавлен в очередь', 'color: deepskyblue;', waitingID, '');
                        }
                        self.state.waitingQueue = self.state.waitingQueue.concat(current);
                        next();
                    }
                }
            } else {
                self.warn('wait(%c%s%c, condition, callback): condition || callback не являются функцией', 'color: deepskyblue;', waitingID, '');
            }

            return {next: next, abort: abort};
        },

        addScripts: function (scripts, callback, timeout) {
            var self = this;
            var queue = [];
            var maxTimeout = timeout || 300000;// пять минут

            function checkQueue() {
                if (queue.length === 0) {
                    self.call(callback, null);
                }
            }

            function removeFromQueue(script) {
                var queueIndex = queue.indexOf(script.src);
                if (queueIndex !== -1) {
                    queue.splice(queueIndex, 1);
                }

                return Array.prototype.concat(queue);
            }

            function hasExports(script) {
                var result = true;
                var exports = Array.prototype.concat(script.exports);

                exports.forEach(function (variable) {
                    var pointer = window;
                    variable.split('.').forEach(function (key) {
                        pointer = pointer[key];

                        if (pointer === undefined) {
                            result = false;
                        }

                        return result;
                    });
                });

                return result;
            }

            function checkExports(script) {
                if (hasExports(script)) {
                    queue = removeFromQueue(script);

                    if (getType(script.plugins) === 'array' && script.plugins.length) {
                        queue = addToQueue(script.plugins);
                    }

                    checkQueue();
                } else {
                    var timeoutDelta = self.now() - script.timestamp;
                    if (timeoutDelta < maxTimeout) {
                        self.delay(function () {
                            checkExports(script);
                        });
                    } else {
                        queue = removeFromQueue(script);
                        var error = self.error({
                            action: 'DepotProto.addScripts',
                            message: 'Превышено время ожидания загрузки',
                            name: 'TimeoutError',
                            data: script
                        });
                        self.call(callback, error);
                    }
                }
            }

            function addToQueue(scripts) {
                Array.prototype.concat(scripts).forEach(function (script) {
                    if (!hasExports(script) && SCRIPTS.indexOf(script.src) === -1) {
                        queue = queue.concat(script.src);
                        var src = script.src;
                        var scriptElement = document.createElement('script');
                        scriptElement.onerror = function (event) {
                            queue = removeFromQueue(script);
                            var error = self.error({
                                action: 'DepotProto.addScripts',
                                message: 'Ошибка загрузки',
                                name: 'NetworkError',
                                data: script
                            });
                            self.call(callback, error);
                        };
                        scriptElement.onload = function () {
                            self.delay(function () {
                                script.timestamp = self.now();
                                checkExports(script);
                            });
                        };
                        SCRIPTS.push(src);
                        scriptElement.src = src;
                        document.head.appendChild(scriptElement);
                    } else {
                        script.timestamp = self.now();
                        checkExports(script);
                    }
                });

                return Array.prototype.concat(queue);
            }

            if (scripts) {
                queue = addToQueue(scripts);
            } else {
                self.call(callback, null);
            }

            return self;
        },

        getElements: function (params, getElementsOutside) {
            var self = this;
            var paramRe = /^([a-z0-9]+)Selector$/i;

            if (getElementsOutside === undefined) {
                getElementsOutside = self.params.getElementsOutside;
            }

            $.each(params ? params : self.params, function (paramName, paramValue) {
                if (typeof paramValue === 'string') {
                    var paramMatches = paramName.toString().match(paramRe);
                    if (paramMatches) {
                        var $element = self.$container.find(paramValue);
                        if (!$element.length && getElementsOutside) {
                            $element = $(paramValue);
                        }

                        if (paramMatches[1] !== 'container') {
                            self['$' + paramMatches[1]] = $element;
                        }
                    }
                }
            });

            return self;
        },

        getSelector: function (element) {
            var self = this;
            var selector;
            var $element;

            switch (getType(element)) {
                case 'string':
                    selector = '.' + element;
                    break;
                case 'undefined':
                    $element = self.$container;
                    break;
                case 'object':
                    $element = element;
                    break;
                default:
                    $element = $(element);
                    break;
            }

            if (!selector && $element && $element.length) {
                var className = $element.attr('class');
                var selectorRe = /(?:^|\s)(js-[a-z-]+)/;
                var matches = className.match(selectorRe);

                selector = matches ? '.' + matches[1] : '';
            }

            return selector;
        },

        on: function (eventType) {
            var self = this;

            if (eventType === undefined) {
                return self;
            }

            var eventParams = Array.prototype.slice.call(arguments, 1);
            if (getType(eventType) === 'array') {
                eventType = self.addEventNS(eventType[0], eventType[1]);
            } else {
                eventType = self.addEventNS(eventType);
            }

            eventParams.unshift(eventType);

            $.fn.on.apply(self.$container, eventParams);

            return self;
        },

        one: function (eventType) {
            var self = this;

            if (eventType === undefined) {
                return self;
            }

            var eventParams = Array.prototype.slice.call(arguments, 1);
            if (getType(eventType) === 'array') {
                eventType = self.addEventNS(eventType[0], eventType[1]);
            } else {
                eventType = self.addEventNS(eventType);
            }

            eventParams.unshift(eventType);

            $.fn.one.apply(self.$container, eventParams);

            return self;
        },

        off: function (eventType) {
            var self = this;

            if (eventType === undefined) {
                return self;
            }

            var eventParams = Array.prototype.slice.call(arguments, 1);
            if (getType(eventType) === 'array') {
                eventType = self.addEventNS(eventType[0], eventType[1]);
            } else {
                eventType = self.addEventNS(eventType);
            }

            eventParams.unshift(eventType);

            $.fn.off.apply(self.$container, eventParams);

            return self;
        },

        bind: function (eventType) {
            var self = this;

            if (eventType === undefined) {
                return self;
            }

            var eventParams;
            var additionalNS;
            var $element;

            if (getType(arguments[1]) === 'string') {
                additionalNS = arguments[1];
                $element = arguments[2];
                eventParams = Array.prototype.slice.call(arguments, 3);
                eventParams.unshift(self.addEventNS(eventType, additionalNS));
            } else {
                $element = arguments[1];
                eventParams = Array.prototype.slice.call(arguments, 2);
                eventParams.unshift(self.addEventNS(eventType));
            }

            $.fn.on.apply($element, eventParams);

            return self;
        },

        unbind: function (eventType) {
            var self = this;
            var eventParams;
            var additionalNS;
            var $element;

            if (getType(arguments[1]) === 'string') {
                additionalNS = arguments[1];
                $element = arguments[2];
                eventParams = Array.prototype.slice.call(arguments, 3);
                eventParams.unshift(self.addEventNS(eventType, additionalNS));
            } else {
                $element = arguments[1];
                eventParams = Array.prototype.slice.call(arguments, 2);
                eventParams.unshift(self.addEventNS(eventType));
            }

            $.fn.off.apply($element, eventParams);

            return self;
        },

        trigger: function (eventType) {
            var self = this;

            var eventParams = Array.prototype.slice.call(arguments, 1);
            if (eventParams.length === 1) {
                eventParams = eventParams[0];
            }
            self.$container.trigger(eventType, eventParams);

            return self;
        },

        triggerTo: function (element, eventType) {
            var self = this;
            var eventParams;
            var additionalNS;
            var $element;

            switch (getType(element)) {
                case 'string':
                    $element = self.$container.find(element);
                    break;
                case 'object':
                    $element = element;
                    break;
                default:
                    $element = $(element);
                    break;
            }

            if (getType(arguments[2]) === 'string') {
                additionalNS = arguments[2];
                eventParams = Array.prototype.slice.call(arguments, 3);
                eventParams.unshift(self.addEventNS(eventType, additionalNS));
            } else {
                eventParams = Array.prototype.slice.call(arguments, 2);
                eventParams.unshift(self.addEventNS(eventType));
            }

            if ($element.length) {
                $.fn.trigger.apply($element, eventParams);
            }

            return self;
        },

        call: function (callback) {
            var self = this;

            var args = Array.prototype.slice.call(arguments);

            args.shift();

            if (typeof callback === 'function') {
                return callback.apply(self, args);
            }
        },

        matchMedia: function (mediaQueries, onChange) {
            var self = this;
            var matches = null;

            $.each(mediaQueries, function (query, params) {
                var mediaQuery = window.matchMedia(query);
                mediaQuery.onchange = function (event) {
                    self.call(onChange, event.matches ? params : null);
                };

                if (mediaQuery.matches) {
                    matches = params;
                }
            });

            return matches;
        },

        filterItems: function ($items, params, eachCallback) {
            var self = this;
            var $matched;

            $items.each(function (i, item) {
                var all = false;
                var matched = false;
                var $item = $(item);
                var itemData = $item.data();

                $.each(params, function (paramName, paramValue) {
                    if (paramName !== undefined && paramValue !== undefined) {
                        paramName = paramName.toString();
                        paramValue = paramValue.toString();

                        if (paramValue === 'all') {
                            all = true;
                        }

                        var itemValue = itemData[paramName];
                        if (!itemValue) {
                            return false;
                        }

                        var itemValueArray = itemValue.toString().split(/[ ,]+/);
                        var paramValueArray = paramValue.split(/[ ,]+/);

                        $.each(itemValueArray, function (j, value) {
                            if (value !== undefined) {
                                value = value.toString();

                                if (paramValueArray.indexOf(value) !== -1) {
                                    matched = true;
                                    return false;
                                }
                            }
                        });
                    } else {
                        matched = false;
                    }
                });

                if (matched || all) {
                    if ($matched) {
                        $matched.add(item);
                    } else {
                        $matched = $(item);
                    }
                }

                self.call(eachCallback, $item, matched, all);
            });

            return $matched;
        },

        applyMixins: function () {
            var self = this;

            self.call(self.params.preInit);

            if (self.params.extend && $.isPlainObject(self.params.extend)) {
                self = $.extend(true, self, self.params.extend);
            }

            if (self.params.mixins && self.params.mixins.length) {
                $.each(self.params.mixins, function (i, mixin) {
                    if ($.isPlainObject(mixin)) {
                        self = $.extend(true, self, mixin);
                    } else {
                        self.error({
                            action: 'DepotProto.applyMixins',
                            data: {
                                mixin: mixin
                            },
                            name: 'TypeError',
                            message: 'Миксин должен быть объектом'
                        });
                    }
                });
            }

            return self;
        },

        proxyCallback: function (defaultCallback, newCallback) {
            var self = this;
            return function () {
                var result;
                if (typeof defaultCallback === 'function') {
                    result = defaultCallback.apply(self, arguments);
                }

                return newCallback.apply(result, arguments);
            };
        },

        hasPlugin: function (pluginName) {
            var self = this;

            var hasPlugin = $[pluginName] || $.fn[pluginName];

            if (!hasPlugin) {
                self.warn('Необходим плагин *%s*', pluginName);
            }

            return hasPlugin;
        },

        sandbox: function (containerSelector, settings, name) {
            var dp = this;

            var $container = typeof containerSelector === 'object' ? containerSelector : $(containerSelector || document);

            $container.each(function (i, container) {
                function Sandbox() {
                    return this;
                }

                Sandbox.prototype = $.extend(true, {}, dp);
                var self = new Sandbox();
                self.pluginName += '::' + (name || 'sandbox');

                if (!$.data(container, self.pluginName)) {
                    $.data(container, self.pluginName, self._init.call(self, container, settings));
                }
            });

            return settings;
        },

        prefixed: function (css) {
            var self = this;
            var prefixed = Object.create(null);

            if (window.Modernizr) {
                $.each(css, function (property) {
                    var value = css[property];

                    var prefixedProperty = Modernizr.prefixedCSS(property);
                    if (prefixedProperty === false) {
                        prefixedProperty = property;
                    }

                    var prefixedValue = Modernizr.prefixedCSSValue(prefixedProperty, value);
                    if (prefixedValue === false) {
                        prefixedValue = value;
                    }

                    prefixed[prefixedProperty] = prefixedValue;
                });
            } else {
                prefixed = css;
                self.warn('Необходим *Modernizr* с функциями _prefixedCSS()_ и _prefixedCSSValue()_\n',
                    'https://modernizr.com/download?prefixedcss-prefixedcssvalue');
            }

            return prefixed;
        },

        unbindEvents: function () {
            var self = this;

            self.off('');
            self.unbind('', self.$WINDOW);
            self.unbind('', self.$DOCUMENT);
            self.unbind('', self.$HTMLBODY);

            return self;
        },

        _init: function (container, settings) {
            var self = this;

            self.hash = self.hashify();
            self.eventNameSpace = self.getNameSpace();
            self.params = self.translate($.extend(true, Object.create(null), self.defaults, settings));

            self.applyMixins();

            self.$container = $(container);
            self.container = container;

            self.call(self.swapContainer);

            self.getElements();

            self.state = self.getInitialState();
            self.cache = Object.create(null);

            self.one('destroy', function () {
                self.unbindEvents();
            });

            self.call(self.params.beforeInit);

            self.call(self.bindEvents);

            self.call(self.init);

            return self;
        }
    };

    $.depotProto = depotProto;
    $.depotSandbox = function () {
        var args = Array.prototype.slice.call(arguments);
        depotProto.sandbox.apply(depotProto, args);
        return function (selector) {
            args[0] = selector || args[0];
            depotProto.sandbox.apply(depotProto, args);
        };
    };
}(jQuery));
