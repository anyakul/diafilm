(function ($) {
    'use strict';

    var MIXIN_DEFAULTS = {
        formMessage: {
            formBodySelector: '.js-form-body',
            formMessageSelector: '.js-form-message',
            formMessageBodySelector: '.js-form-message-body',
            formMessageTitleSelector: '.js-form-message-title',
            formMessageTextSelector: '.js-form-message-text',
            formMessageCloseSelector: '.js-form-message-close',
            successTimeout: 10000,
            errorTimeout: 10000,
            timeout: 10000,
            onInit: null,
            onShow: null,
            onHide: null
        }
    };

    $.formMessageMixin = {
        showFormMessage: function (message, timeout) {
            var self = this;

            if (!self.state.formMessage.isVisible) {
                self.state.formMessage.isVisible = true;

                if (message) {
                    self.$formMessageTitle.html(message.title || '');
                    self.$formMessageText.html(message.body || '');
                }

                self.$formMessage.aria('hidden', 'false');

                if (self.$formBody.length) {
                    self.$formBody.aria('hidden', 'true');
                }

                if (message.success === true) {
                    self.$formMessageBody.attr('data-success', 'true');
                } else if (message.success === false) {
                    self.$formMessageBody.attr('data-success', 'false');
                } else {
                    self.$formMessageBody.removeAttr('data-success');
                }

                if (timeout === undefined) {
                    if (message.success === true) {
                        timeout = self.params.formMessage.successTimeout;
                    } else if (message.success === false) {
                        timeout = self.params.formMessage.errorTimeout;
                    } else {
                        timeout = self.params.formMessage.timeout;
                    }
                }
                if (timeout) {
                    if (self.state.formMessage.hideTimeout) {
                        self.cancelDelay(self.state.formMessage.hideTimeout);
                    }

                    if (typeof timeout === 'number') {
                        self.$formMessageBody.attr('data-autohide', 'true');
                        self.$formMessageBody.get(0).style.setProperty('--autohide-delay', timeout + 'ms');

                        self.state.formMessage.hideTimeout = self.delay(function () {
                            self.hideFormMessage(true);
                        }, timeout);

                        self.$BODY.on(self.addEventNS('click', '.message:click'), function (event) {
                            if (self.state.formMessage.isVisible) {
                                if ($(event.target).closest('body').length && !$(event.target).closest(self.params.formMessage.formMessageBodySelector).length) {
                                    self.hideFormMessage();
                                }
                            }
                        });
                    }
                }

                self.call(self.params.formMessage.onShow, message);
            }

            return self;
        },

        hideFormMessage: function (force) {
            var self = this;

            if (self.state.formMessage.isVisible || force) {
                self.state.formMessage.isVisible = false;

                self.$formMessage.aria('hidden', 'true');
                self.$formMessageBody.removeAttr('data-success');

                self.$formMessageTitle.empty();
                self.$formMessageText.empty();

                if (self.$formBody.length) {
                    self.$formBody.aria('hidden', 'false');
                }

                self.$BODY.off(self.addEventNS('click', '.message:click'));

                self.call(self.params.formMessage.onHide);
            }

            return self;
        },

        bindFormMessageEvents: function () {
            var self = this;

            self.on('click', self.params.formMessage.formMessageCloseSelector, function (event) {
                event.preventDefault();
                self.hideFormMessage();
            });

            self.on('message:show', function (event, message, timeout) {
                self.showFormMessage(message || event.message, timeout || event.timeout);
            });

            self.on('message:hide', function (event, force) {
                self.hideFormMessage(force || event.force);
            });

            self.$BODY.on(self.addEventNS('keyup', '.message:key'), function (event) {
                if (self.state.formMessage.isVisible && event.which === self.KEYS.ESCAPE) {
                    event.preventDefault();
                    self.hideFormMessage();
                }
            });

            return self;
        },

        initFormMessage: function () {
            var self = this;

            self.getInitialState = self.proxyCallback(self.getInitialState, function () {
                return $.extend(true, {}, this, {
                    formMessage: {
                        isVisible: false
                    }
                });
            });

            self.params = $.extend(true, {}, self.translate(MIXIN_DEFAULTS), self.params);

            self.getElements(self.params.formMessage);

            self.state = self.getInitialState();

            self.params.onReset = self.proxyCallback(self.params.onReset, function () {
                return self.hideFormMessage(true);
            });

            self.bindFormMessageEvents();

            self.call(self.params.formMessage.onInit);
        }
    };
}(jQuery));
