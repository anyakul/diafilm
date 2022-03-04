(function ($) {
    'use strict';

    function Elevator(container, settings) {
        var self = this;

        return self.call(self._init, container, settings);
    }

    Elevator.prototype = $.extend(true, {}, $.depotProto, {
        pluginName: 'elevator',

        defaults: {
            nameSelector: '.js-elevator-name',
            numberSelector: '.js-elevator-number',
            viewportSelector: '.js-elevator-viewport',
            navigationSelector: '.js-elevator-navigation',
            closeSelector: '.js-elevator-close',
            toggleSelector: '.js-elevator-toggle',
            levelsSelector: '.js-elevator-level',
            shortcutSelector: '.js-elevator-shortcut',
            caretSelector: '.js-elevator-caret',
            floorsSelector: '.js-elevator-floor',
            dataParam: 'id',
            duration: 250,
            animationEnabled: true,
            mediaQueries: null
        },

        getInitialState: function () {
            var self = this;
            var matches = self.matchMedia(self.params.mediaQueries, function (matches) {
                self.state.animationEnabled = matches && matches.animationEnabled || self.params.animationEnabled;
            });

            var animationEnabled = matches && matches.animationEnabled || self.params.animationEnabled;

            return self.cleanObject({
                busy: false,
                floorIndex: 0,
                animationEnabled: animationEnabled
            });
        },
        getFloorIndex: function (floorId) {
            var self = this;
            var floorIndex;

            if (floorId !== undefined) {
                var $floor = self.$floors.filter(function (i, floor) {
                    return $(floor).data(self.params.dataParam).toString() === floorId;
                });
                floorIndex = $floor.index();
            }

            return floorIndex > 0 ? floorIndex : 0;
        },
        goTo: function (floorIndex, force) {
            var self = this;

            if (!self.state.busy) {
                self.state.busy = true;
                self.$levels.removeClass(self.params.activeClassName);
                self.$floors.removeClass(self.params.activeClassName);

                var $level = self.$levels.eq(floorIndex);
                var $floor = self.$floors.eq(floorIndex);
                $level.addClass(self.params.activeClassName);
                $floor.addClass(self.params.activeClassName);

                self.$number.text(floorIndex + 1);
                self.$name.text($level.text().trim());

                var floorId = $floor.data(self.params.dataParam);
                var floorHeight = $floor.outerHeight();
                var currentPosition = self.state.floorIndex * floorHeight;
                var position = floorIndex * floorHeight;
                var positionDelta = position - currentPosition;
                var doneCallback = function () {
                    self.state.busy = false;
                    self.state.floorIndex = floorIndex;

                    $.depotHash.set(floorId);
                    self.$WINDOW.trigger('update');
                };

                self.$container.attr('data-id', floorId);

                if (self.state.animationEnabled) {
                    if (!force) {
                        //TODO: (elevator) Подумать над сменой цвета навигатора, когда проезжает третий этаж
                        var duration = Math.abs(floorIndex - self.state.floorIndex) * self.params.duration;
                        self.animate(duration, function (delta, progress) {
                            self.$caret.css(self.prefixed({
                                transform: 'translate3d(0,' + (currentPosition + positionDelta * progress) + 'px,0)'
                            }));
                        }, {
                            done: doneCallback
                        });
                    } else {
                        self.$caret.css(self.prefixed({
                            transform: 'translate3d(0,' + position + 'px,0)'
                        }));
                        self.call(doneCallback);
                    }
                } else {
                    self.call(doneCallback);
                }
            }

            return self;
        },
        bindEvents: function () {
            var self = this;

            self.on('click', self.params.levelsSelector, function (event) {
                var $level = $(this);
                event.preventDefault();

                self.$navigation.removeClass(self.params.visibleClassName);
                self.$viewport.addClass(self.params.visibleClassName);

                self.throttle('goTo', function () {
                    self.goTo($level.index());
                });
            });

            self.on('click', self.params.toggleSelector, function (event) {
                event.preventDefault();

                self.$navigation.toggleClass(self.params.visibleClassName);
                self.$viewport.toggleClass(self.params.visibleClassName);
            });

            self.on('click', self.params.closeSelector, function (event) {
                event.preventDefault();

                self.$navigation.removeClass(self.params.visibleClassName);
                self.$viewport.addClass(self.params.visibleClassName);
            });

            self.bind('resize', self.$WINDOW, function () {
                self.goTo(self.state.floorIndex, true);
            });

            // TODO: (elevator) Добавить отслеживание прокрутки

            return self;
        },
        init: function () {
            var self = this;
            var floorIndex = 0;
            var hash = $.depotHash.get();

            if (hash) {
                floorIndex = self.getFloorIndex(hash) || floorIndex;
            }

            self.goTo(floorIndex, true);

            return self;
        }
    });

    $.fn.elevator = function (settings) {
        return this.each(function (i, container) {
            $.data(this, 'elevator', new Elevator(container, settings));
        });
    };
}(jQuery));
