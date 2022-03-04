(function ($) {
    'use strict';

    function FormFieldFile(container, settings) {
        var self = this;

        return self.call(self._init, container, settings);
    }

    FormFieldFile.prototype = $.extend(true, {}, $.depotProto, {
        pluginName: 'formFieldFile',

        defaults: {
            labelSelector: '.js-form-field-label',
            valueSelector: '.js-form-field-value',
            elementSelector: '.js-form-field-element',
            valueTemplate: '#{if hasFiles}<div class="field__list">#{for file in files}<div class="field__item"><span>${file.name|escapeHTML}</span> (${file.size})</div>#{endfor}</div>#{endif}',
            dictionary: {
                units: {
                    b: {
                        ru: 'б',
                        en: 'b'
                    },
                    kb: {
                        ru: 'Кб',
                        en: 'Kb'
                    },
                    mb: {
                        ru: 'Мб',
                        en: 'Mb'
                    }
                }
            }
        },

        getInitialState: function () {
            var self = this;
            return {
                hasFiles: false,
                files: []
            };
        },

        render: function () {
            var self = this;

            var valueHTML = self.format(self.params.valueTemplate, self.state);
            self.$value.html(valueHTML);

            return self;
        },

        toFileSize: function (bytes) {
            var self = this;
            var u = 0;
            var thresh = 1000;
            var units = ['b', 'kb', 'mb'];

            while (bytes >= thresh && u < units.length - 1) {
                bytes /= thresh;
                ++u;
            }

            return self.format('${size|fixed(1, false)|digit}_{units.${unit}}', {
                unit: units[u],
                size: bytes
            });
        },

        update: function () {
            var self = this;
            var filesList = [];
            var files = self.$element.get(0).files;
            var filesQuantity = files && files.length || 0;

            if (filesQuantity) {
                self.$container.addClass(self.params.busyClassName);

                for (var fileIndex = 0; fileIndex < filesQuantity; fileIndex += 1) {
                    var file = files.item(fileIndex);
                    filesList.push({
                        name: file.name,
                        size: self.toFileSize(file.size)
                    });
                }
            }

            self.state.hasFiles = filesQuantity > 0;
            self.state.files = filesList;

            self.render();

            return self;
        },

        bindEvents: function () {
            var self = this;

            self.on('input change reset', self.params.elementSelector, function (event) {
                self.update();
            });

            return self;
        },

        init: function () {
            var self = this;

            self.call(self.params.onInit);

            return self;
        }
    });

    $.fn.formFieldFile = function (settings) {
        return $(this).each(function (i, container) {
            $.data(this, 'formFieldFile', new FormFieldFile(container, settings));
        });
    };
}(jQuery));
