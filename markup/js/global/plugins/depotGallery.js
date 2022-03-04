(function ($) {
    'use strict';

    function DepotGallery(container, settings) {
        var self = this;

        return self.call(self._init, container, settings);
    }

    DepotGallery.prototype = $.extend(true, {}, $.depotProto, {
        pluginName: 'depotGallery',

        defaults: {
            viewportSelector: '.js-gallery-viewport',
            listSelector: '.js-gallery-list',
            itemsSelector: '.js-gallery-item',
            navigationSelector: '.js-gallery-navigation',
            clonedClassName: 'is-cloned',
            transitionClassName: 'is-transition',
            slowTransitionClassName: 'is-slow-transition',
            startFrom: 0,
            swipe: true,
            swipeThreshold: 30,
            loop: true,
            beforeChange: null,
            onChange: null,
            onTransitionEnd: null
        },

        getInitialState: function () {
            var self = this;
            var items = [];

            self.$items.each(function (index, item) {
                var $item = $(item);
                var itemData = $(item).data() || {};
                $item.attr('data-index', index + 1);
                items.push($.extend(true, itemData, {
                    index: index + 1,
                    item: item,
                    caption: $item.text().trim()
                }));
            });

            return {
                items: items,
                $current: null,
                current: null,
                currentDOMIndex: 0,
                currentRealIndex: 1,
                direction: 0,
                isTransition: false,
                itemsQuantity: self.$items.length,
                preventClick: false,
                transitionDelay: null
            };
        },

        onTransitionEnd: function () {
            var self = this;
            var $slice;

            self.cancelDelay(self.state.transitionDelay);

            var delta = Math.abs(self.state.direction);

            self.$list.removeClass(self.params.transitionClassName);
            self.$list.removeClass(self.params.slowTransitionClassName);
            self.state.isTransition = false;
            self.state.preventClick = false;

            self.state.$current.attr('tabindex', '0');

            if (self.state.direction > 0) {
                $slice = self.$items.slice(0, self.state.direction);
                self.$list.append($slice);
                self.state.currentDOMIndex -= delta;
                self.$items = self.$list.find(self.params.itemsSelector);
                self.moveListTo(self.$list, self.state.$current, self.state, true);
            } else if (self.state.direction < 0) {
                $slice = self.$items.slice(self.state.direction);
                self.$list.prepend($slice);
                self.state.currentDOMIndex += delta;
                self.$items = self.$list.find(self.params.itemsSelector);
                self.moveListTo(self.$list, self.state.$current, self.state, true);
            }

            self.call(self.params.onTransitionEnd);

            return self;
        },

        moveListToPositionLeft: function ($list, positionLeft, state, force) {
            var self = this;

            if (!force) {
                state.isTransition = true;

                state.transitionDelay = self.delay(function () {
                    self.triggerTo($list, 'transitionend');
                }, 3000);

                if (Math.abs(state.direction) > 1) {
                    $list.addClass(self.params.slowTransitionClassName);
                } else {
                    $list.addClass(self.params.transitionClassName);
                }
            }

            var transforms = self.cleanObject();
            transforms[Modernizr.prefixedCSS('transform')] = Modernizr.prefixedCSSValue('transform', 'translateX(' + positionLeft + 'px)');

            $list.css(transforms);

            return self;
        },

        getItemPosition: function ($item) {
            return $item.position().left * -1;
        },

        moveListTo: function ($list, $current, state, force) {
            var self = this;
            var positionLeft = self.getItemPosition($current);

            self.moveListToPositionLeft($list, positionLeft, state, force);

            return self;
        },

        getClosestDOMIndex: function (realIndex) {
            var self = this;
            var $targetItem = self.state.$current;

            if (realIndex > self.state.currentRealIndex) {
                $targetItem = self.state.$current.next('[data-index="' + realIndex + '"]');
            } else if (realIndex < self.state.currentRealIndex) {
                $targetItem = self.state.$current.prev('[data-index="' + realIndex + '"]');
            }

            return $targetItem.index();
        },

        goTo: function (DOMIndex, force) {
            var self = this;
            var $target = self.$items.eq(DOMIndex);
            var targetRealIndex = $target.data('index');

            if (targetRealIndex === self.state.currentRealIndex && !force) {
                return self;
            }

            self.state.preventClick = !force;

            if ($target.length && !self.state.isTransition) {
                self.call(self.params.beforeChange, DOMIndex, force);

                if (self.state.$current && self.state.$current.length) {
                    self.state.$current.aria('current', 'false');
                    self.state.$current.attr('tabindex', '-1');
                    self.state.$current.find('.js-figure').trigger('figure:stop');
                }

                $target.aria('current', 'true');

                $target.find('[loading="lazy"]').trigger('lazy:load');

                self.state.current = $target.get(0);
                self.state.$current = $target;
                self.state.direction = DOMIndex - self.state.currentDOMIndex;
                self.state.currentDOMIndex = DOMIndex;
                self.state.currentRealIndex = $target.data('index');

                self.moveListTo(self.$list, $target, self.state, force);
                self.call(self.params.onChange, DOMIndex, force);
            }

            return self;
        },

        goForwards: function () {
            var self = this;
            var nextIndex = self.state.currentDOMIndex + 1;

            return self.goTo(nextIndex);
        },

        goBackwards: function () {
            var self = this;
            var nextIndex = self.state.currentDOMIndex - 1;

            return self.goTo(nextIndex);
        },

        loop: function () {
            var self = this;

            function addLazyLoading(i, img) {
                $(img).attr('loading', 'lazy');
            }

            var $firstClonedItems = self.$items.clone().addClass(self.params.clonedClassName);
            var $lastClonedItems = self.$items.clone().addClass(self.params.clonedClassName);

            $firstClonedItems.find('img').each(addLazyLoading);
            $lastClonedItems.find('img').each(addLazyLoading);

            self.$list.prepend($firstClonedItems);
            self.$list.append($lastClonedItems);

            $firstClonedItems.trigger('lazy:added').trigger('figure:added');
            $lastClonedItems.trigger('lazy:added').trigger('figure:added');

            self.getElements();

            return self;
        },

        bindEvents: function () {
            var self = this;

            self.on('transitionend', self.params.listSelector, function (event) {
                event.stopPropagation();
                if ($(event.target).is(self.params.listSelector)) {
                    self.onTransitionEnd();
                }
            });

            self.on('click', self.params.itemsSelector, function (event) {
                var $targetItem = $(this);
                var DOMIndex = $targetItem.index();

                if (self.state.currentDOMIndex !== DOMIndex && !self.state.preventClick) {
                    event.preventDefault();
                    event.stopPropagation();

                    self.throttle('goTo', function () {
                        self.goTo(DOMIndex);
                    });
                }
            });

            self.on('keydown', function (event) {
                switch (event.which) {
                    case self.KEYS.ARROW_LEFT:
                        event.preventDefault();
                        self.throttle('forwards', self.goForwards);
                        break;
                    case self.KEYS.ARROW_RIGHT:
                        event.preventDefault();
                        self.throttle('backwards', self.goBackwards);
                        break;
                }
            });

            self.bind('resize', self.$WINDOW, function () {
                self.throttle('resize', function () {
                    self.goTo(self.state.currentDOMIndex, true);
                }, 15);
            });

            if (self.params.swipe) {
                if (self.hasPlugin('depotSwipe')) {
                    self.$viewport.depotSwipe({
                        targetSelector: self.params.listSelector,
                        touchThreshold: self.params.swipeThreshold,
                        mouse: true,
                        onStart: function (event) {
                            event.preventDefault();
                            self.state.preventClick = true;
                        },
                        onMove: function (event, swipe) {
                            event.preventDefault();

                            var force = true;
                            var currentPosition = self.getItemPosition(self.state.$current);
                            var delta = swipe.current.left - swipe.start.left;

                            if (delta !== 0 && self.state.itemsQuantity > 1) {
                                self.moveListToPositionLeft(self.$list, currentPosition + delta, self.state, force);
                            }
                        },
                        onEnd: function (event, swipe) {
                            event.preventDefault();
                            event.stopPropagation();

                            if (swipe.delta > 0) {
                                self.goBackwards();
                            } else {
                                self.goForwards();
                            }
                        },
                        onCancel: function (event, swipe) {
                            if (swipe.delta !== 0) {
                                var force = true;
                                self.state.direction = 0;
                                self.state.preventClick = true;

                                self.moveListToPositionLeft(self.$list, self.getItemPosition(self.state.$current), self.state, force);
                            } else {
                                self.state.preventClick = false;
                            }
                        }
                    });
                }
            }

            return self;
        },

        init: function () {
            var self = this;

            if (self.params.loop) {
                self.loop();
                self.params.startFrom += self.state.itemsQuantity;
            }

            self.goTo(self.params.startFrom, true);

            self.call(self.params.onInit);

            return self;
        }
    });

    $.fn.depotGallery = function (settings) {
        return this.each(function (i, container) {
            $.data(container, 'depotGallery', new DepotGallery(container, settings));
        });
    };
}(jQuery));
