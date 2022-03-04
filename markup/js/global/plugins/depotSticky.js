(function ($) {
    'use strict';

    function DepotSticky(container, settings) {
        var self = this;

        return self.call(self._init, container, settings);
    }

    DepotSticky.prototype = $.extend(true, {}, $.depotProto, {
        pluginName: 'depotSticky',

        defaults: {
            position: 'top',
            minWidth: 0,
            offsetTop: 0,
            offsetBottom: 0
        },

        setStyles: function (styles, pub) {
            var self = this;

            var flatStyles = $.param(styles);
            self.$container.css(styles);

            if (pub && self.state.flatStyles !== flatStyles) {
                self.state.flatStyles = flatStyles;
                self.trigger('position:' + self.state.currentPosition);
            }

            return self;
        },

        resetStyles: function () {
            var self = this;

            var styles = {
                position: '',
                top: '',
                bottom: '',
                width: ''
            };

            self.setStyles(styles);

            delete self.state.currentPosition;

            return self;
        },

        updateSize: function () {
            var self = this;

            self.resetStyles();
            var containerOffsetTop = self.$container.offset().top;
            var containerOuterHeight = Math.round(self.$container.outerHeight(true));

            self.state.element = {
                top: containerOffsetTop,
                bottom: containerOffsetTop + containerOuterHeight,
                height: containerOuterHeight,
                width: self.$container.outerWidth()
            };

            var parentOffsetTop = self.$parent.offset().top;
            var parentOuterHeight = Math.round(self.$parent.outerHeight(true));
            self.state.parent = {
                top: parentOffsetTop,
                bottom: parentOffsetTop + parentOuterHeight,
                height: parentOuterHeight,
                width: self.$parent.width()
            };

            if (window.innerWidth >= self.params.minWidth) {
                self.updatePosition();
            }

            return self;
        },

        updatePosition: function () {
            var self = this;

            var scrollTop = self.$WINDOW.scrollTop();
            var viewport = {
                top: scrollTop + self.params.offsetTop,
                bottom: scrollTop + window.innerHeight - self.params.offsetBottom
            };

            var styles = {
                position: '',
                top: '',
                bottom: '',
                width: ''
            };

            if (!self.state.currentPosition) {
                self.state.currentPosition = 'default';
            }

            var newPosition;

            if (self.state.parent.height > self.state.element.height) {
                newPosition = 'default';

                if (self.params.position === 'top') {
                    if (self.state.parent.top <= viewport.top) {
                        styles.position = 'fixed';
                        styles.top = self.params.offsetTop;

                        newPosition = 'fixed';
                    }

                    if (self.state.parent.bottom <= viewport.top + self.state.element.height) {
                        styles.position = 'absolute';
                        styles.top = '';
                        styles.bottom = 0;

                        newPosition = 'bottom';
                    }
                } else if (self.params.position === 'bottom') {
                    if (self.state.parent.top + self.state.element.height <= viewport.bottom && self.state.parent.bottom >= viewport.bottom) {
                        styles.position = 'fixed';
                        styles.bottom = self.params.offsetBottom;

                        newPosition = 'fixed';
                    } else {
                        styles.position = 'absolute';
                        styles.bottom = 0;

                        newPosition = 'bottom';
                    }
                }

                styles.width = self.state.element.width;
            }

            if (self.state.currentPosition !== newPosition) {
                self.state.currentPosition = newPosition;
                self.setStyles(styles, true);
            }

            return self;
        },

        bindEvents: function () {
            var self = this;

            self.bind('resize scroll update', self.$WINDOW, function () {
                self.updateSize();
                self.updatePosition();
            });

            return self;
        },

        init: function () {
            var self = this;

            self.$parent = self.$container.parent();

            self.updateSize();
            self.updatePosition();

            return self;
        }
    });

    $.fn.depotSticky = function (settings) {
        return this.each(function (i, container) {
            $.data(container, 'depotSticky', new DepotSticky(container, settings));
        });
    };
}(jQuery));
