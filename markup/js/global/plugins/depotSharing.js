(function ($) {
    'use strict';

    function DepotSharing(container, settings) {
        var self = this;

        return self.call(self._init, container, settings);
    }

    DepotSharing.prototype = $.extend(true, {}, $.depotProto, {
        pluginName: 'depotSharing',

        defaults: {
            buttonSelector: '.js-sharing-button',
            dataParam: 'action',
            width: 640,
            height: 436
        },

        getInitialState: function () {
            var self = this;

            return self.cleanObject({});
        },

        getContext: function (button) {
            var self = this;

            var title = document.title;
            var url = window.location.href;
            var text = $('meta[name="description"]').attr('content');
            var windowTitle = button.title;

            return self.cleanObject(button.dataset, {
                url: url,
                title: encodeURIComponent(title),
                text: encodeURIComponent(text),
                windowTitle: windowTitle,
            });
        },

        openWindow: function (urlTemplate, context) {
            var self = this;
            var templateContext = self.cleanObject(self.params, context);
            var url = self.format(urlTemplate, templateContext);
            var params = self.format('width=${width},height=${height},toolbar=0,status=0', templateContext);

            return window.open(url, templateContext.title, params);
        },

        share: function (button) {
            var self = this;
            var actions = {
                fb: function (context) {
                    var urlTemplate = 'https://www.facebook.com/sharer/sharer.php?u=${url}';
                    self.openWindow(urlTemplate, context);
                },
                vk: function (context) {
                    var urlTemplate = 'https://vk.com/share.php?url=${url}';
                    self.openWindow(urlTemplate, context);
                },
                tw: function (context) {
                    var urlTemplate = 'https://twitter.com/intent/tweet?text=${title}%20${url}';
                    self.openWindow(urlTemplate, context);
                },
                lin: function (context) {
                    var urlTemplate = 'https://www.linkedin.com/shareArticle?mini=true&url=${url}&title=${title}&summary=${text}';
                    self.openWindow(urlTemplate, context);
                },
                ok: function (context) {
                    var urlTemplate = 'https://connect.ok.ru/offer?url=${url}&title=${title}&description=${text}';
                    self.openWindow(urlTemplate, context);
                },
                cp: function (context) {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(context.url).then(function () {
                            $.depotNotifications.info({
                                ru: 'Ссылка на страницу скопирована.',
                                en: 'Link to page copied.'
                            });
                        }, function () {
                            $.depotNotifications.warn({
                                ru: 'Произошла ошибка при попытке копирования.',
                                en: 'An error occurred while trying to copy.'
                            });
                        });
                    } else {
                        $.depotNotifications.warn({
                            ru: 'Ваш браузер не поддерживает функцию копирования.',
                            en: 'Your browser does not support the copy function.'
                        });
                    }
                }
            };

            var context = self.getContext(button);
            if (context.action) {
                self.call(actions[context.action], context);
            }

            return self;
        },

        bindEvents: function () {
            var self = this;

            self.on('click', self.params.buttonSelector, function (event) {
                event.preventDefault();
                var button = this;

                self.debounce('share', function () {
                    self.share(button);
                });
            });

            return self;
        },

        init: function () {
            var self = this;


            return self;
        }
    });

    $.fn.depotSharing = function (settings) {
        return this.each(function (i, container) {
            $.data(this, 'depotSharing', new DepotSharing(container, settings));
        });
    };
}(jQuery));

