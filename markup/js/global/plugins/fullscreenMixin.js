(function ($) {
    'use strict';

    var MIXIN_DEFAULTS = {
        fullscreen: {
            requestFullscreenSelector:'.js-request-fullscreen',
            exitFullscreenSelector:'.js-exit-fullscreen',
            onInit: null,
            onRequest: null,
            onExit: null
        }
    };

    $.fullscreenMixin = {
        fullscreenElement: function () {
            var self = this;
            return document.fullscreenElement || document.msFullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement;
        },
        requestFullscreen: function (element, options) {
            var self = this;
            if(!element){
                element = self.container;
            }
            if (element.requestFullscreen) {
                return element.requestFullscreen(options);
            } else if (element.msRequestFullScreen) {
                return element.msRequestFullScreen();
            } else if (element.mozRequestFullScreen) {
                return element.mozRequestFullScreen(options);
            } else if (element.webkitRequestFullScreen) {
                return element.webkitRequestFullScreen();
            }

            return false;
        },
        exitFullscreen: function () {
            if (document.exitFullscreen) {
                return document.exitFullscreen();
            } else if (document.msExitFullscreen) {
                return document.msExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                return document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) {
                return document.webkitExitFullscreen();
            }
        },
        bindFullscreenEvents: function () {
            var self = this;

            self.on('click', self.params.fullscreen.requestFullscreenSelector, function (event) {
                event.preventDefault();
                if (!self.fullscreenElement()) {
                    self.requestFullscreen(self.$player.get(0), {
                        navigationUI: 'hide'
                    });
                    self.call(self.params.fullscreen.onRequest);
                }
            });

            self.on('click', self.params.fullscreen.exitFullscreenSelector, function (event) {
                event.preventDefault();
                if (self.fullscreenElement()) {
                    self.exitFullscreen();
                    self.call(self.params.fullscreen.onExit);
                }
            });


            return self;
        },
        initFullscreen: function () {
            var self = this;
            self.state.fullscreen = {};
            self.cache.fullscreen = {};
            self.params = $.extend(true, {}, MIXIN_DEFAULTS, self.params);

            self.bindFullscreenEvents();

            self.call(self.params.fullscreen.onInit);
        }
    };
}(jQuery));
