(function ($) {
    'use strict';

    function Diafilm(container, settings) {
        var self = this;

        return self.call(self._init, container, settings);
    }

    Diafilm.prototype = $.extend(true, {}, $.depotProto, {
        pluginName: 'diafilm',

        defaults: {
            playerSelector: '.js-diafilm-player',
            iframeSelector: '.js-diafilm-iframe',
            upSelector: '.js-diafilm-up',
            downSelector: '.js-diafilm-down'
        },

        getInitialState: function () {
            var self = this;
            return self.cleanObject({});
        },

        execAction: function (action) {
            var self = this;

            self.iframe.contentWindow.postMessage('BRclick:' + action, 'https://arch.rgdb.ru');

            return self;
        },
        bindEvents: function () {
            var self = this;

            self.$iframe.on('load', function () {
                self.execAction('full').execAction('zoom_auto');
                self.delay(function () {
                    self.$container.removeClass(self.params.processingClassName)
                        .addClass('is-ready');
                }, 300);
            });

            self.on('click', self.params.upSelector, function (event) {
                event.preventDefault();
                self.execAction('book_up');
            });

            self.on('click', self.params.downSelector, function (event) {
                event.preventDefault();
                self.execAction('book_down');
            });

            self.on('fullscreenchange msfullscreenchange mozfullscreenchange webkitfullscreenchange', self.params.playerSelector, function () {
                self.delay(function () {
                    self.execAction('zoom_auto');
                }, 300);
            });

            self.bind('resize', self.$WINDOW, function (event) {
                event.preventDefault();
                self.execAction('zoom_auto');
            });

            return self;
        },
        init: function () {
            var self = this;

            self.iframe = self.$iframe.get(0);
            self.$container.addClass(self.params.processingClassName);

            return self;
        }
    });

    $.fn.diafilm = function (settings) {
        return this.each(function (i, container) {
            $.data(this, 'diafilm', new Diafilm(container, settings));
        });
    };
}(jQuery));
