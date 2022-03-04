/**
 * @name depotLoaderMore ~
 * @version 4.0.0
 * @author Виктор Дмитриевцев <v.dmitrievcev@designdepot.ru>
 * @see git@git.designdepot.ru:frontend/depotLoaderMore.git
 * @license MIT
 */
(function ($) {
    'use strict';

    function DepotLoaderMore(container, settings) {
        var self = this;

        return self.call(self._init, container, settings);
    }

    DepotLoaderMore.prototype = $.extend(true, {}, $.depotProto, {
        pluginName: 'depotLoaderMore',

        defaults: {
            buttonSelector: '.js-load-more-button',
            targetSelector: '.js-load-more-here',
            processingClassName: 'is-processing',
            lastSelector: '.is-last',
            method: 'GET',
            dataType: 'html',
            dataParam: 'base',
            pageParam: 'page',
            inheritGetParams: true,
            onSuccess: null,
            onError: null
        },

        getSearch: function getSearch(source) {
            var search;

            if (source) {
                if (typeof source === 'object') {
                    search = source.search;
                } else if (typeof source === 'string') {
                    search = source;
                }
            } else {
                search = window.location.search;
            }

            var searchMatches = search && search.match(/^[?](.*)/);


            return searchMatches && searchMatches.length ? searchMatches[1] : '';
        },

        checkButton: function () {
            var self = this;

            if (self.params.dataType === 'html' && self.$target.find(self.params.lastSelector).length) {
                self.$button.detach();
            }

            return self;
        },

        loadMore: function (paramsObject) {
            var self = this;

            if (!self.state.busy) {
                self.startProcess();

                var requestParams = self.cleanObject();

                if (self.params.inheritGetParams) {
                    self.state.get = $.depotParse(window.location.search);

                    requestParams = $.extend(true, self.state.get, paramsObject);
                } else if (paramsObject) {
                    requestParams = paramsObject;
                }

                self.state.request = $.ajax({
                    url: self.cache.requestUrl,
                    type: self.params.method,
                    dataType: self.params.dataType,
                    data: requestParams,
                    success: function (response) {
                        self.stopProcess();

                        if (response) {
                            self.increasePage();

                            if (typeof self.params.onSuccess === 'function') {
                                self.call(self.params.onSuccess, response);
                            } else if (self.params.dataType === 'html') {
                                self.$target.append(response);
                            }

                            self.checkButton();
                        }
                    },
                    error: function (jqXHR, textStatus, errorThrown) {
                        self.stopProcess();
                        self.error({
                            action: 'DepotLoaderMore.loadMore',
                            data: {
                                url: self.cache.requestUrl,
                                type: self.params.method,
                                data: requestParams,
                            },
                            name: textStatus,
                            number: jqXHR.status,
                            message: errorThrown
                        });

                        self.call(self.params.onError, jqXHR);
                    }
                });
            }

            return self;
        },

        increasePage: function () {
            var self = this;

            var button = self.$button.get(0);

            var buttonSearch = self.getSearch(button);
            var buttonParams = $.depotParse(buttonSearch);

            var currentPage = parseInt(buttonParams[self.params.pageParam]);

            if (!isNaN(currentPage)) {
                buttonParams[self.params.pageParam] = currentPage + 1;

                button.search = '?' + $.param(buttonParams, true);
            }

            return self;
        },

        startProcess: function () {
            var self = this;

            self.state.busy = true;
            self.$container.addClass(self.params.processingClassName).aria('busy', 'true');

            return self;
        },

        stopProcess: function () {
            var self = this;

            self.state.busy = false;
            self.$container.removeClass(self.params.processingClassName).aria('busy', 'false');

            return self;
        },

        bindEvents: function () {
            var self = this;

            self.bind('online', self.$WINDOW, function () {
                self.state.offline = false;
                self.$button.removeClass('is-disabled').prop('disabled', false);
            });

            self.bind('offline', self.$WINDOW, function () {
                self.state.offline = true;
                self.$button.addClass('is-disabled').prop('disabled', true);
            });

            self.$button.on('click', function (event) {
                event.preventDefault();
                var button = this;
                if (!self.state.offline) {
                    self.debounce('click', function () {
                        self.state.search = self.getSearch(button);

                        if (self.hasPlugin('depotParse')) {
                            var requestParams = $.depotParse(self.state.search);
                            self.loadMore(requestParams);
                        }
                    });
                } else if (self.hasPlugin('depotNotifications')) {
                    $.depotNotifications.warn({
                        ru: 'Проверьте подключение к сети.',
                        en: 'Check your network connection.'
                    });
                }
            });

            return self;
        },

        init: function () {
            var self = this;

            self.cache.requestUrl = self.$button.data(self.params.dataParam);

            self.call(self.params.onInit);

            return self;
        }

    });

    $.fn.depotLoaderMore = function (settings) {
        return this.each(function (i, container) {
            $.data(this, 'depotLoaderMore', new DepotLoaderMore(container, settings));
        });
    };
}(jQuery));
