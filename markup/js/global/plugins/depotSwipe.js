/**
 * @name depotSwipe ~
 * @version 3.0.0
 * @author Виктор Дмитриевцев <v.dmitrievcev@designdepot.ru>
 * @see git@git.designdepot.ru:frontend/depotSwipe.git
 * @license MIT
 */
(function ($) {
    'use strict';

    var EVENTS_ALL = {
        START: {
            pointer: ['pointerdown'],
            touch: ['touchstart'],
            ms: ['mspointerdown'],
            mouse: ['mousedown']
        },
        MOVE: {
            pointer: ['pointermove'],
            touch: ['touchmove'],
            ms: ['mspointermove'],
            mouse: ['mousemove']
        },
        END: {
            pointer: ['pointerup'],
            touch: ['touchend'],
            ms: ['mspointerup'],
            mouse: ['mouseup']
        },
        CANCEL: {
            pointer: ['pointerleave', 'pointercancel'],
            touch: ['touchcancel'],
            ms: ['mspointercancel'],
            mouse: ['mouseleave']
        }
    };

    function hasEvent(eventType) {
        return 'on' + eventType in document.documentElement;
    }

    function DepotSwipe(container, settings) {
        var self = this;

        return self.call(self._init, container, settings);
    }

    DepotSwipe.prototype = $.extend(true, {}, $.depotProto, {
        pluginName: 'depotSwipe',

        defaults: {
            targetSelector: false,
            mouse: true,
            swipeThreshold: 30,
            onStart: null,
            onMove: null,
            onEnd: null,
            onCancel: null
        },

        getInitialState: function () {
            var self = this;

            return {
                EVENTS: self.detectEvents()
            };
        },


        detectEvents: function () {
            var self = this;
            var EVENTS = self.cleanObject();

            $.each(EVENTS_ALL, function (eventGroupName, eventGroup) {
                $.each(eventGroup, function (eventType, eventNameList) {
                    var goNext = true;
                    $.each(eventNameList, function (i, eventName) {
                        if (hasEvent(eventName)) {
                            goNext = false;
                            if (!EVENTS[eventGroupName]) {
                                EVENTS[eventGroupName] = [eventName];
                            } else {
                                EVENTS[eventGroupName].push(eventName);
                            }
                        }
                    });

                    return goNext;
                });
            });

            return EVENTS;
        },

        normalizePointer: function (event) {
            var self = this;
            var reMouse = new RegExp('pointer', 'i');
            var rePointer = new RegExp('pointer', 'i');
            var isTypeMouse = reMouse.test(event.originalEvent.type);
            var isTypePointer = rePointer.test(event.originalEvent.type);
            var left = event.pageX;
            var top = event.pageY;
            var isMouse = true;

            if (event.originalEvent && isTypePointer) {
                isMouse = event.pointerType === 'mouse';
                left = event.originalEvent.pageX;
                top = event.originalEvent.pageY;
            } else if (event.originalEvent && event.originalEvent.touches) {
                isMouse = false;
                if (event.originalEvent.touches.length) {
                    left = event.originalEvent.touches[0].pageX;
                    top = event.originalEvent.touches[0].pageY;
                }
            } else if (event.targetTouches) {
                isMouse = false;
                if (event.targetTouches.length) {
                    left = event.targetTouches[0].pageX;
                    top = event.targetTouches[0].pageY;
                }
            } else if (event.originalEvent && isTypeMouse && self.params.mouse) {
                left = event.originalEvent.pageX;
                top = event.originalEvent.pageY;
            }

            return {
                left: parseInt(left, 10),
                top: parseInt(top, 10),
                isMouse: isMouse
            };
        },

        getPosition: function () {
            var self = this;

            var elementParentOffset = self.$container.parent().offset();

            return {
                top: self.state.current.top - elementParentOffset.top,
                left: self.state.current.left - elementParentOffset.left
            };
        },

        getState: function () {
            var self = this;

            return self.cleanObject(self.state);
        },

        start: function (event) {
            var self = this;

            if (!self.state.isActive) {
                self.state.isActive = true;

                self.state.start = self.normalizePointer(event);
                self.state.current = self.state.start;
                self.state.last = self.state.start;
                self.state.path = [self.state.start];
                self.state.position = self.getPosition();

                self.call(self.params.onStart, event, self.getState());
            }

            return self;
        },

        move: function (event) {
            var self = this;

            if (self.state.isActive) {
                self.state.last = self.cleanObject(self.state.current);
                self.state.current = self.normalizePointer(event);

                self.state.delta = {
                    top: self.state.last.top - self.state.current.top,
                    left: self.state.last.left - self.state.current.left
                };

                self.state.path.push(self.state.current);
                self.state.position = self.getPosition();

                self.call(self.params.onMove, event, self.getState());
            }

            return self;
        },

        end: function (event) {
            var self = this;

            if (self.state.isActive) {
                self.state.isActive = false;

                self.state.delta = self.state.current.left - self.state.start.left;
                if (Math.abs(self.state.delta) >= self.params.swipeThreshold) {
                    self.call(self.params.onEnd, event, self.getState());
                } else {
                    self.call(self.params.onCancel, event, self.getState());
                }
            }

            return self;
        },

        cancel: function (event) {
            var self = this;

            if (self.state.isActive) {
                self.state.isActive = false;
                self.state.delta = self.state.current.left - self.state.start.left;
                self.call(self.params.onCancel, event, self.getState());
            }

            return self;
        },

        bindEvents: function () {
            var self = this;

            self.bind(self.state.EVENTS.START, self.$container, self.params.targetSelector, self.start.bind(self));

            self.bind(self.state.EVENTS.MOVE, self.$DOCUMENT, self.move.bind(self));

            self.bind(self.state.EVENTS.END, self.$DOCUMENT, self.end.bind(self));

            self.bind(self.state.EVENTS.CANCEL, self.$DOCUMENT, self.cancel.bind(self));

            return self;
        },
        init: function () {
            var self = this;

            self.call(self.params.onInit);

            return self;
        }
    });

    $.fn.depotSwipe = function (settings) {
        return this.each(function (i, container) {
            $.data(this, 'depotSwipe', new DepotSwipe(container, settings));
        });
    };
}(jQuery));
