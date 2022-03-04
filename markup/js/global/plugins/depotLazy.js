(function ($) {
    'use strict';

    function DepotLazy(container, settings) {
        var self = this;

        return self.call(self._init, container, settings);
    }

    DepotLazy.prototype = $.extend(true, {}, $.depotProto, {
        pluginName: 'depotLazy',

        defaults: {
            headerSelector: '.js-header',
            rootMargin: {
                top: 500,
                left: 300,
                right: 300,
                bottom: 500
            }
        },

        hasIntersectionObserver: function () {
            var hasIntersectionObserver = false;

            if ('IntersectionObserver' in window &&
                'IntersectionObserverEntry' in window &&
                'intersectionRatio' in window.IntersectionObserverEntry.prototype) {

                if (!('isIntersecting' in window.IntersectionObserverEntry.prototype)) {
                    Object.defineProperty(window.IntersectionObserverEntry.prototype,
                        'isIntersecting', {
                            get: function () {
                                return this.intersectionRatio > 0;
                            }
                        });
                }

                hasIntersectionObserver = true;
            }

            return hasIntersectionObserver;
        },

        onload: function () {
            var self = this;

            self.trigger('lazy:done');
            self.unbindEvents();

            return self;
        },

        onerror: function () {
            var self = this;

            self.unbindEvents();

            return self;
        },

        initLoad: function (image) {
            var imageData = $(image).data();
            var self = imageData.depotLazy;

            self.unbindEvents();

            if (imageData && imageData.src) {
                image.onload = function (event) {
                    if (self.observer) {
                        self.observer.unobserve(image);
                        self.unbind('update', self.$WINDOW);
                    }

                    return self.onload(image, event);
                };

                image.onerror = function (event) {
                    if (self.observer) {
                        self.observer.unobserve(image);
                        self.unbind('update', self.$WINDOW);
                    }

                    return self.onerror(image, event);
                };

                if (imageData.srcset) {
                    image.srcset = imageData.srcset;
                }

                $.data(image, 'thumb', image.src);
                image.loading = 'eager';
                image.src = imageData.src;
            } else if (self.observer) {
                self.observer.unobserve(image);
            }

            return self;
        },

        getViewport: function () {
            var self = this;
            var headerHeight = 0;

            if (self.$header.length) {
                headerHeight = parseFloat(self.$header.outerHeight());
            }

            var containerTop = Math.round(self.$container.offset().top);
            var containerLeft = Math.round(self.$container.offset().left);
            var containerBottom = Math.round(containerTop + self.$container.outerHeight(true));
            var containerRight = Math.round(containerLeft + self.$container.outerWidth(true));

            var windowTop = self.$WINDOW.scrollTop() - self.params.rootMargin.top;
            var windowBottom = windowTop + self.$WINDOW.innerHeight() + self.params.rootMargin.bottom;
            var windowLeft = self.$WINDOW.scrollLeft() - self.params.rootMargin.left;
            var windowRight = windowLeft + self.$WINDOW.innerWidth() + self.params.rootMargin.right;

            return {
                headerHeight: headerHeight,
                containerTop: containerTop,
                containerRight: containerRight,
                containerBottom: containerBottom,
                containerLeft: containerLeft,
                windowTop: windowTop,
                windowRight: windowRight,
                windowBottom: windowBottom,
                windowLeft: windowLeft
            };
        },

        updateViewport: function () {
            var self = this;

            self.state.viewport = self.getViewport();

            return self;
        },

        inViewport: function () {
            var self = this;

            var isAbove = self.state.viewport.containerBottom < self.state.viewport.windowTop;
            var isUnder = self.state.viewport.containerTop > self.state.viewport.windowBottom;
            var isLeft = self.state.viewport.containerLeft < self.state.viewport.windowLeft;
            var isRight = self.state.viewport.containerRight > self.state.viewport.windowRight;
            var isHidden = !self.isCSSVisible(self.image);

            return !(isAbove || isUnder || isLeft || isRight || isHidden);
        },

        isCSSVisible: function (image) {
            return window.getComputedStyle(image).visibility === 'visible';
        },

        getObserver: function () {
            var self = this;

            var config = {
                rootMargin: self.format('${top}px ${right}px ${bottom}px ${left}px', self.params.rootMargin),
                threshold: 0
            };

            window.lazyObserver = new window.IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting || entry.intersectionRatio > 0) {
                        if (self.isCSSVisible(entry.target)) {
                            self.initLoad(entry.target);
                        } else {
                            self.delay(function () {
                                if (self.isCSSVisible(entry.target)) {
                                    self.initLoad(entry.target);
                                }
                            }, 300);
                        }
                    }
                });
            }, config);

            return window.lazyObserver;
        },

        initObserver: function () {
            var self = this;

            self.observer = window.lazyObserver || self.getObserver();
            self.observer.observe(self.image);

            return self;
        },

        bindEvents: function () {
            var self = this;

            if (self.hasIntersectionObserver()) {
                self.initObserver();
            } else {
                self.bind('load scroll resize lazy:check', self.$WINDOW, function (event) {
                    self.updateViewport();
                    if (self.inViewport()) {
                        self.initLoad(self.image);
                    }
                });
            }

            self.one('lazy:load', function () {
                self.initLoad(self.image);
            });

            self.bind('update', self.$WINDOW, function () {
                if (self.hasIntersectionObserver()) {
                    self.observer.unobserve(self.image);
                    self.observer.observe(self.image);
                } else {
                    self.updateViewport();
                    if (self.inViewport()) {
                        self.initLoad(self.image);
                    }
                }
            });

            return self;
        },

        getInitialState: function () {
            var self = this;
            self.image = self.container;

            return {
                viewport: self.getViewport()
            };
        },

        init: function () {
            var self = this;
            self.$header = $(self.params.headerSelector);

            self.delay(function () {
                self.triggerTo(self.$WINDOW, 'lazy:check');
            });

            return self;
        }
    });

    $.fn.depotLazy = function (settings) {
        function isLazy(image) {
            return !!$(image).data('src');
        }

        return this.each(function (i, container) {
            if (isLazy(container)) {
                $.data(container, 'depotLazy', new DepotLazy(container, settings));
            }
        });
    };
}(jQuery));
