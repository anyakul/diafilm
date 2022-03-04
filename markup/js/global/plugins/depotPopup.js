/**
 * @name depotPopup~
 * @version 3.0.1
 * @author Виктор Дмитриевцев <v.dmitrievcev@designdepot.ru>
 * @see git@git.designdepot.ru:frontend/depotPopup.git
 * @license MIT
 * @changes:
 * (fix) Поправил работу с хешем
 * (add) Добавил параметр `beforeHide`
 */

(function ($) {
    'use strict';

    function DepotPopup(container, settings) {
        var self = this;

        return self.call(self._init, container, settings);
    }

    DepotPopup.prototype = $.extend(true, {}, $.depotProto, {
        pluginName: 'depotPopup',

        defaults: {
            buttonSelector: '.js-popup-toggle',
            bodySelector: '.js-popup-body',
            closeButtonSelector: '.js-popup-close',
            fieldsSelector: 'input:not([type="hidden"]), textarea, select',
            visibleClassName: 'is-visible',
            addBodyClass: 'is-cropped',
            hideDebounce: 300,
            resetScroll: false,
            mediaQuery: '',
            kickOff: true,
            useHash: true,
            hashRe: false,
            onHashChange: null,
            beforeShow: null,
            beforeHide: null,
            onShow: null,
            onHide: null,
            onToggle: null
        },

        getID: function () {
            return this.$container.attr('id');
        },

        onHashChange: function () {
            var self = this;

            var hasHash = $.depotHash.has(self.params.hashRe ? self.params.hashRe : self.state.hash);

            if (hasHash) {
                if (!self.state.isVisible) {
                    self.debounce('hashChange', self.show);
                }

                self.call(self.params.onHashChange);
            } else if (!hasHash && self.state.isVisible) {
                self.debounce('hashChange', self.hide);
                self.call(self.params.onHashChange);
            }

            return self;
        },

        preventShow: function () {
            var self = this;

            self.state.preventShow = true;

            return self;
        },

        startProcessing: function startProcessing() {
            var self = this;

            self.$body.addClass(self.params.processingClassName);

            return self;
        },

        stopProcessing: function stopProcessing() {
            var self = this;

            self.$body.removeClass(self.params.processingClassName);

            return self;
        },

        preventKickOff: function () {
            var self = this;

            if (self.params.hideDebounce) {
                self.state.hideDebounce = true;
                self.delay(function () {
                    delete self.state.hideDebounce;
                }, self.params.hideDebounce);
            }

            return self;
        },

        hide: function (event, data) {
            var self = this;

            if (self.state.isVisible) {
                self.call(self.params.beforeHide, event, data);
                self.state.isVisible = false;

                self.$container.removeClass(self.params.visibleClassName);
                self.$container.attr('hidden', true);
                self.$container.attr('tabindex', '-1');

                if (self.params.useHash) {
                    if (self.hasPlugin('depotHash')) {
                        if (self.params.hashRe) {
                            if ($.depotHash.has(self.params.hashRe)) {
                                $.depotHash.removeMatched(self.params.hashRe);
                            }
                        } else {
                            $.depotHash.remove(self.state.hash);
                        }
                    }
                }

                if (self.params.addBodyClass && !self.state.preventRemoveBodyClass) {
                    self.$BODY.removeClass(self.params.addBodyClass);
                }

                self.$container.scrollTop(0);
                self.$container.scrollLeft(0);

                self.state = self.getInitialState();

                self.call(self.params.onHide, event, data);
            }

            return self;
        },

        show: function (event, data) {
            var self = this;

            if (!self.state.isVisible) {
                self.call(self.params.beforeShow, event, data);
                if (!self.state.preventShow) {
                    self.preventKickOff();

                    self.state.isVisible = true;

                    self.$container.addClass(self.params.visibleClassName);
                    self.$container.attr('hidden', false);
                    self.$container.attr('tabindex', '0');

                    if (self.params.useHash && self.hasPlugin('depotHash')) {
                        if (self.params.hashRe) {
                            if ($.depotHash.has(self.params.hashRe)) {
                                self.state.hash = $.depotHash.getMatched(self.params.hashRe)[0];
                            } else {
                                $.depotHash.add(self.state.hash);
                            }
                        } else if (!$.depotHash.has(self.state.hash)) {
                            $.depotHash.add(self.state.hash);
                        }
                    }

                    if (self.params.resetScroll) {
                        window.scrollTo(0, 0);
                    }

                    if (self.params.addBodyClass) {
                        self.delay(function () {
                            if (self.state.isVisible) {
                                if (self.$BODY.hasClass(self.params.addBodyClass)) {
                                    self.state.preventRemoveBodyClass = true;
                                } else {
                                    self.state.preventRemoveBodyClass = false;
                                    self.$BODY.addClass(self.params.addBodyClass);
                                }

                                self.$WINDOW.trigger('update');
                                self.$WINDOW.trigger('resize');
                            }
                        }, 10);
                        self.delay(function () {
                            if (self.state.isVisible) {
                                if (self.$fields.length) {
                                    self.$fields.get(0).focus();
                                } else {
                                    self.$container.get(0).focus();
                                }

                            }
                        }, 100);
                    }

                    self.call(self.params.onShow, event, data);
                } else {
                    self.state.preventShow = false;
                }
            }

            return self;
        },

        toggle: function () {
            var self = this;

            if (self.state.isVisible) {
                self.hide();
            } else {
                self.show();
            }

            self.call(self.params.onToggle);

            return self;
        },

        bindEvents: function () {
            var self = this;

            self.bind('click', self.$BODY, self.params.buttonSelector, function (event) {
                event.preventDefault();

                self.debounce('toggle', self.toggle);
            });

            self.on('click', self.params.closeButtonSelector, function (event) {
                event.preventDefault();

                self.debounce('close', self.hide);
            });

            self.on('popup:show', function (event, data) {
                self.debounce('show', function () {
                    self.show(event, data);
                });
            });

            self.on('popup:hide', function (event, data) {
                self.debounce('hide', function () {
                    self.hide(event, data);
                });
            });

            if (self.params.useHash) {
                if (self.hasPlugin('depotHash')) {
                    $.depotHash.onChange(function () {
                        self.onHashChange();
                    });
                }
            }

            if (self.params.kickOff) {
                self.bind('click', self.$DOCUMENT, function (event) {
                    if (!self.state.hideDebounce) {
                        if ($(event.target).closest('body').length && !$(event.target).closest(self.params.bodySelector).length && self.state.isVisible) {
                            self.hide();
                        }
                    }
                });
            }

            if (self.params.mediaQuery) {
                window.matchMedia(self.params.mediaQuery).onchange = function (event) {
                    if (self.state.isVisible && !event.matches) {
                        self.hide();
                    }
                };
            }

            self.bind('keyup', self.$BODY, function (event) {
                if (self.state.isVisible && event.which === self.KEYS.ESCAPE) {
                    event.preventDefault();

                    self.hide();
                }
            });

            return self;
        },

        getInitialState: function () {
            var self = this;
            var id = self.getID();
            var hash = id;

            if (self.params.useHash && self.hasPlugin('depotHash')) {
                if (self.params.hashRe && $.depotHash.has(self.params.hashRe)) {
                    hash = $.depotHash.getMatched(self.params.hashRe)[0] || hash;
                }
            }

            return {
                id: id,
                hash: hash,
                isVisible: false,
                hideDebounce: false,
                preventShow: false,
                preventRemoveBodyClass: false
            };
        },

        init: function () {
            var self = this;

            self.$fields = self.$container.find(self.params.fieldsSelector);

            if (self.params.useHash) {
                if (self.hasPlugin('depotHash')) {
                    if ($.depotHash.has(self.params.hashRe ? self.params.hashRe : self.state.hash)) {
                        self.show();
                    }
                }
            }

            self.call(self.params.onInit);

            return self;
        }
    });

    $.fn.depotPopup = function (settings) {
        return this.each(function (i, container) {
            $.data(container, 'depotPopup', new DepotPopup(container, settings));
        });
    };
}(jQuery));
