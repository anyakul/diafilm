(function ($) {
    'use strict';

    function ScrollCarousel(container, settings) {
        var self = this;

        return self.call(self._init, container, settings);
    }

    ScrollCarousel.prototype = $.extend(true, {}, $.depotProto, {
        pluginName: 'scrollCarousel',

        defaults: {
            viewportSelector: '.js-carousel-viewport',
            overflowSelector: '.js-carousel-overflow',
            itemsSelector: '.js-carousel-item',
            buttonsSelector: '.js-carousel-buttons',
            buttonBackwardsSelector: '.js-carousel-backwards',
            buttonForwardsSelector: '.js-carousel-forwards',
            bulletsSelector: '.js-carousel-bullets',
            className: 'carousel',
            activeClassName: 'is-active',
            snapClassName: 'is-snap',
            verticalClassName: 'is-vertical',
            horizontalClassName: 'is-horizontal',
            direction: 'HORIZONTAL', // VERTICAL
            duration: 400,
            step: 1,
            stepSize: 0,
            itemMargin: true,
            buttons: {
                enabled: false,
                template: '<div class="${className}__buttons ${buttonsSelector|substr(1)}">${buttons.backwardsTemplate}${buttons.forwardsTemplate}</div>',
                backwardsTemplate: '<button class="${className}__button ${className}__button_backwards ${buttonBackwardsSelector|substr(1)}" type="button" aria-label="_{buttons.backwards}" title="_{buttons.backwards}"></button>',
                forwardsTemplate: '<button class="${className}__button ${className}__button_forwards ${buttonForwardsSelector|substr(1)}" type="button" aria-label="_{buttons.forwards}" title="_{buttons.forwards}"></button>',
            },
            bullets: {
                enabled: false,
                template: '<div class="${className}__bullets">#{for item in items}${bullets.bulletTemplate}#{endfor}</div>',
                bulletTemplate: '<button class="${className}__bullet#{if item.isActive} ${activeClassName}#{endif} ${bulletsSelector|substr(1)}" type="button" aria-label="${item.index}" title="${item.index}"></button>'
            },
            dictionary: {
                buttons: {
                    backwards: {
                        ru: 'Назад',
                        en: 'Backwards'
                    },
                    forwards: {
                        ru: 'Вперед',
                        en: 'Forwards'
                    }
                }
            },
            mediaQueries: null
        },

        getInitialState: function () {
            var self = this;
            var matches = self.matchMedia(self.params.mediaQueries, function (matches) {
                self.state.direction = matches && matches.direction || self.params.direction;
            });

            var direction = matches && matches.direction || self.params.direction;

            return {
                direction: direction,
                currentIndex: 0
            };
        },

        render: function () {
            var self = this;

            if (self.params.bullets && self.params.bullets.enabled) {
                var bulletsContext = $.extend(true, {}, self.params, {
                    items: function () {
                        return new Array(self.$items.length / self.params.step).map(function (item, index) {
                            return {
                                index: index,
                                isActive: index === self.state.currentIndex
                            };
                        });
                    }
                });
                var bulletsHTML = self.format(self.params.bullets.template, bulletsContext);

                self.$viewport.append(bulletsHTML);
            }

            if (self.params.buttons && self.params.buttons.enabled) {
                var buttonsContext = $.extend(true, {}, self.params);

                var buttonsHTML = self.format(self.params.buttons.template, buttonsContext);

                self.$viewport.append(buttonsHTML);
            }

            self.getElements();

            return self.update();
        },

        getStepSize: function () {
            var self = this;
            var stepSize = self.params.stepSize;

            if (!stepSize) {
                if (self.state.direction === 'HORIZONTAL') {
                    stepSize = self.$items.first().outerWidth(self.params.itemMargin);
                } else if (self.state.direction === 'VERTICAL') {
                    stepSize = self.$items.first().outerHeight(self.params.itemMargin);
                }
                stepSize *= self.params.step;
            }

            return Math.round(stepSize);
        },

        update: function (scrollOffset) {
            var self = this;

            if (self.state.direction === 'HORIZONTAL') {
                self.$container.removeClass(self.params.verticalClassName)
                    .addClass(self.params.horizontalClassName);
            } else if (self.state.direction === 'VERTICAL') {
                self.$container.removeClass(self.params.horizontalClassName)
                    .addClass(self.params.verticalClassName);
            }

            if (scrollOffset === undefined) {
                if (self.state.direction === 'HORIZONTAL') {
                    scrollOffset = self.$overflow.scrollLeft();
                } else if (self.state.direction === 'VERTICAL') {
                    scrollOffset = self.$overflow.scrollTop();
                }
            }

            self.state.currentIndex = Math.round(scrollOffset / self.getStepSize());

            if (self.params.buttons && self.params.buttons.enabled) {
                var scrollSize = 0;
                var backwardsDisabled = scrollOffset <= 0;
                var forwardsDisabled;

                if (self.state.direction === 'HORIZONTAL') {
                    scrollSize = self.$overflow.get(0).scrollWidth;
                    var overflowWidth = Math.round(self.$overflow.outerWidth(true));
                    forwardsDisabled = scrollSize <= overflowWidth;
                    if (!forwardsDisabled) {
                        forwardsDisabled = scrollOffset + overflowWidth >= scrollSize;
                    }
                } else if (self.state.direction === 'VERTICAL') {
                    scrollSize = self.$overflow.get(0).scrollHeight;
                    var overflowHeight = Math.round(self.$overflow.outerHeight(true));
                    forwardsDisabled = scrollSize < overflowHeight;
                    if (!forwardsDisabled) {
                        forwardsDisabled = scrollOffset + overflowHeight >= scrollSize;
                    }
                }

                self.$buttonBackwards.prop('disabled', backwardsDisabled);
                self.$buttonForwards.prop('disabled', forwardsDisabled);
                self.$buttons.prop('hidden', backwardsDisabled && forwardsDisabled);
            }

            if (self.params.bullets && self.params.bullets.enabled) {
                self.$bullets.removeClass(self.params.activeClassName)
                    .eq(self.state.currentIndex).addClass(self.params.activeClassName);
            }

            return self;
        },

        scrollTo: function (scrollOffset, force) {
            var self = this;
            var css = self.cleanObject();

            scrollOffset = scrollOffset || 0;

            if (self.state.direction === 'HORIZONTAL') {
                css = {scrollLeft: scrollOffset};
            } else if (self.state.direction === 'VERTICAL') {
                css = {scrollTop: scrollOffset};
            }

            self.update(scrollOffset);
            self.$overflow.removeClass(self.params.snapClassName).stop().animate(css, force ? 0 : self.params.duration);

            return self;
        },

        scrollNext: function () {
            var self = this;

            var scroll = 0;
            var stepSize = self.getStepSize();

            if (self.state.direction === 'HORIZONTAL') {
                scroll = self.$overflow.scrollLeft() / stepSize;
            } else if (self.state.direction === 'VERTICAL') {
                scroll = self.$overflow.scrollTop() / stepSize;
            }

            self.scrollTo((Math.floor(scroll) + 1) * stepSize);

            return self;
        },

        scrollPrev: function () {
            var self = this;

            var scroll = 0;
            var stepSize = self.getStepSize();

            if (self.state.direction === 'HORIZONTAL') {
                scroll = self.$overflow.scrollLeft() / stepSize;
            } else if (self.state.direction === 'VERTICAL') {
                scroll = self.$overflow.scrollTop() / stepSize;
            }

            self.scrollTo((Math.ceil(scroll) - 1) * stepSize);

            return self;
        },

        bindEvents: function () {
            var self = this;

            self.bind('wheel mousewheel domMouseScroll touchmove pointermove', self.$DOCUMENT, self.params.overflowSelector, function (event) {
                if ($(event.target).closest(self.$container.get(0)).length) {
                    self.throttle('scroll', function () {
                        var skipEvent = event.type === 'pointermove' && event.pointerType === 'mouse';
                        if (!skipEvent) {
                            self.$overflow.addClass(self.params.snapClassName);
                            self.$overflow.stop();
                            self.update();
                        }
                    });
                }
            });

            self.on('update', function () {
                self.getElements();
                self.scrollTo(self.getStepSize() * self.state.currentIndex, true);
                self.update();
            });

            self.bind('resize update', self.$WINDOW, function () {
                self.scrollTo(self.getStepSize() * self.state.currentIndex, true);
                self.update();
            });

            self.on('click', self.params.buttonBackwardsSelector, function (event) {
                event.preventDefault();

                self.scrollPrev();
            });

            self.on('click', self.params.buttonForwardsSelector, function (event) {
                event.preventDefault();

                self.scrollNext();
            });

            self.on('click', self.params.bulletsSelector, function (event) {
                event.preventDefault();

                var bulletIndex = $(this).index();
                self.scrollTo(self.getStepSize() * bulletIndex);
            });

            return self;
        },

        init: function () {
            var self = this;

            return self.render();
        }
    });

    $.fn.scrollCarousel = function (settings) {
        return this.each(function (i, container) {
            $.data(this, 'scrollCarousel', new ScrollCarousel(container, settings));
        });
    };
}(jQuery));
