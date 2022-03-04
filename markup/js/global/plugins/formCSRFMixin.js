(function ($) {
    'use strict';

    var MIXIN_DEFAULTS = {
        formCSRF: {
            onInit: null
        }
    };

    $.formCSRFMixin = {
        initFormCSRF: function () {
            var self = this;

            self.params = $.extend(true, {}, self.translate(MIXIN_DEFAULTS), self.params);

            self.params.requestHeaders = self.params.requestHeaders.concat({
                name: 'X-CSRFToken',
                value: $.depotStorage.getItem('csrftoken', 'cookie')
            });

            self.call(self.params.formCSRF.onInit);
        }
    };
}(jQuery));
