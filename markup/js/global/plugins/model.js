(function ($) {
    'use strict';

    function Model(container, settings) {
        var self = this;

        return self.call(self._init, container, settings);
    }

    Model.prototype = $.extend(true, {}, $.depotProto, {
        pluginName: 'model',

        defaults: {
            pointsSelector: '.js-model-point',
            bubblesSelector: '.js-model-bubble',
        },

        getInitialState: function () {
            var self = this;
            return self.cleanObject({});
        },

        bindEvents: function () {
            var self = this;

            self.on('click', function (event) {
                if (!$(event.target).closest(self.params.pointsSelector).length && !$(event.target).closest(self.params.bubblesSelector).length) {
                    self.$bubbles.prop('hidden', true);
                }
            });

            self.on('click', self.params.pointsSelector, function (event) {
                event.preventDefault();
                var $point = $(this);
                var pointId = $point.data('id').toString();

                self.$bubbles.each(function (i, bubble) {
                    var $bubble = $(bubble);
                    var bubbleId = $bubble.data('id').toString();

                    $bubble.prop('hidden', pointId !== bubbleId);
                });
            });

            return self;
        },

        init: function (container) {
            var self = this;

            return self;
        }
    });

    $.fn.model = function (settings) {
        return this.each(function (i, container) {
            $.data(this, 'model', new Model(container, settings));
        });
    };
}(jQuery));
