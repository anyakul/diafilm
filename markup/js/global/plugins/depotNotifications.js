(function ($) {
    'use strict';

    function DepotNotifications() {
        var self = this;

        self.$container = $('.js-notifications');

        // inline notifications
        self.$container.on('click', '.js-notification-close', function (event) {
            event.preventDefault();
            $(this).closest('.js-notification').aria('hidden', true);
        });
    }

    DepotNotifications.prototype = {
        template: '<div class="notification notification_default notification_${mod}" role="alert" aria-hidden="true"><div class="notification__container"><div class="notification__row"><div class="notification__text"><p>${text}</p></div><button class="notification__close js-notification-close" type="button" aria-label="${close}"></button></div></div></div>',
        timeout: 7500,
        minTimeout: 2500,
        maxTimeout: 60000,

        log: function (text, options) {
            var self = this;
            var mod = options && options.mod || 'log';
            var timeout = $.depotProto.clamp(self.minTimeout, options && options.timeout || self.timeout, self.maxTimeout);
            var context = options && options.context || {};
            var callback = options && options.callback || null;

            var $notification = $($.depotProto.format(self.template, {
                mod: mod,
                text: $.depotProto.format($.depotProto.translate(text), context),
                close: $.depotProto.translate({
                    ru: 'Закрыть',
                    en: 'Close'
                })
            }));

            self.$container.prepend($notification);

            $.depotProto.delay(function () {
                $notification.get(0).style.setProperty('--timeout', timeout + 'ms');
                $notification.aria('hidden', false);

                var hideCallback = function () {
                    $notification.on('transitionend', function (event) {
                        event.preventDefault();
                        event.stopPropagation();
                        $notification.remove();

                        if (typeof callback === 'function') {
                            callback.call(null);
                        }
                    });

                    $notification.aria('hidden', true);
                };
                var hideDelayId = $.depotProto.delay(hideCallback, timeout);

                $notification.on('click', '.js-notification-close', function (event) {
                    event.preventDefault();
                    $.depotProto.cancelDelay(hideDelayId);
                    hideCallback.call();
                });
            }, 100);
        },

        warn: function (text, options) {
            var self = this;

            if (window.navigator && typeof window.navigator.vibrate === 'function') {
                window.navigator.vibrate(200);
            }

            return self.log(text, $.extend(options, {
                mod: 'warning'
            }));
        },

        info: function (text, options) {
            var self = this;

            return self.log(text, $.extend(options, {
                mod: 'info'
            }));
        }
    };

    $.depotNotifications = new DepotNotifications();
}(jQuery));
