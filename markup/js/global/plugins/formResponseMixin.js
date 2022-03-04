(function ($) {
    'use strict';

    var MIXIN_DEFAULTS = {
        formResponse: {
            message: {
                success: true,
                error: true
            },
            reset: true,
            onInit: null,
            onSuccess: null,
            onError: null
        }
    };

    $.formResponseMixin = {
        initFormResponse: function () {
            var self = this;

            self.getInitialState = self.proxyCallback(self.getInitialState, function () {
                return $.extend(true, {}, this, {
                    formResponse: {}
                });
            });

            self.params = $.extend(true, {}, self.translate(MIXIN_DEFAULTS), self.params);

            self.getElements(self.params.formResponse);

            self.state = self.getInitialState();

            self.params.onSubmit = self.proxyCallback(self.params.onSubmit, function (response) {
                if (response) {
                    if (response.success === true) {
                        self.call(self.params.formResponse.onSuccess, response);

                        if (self.params.formResponse.message.success && response.body) {
                            self.call(self.showFormMessage, response);
                        }

                        if (self.params.formResponse.reset) {
                            self.reset();
                        }

                        if (response.redirect_url) {
                            window.location = response.redirect_url;
                        }
                    } else if (response.success === false && response.errors) {
                        self.call(self.params.formResponse.onError, response);
                        $.each(response.errors, function (elementName, errors) {
                            if (elementName === '__all__') {
                                if (self.params.formResponse.message.error) {
                                    self.call(self.showFormMessage, {
                                        success: false,
                                        title: errors[0]
                                    });
                                }
                            } else {
                                self.setExternalErrorFor(self.container[elementName], errors[0]);
                            }
                        });
                    } else if (response.success === false) {
                        self.deleteFormData();
                        self.call(self.params.formResponse.onError, response);
                        if (self.params.formResponse.message.error) {
                            self.call(self.showFormMessage, response);
                        }
                    } else {
                        self.deleteFormData();
                        self.call(self.params.formResponse.onError, response);
                        self.error({
                            action: 'depotForm.onSubmit',
                            data: {
                                response: response
                            },
                            name: 'UnexpectedError',
                            message: 'Неожиданный ответ сервера'
                        });
                    }
                }
            });

            self.params.onError = self.proxyCallback(self.params.onError, function (error, status, description) {
                self.call(self.showFormMessage, {
                    title: status,
                    body: description
                }, 10000);

                return self;
            });

            self.call(self.params.formResponse.onInit);
        }
    };
}(jQuery));
