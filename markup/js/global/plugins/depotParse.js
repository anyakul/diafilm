/**
 * @name depotParse~
 * @version 2.3.0
 * @author Виктор Дмитриевцев <v.dmitrievcev@designdepot.ru>
 * @see git@git.designdepot.ru:frontend/depotParse.git
 * @license MIT
 * @changes:
 * (change) Метод `parseObject` всегда возвращает тип `String`
 * (change) Метод `parseString` всегда возвращает тип `Object`
 * (rename) переименовал внутреннею переменную `pairsCount` на `pairsQuantity`
 */

(function ($) {
    'use strict';

    function getType(smth) {
        return Object.prototype.toString.call(smth).slice(8, -1).toLowerCase();
    }

    function parseObject(object, params) {
        var search = '';

        if (params.reverse) {
            var searchArray = [];
            $.each(object, function (key, value) {
                if (value === undefined) {
                    if (params.empty) {
                        searchArray.push(key);
                    }
                } else if (value instanceof Array) {
                    $.each(value, function (i, subValue) {
                        if (params.traditional) {
                            searchArray.push(key + params.assign + subValue);
                        } else {
                            searchArray.push(key + '[]' + params.assign + subValue);
                        }
                    });
                } else {
                    if (params.traditional) {
                        searchArray.push(key + params.assign + value);
                    } else {
                        $.each(value, function (subKey, subValue) {
                            searchArray.push(key + '[' + subKey + ']' + params.assign + subValue);
                        });
                    }
                }
            });

            if (params.encode) {
                search = encodeURI(searchArray.join(params.split));
            } else {
                search = searchArray.join(params.split);
            }
        }

        return search;
    }

    function parseString(search, params) {
        var object = null;

        if (search.length) {
            var searchStringPairs;
            if (search.indexOf('?') === 0) {
                searchStringPairs = search.substr(1).split(params.split);
            } else {
                searchStringPairs = search.split(params.split);
            }
            var pairsQuantity = searchStringPairs.length;
            if (pairsQuantity) {
                for (var i = 0; i < pairsQuantity; i += 1) {
                    var partsRe = new RegExp('([^' + params.assign + ']*)' + params.assign + '?(.*)', 'i');
                    var pairParts = searchStringPairs[i].match(partsRe);
                    if (pairParts && pairParts.length) {
                        var paramName = decodeURIComponent(pairParts[1]);
                        var paramValue = pairParts[2];
                        if (paramValue && !isNaN(paramValue)) {
                            paramValue = parseFloat(paramValue);
                        } else if (paramValue) {
                            paramValue = decodeURIComponent(paramValue.toString());
                        } else {
                            paramValue = undefined;
                        }

                        if (paramValue !== undefined || params.empty === true) {
                            if (paramName && paramName.length) {
                                object = object || {};
                                if (!object[paramName]) {
                                    object[paramName] = paramValue;
                                } else {
                                    if (object[paramName] instanceof Array) {
                                        if (params.merge === true) {
                                            if (object[paramName].indexOf(paramValue) === -1) {
                                                object[paramName].push(paramValue);
                                            }
                                        } else {
                                            object[paramName].push(paramValue);
                                        }
                                    } else {
                                        if (params.merge === true) {
                                            if (object[paramName] !== paramValue) {
                                                object[paramName] = [object[paramName], paramValue];
                                            }
                                        } else {
                                            object[paramName] = [object[paramName], paramValue];
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        return object;
    }

    function depotParse(search, options) {
        var params = $.extend(true, {
            merge: false,
            empty: true,
            split: '&',
            assign: '=',
            reverse: false,
            traditional: true,
            encode: false
        }, options);

        var object = null;

        if (getType(search) === 'object') {
            object = parseObject(search, params);
        } else if (getType(search) === 'string') {
            object = parseString(search, params);
        } else if (getType(search) === 'array') {
            $.each(search, function (i, searchItem) {
                object = $.extend(true, object, depotParse(searchItem, params));
            });
        }

        return object;
    }

    $.depotParse = depotParse;
}(jQuery));
