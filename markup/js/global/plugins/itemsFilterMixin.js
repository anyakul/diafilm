(function ($) {
    'use strict';

    var MIXIN_DEFAULTS = {
        itemsFilter: {
            formSelector: '.js-filter',
            tagsSelector: '.js-tag',
            itemsSelector: '.js-item',
            onFilter: null,
            onInit: null
        }
    };

    $.itemsFilterMixin = {
        getFilterFormData: function () {
            var self = this;
            return {};
        },
        getFilterTagsData: function () {
            var self = this;
            var $tag = self.$tags.filter('[aria-pressed="true"]');
            return $tag.data() || {};
        },
        getFilterData: function () {
            var self = this;
            var formData = self.getFilterFormData();
            var tagsData = self.getFilterTagsData();

            return $.extend(true, self.cleanObject(formData), tagsData);
        },
        itemsFilter: function () {
            var self = this;

            self.call(self.params.itemsFilter.onFilter, self.getFilterData());

            return self;
        },
        bindItemsFilterEvents: function () {
            var self = this;

            self.$form.depotForm({
                onChange: function () {
                    self.itemsFilter();
                },
                onInit: function () {
                    var form = this;
                    self.getFilterFormData = self.proxyCallback(self.getFilterFormData, function (formData) {
                        return $.extend(true, self.cleanObject(formData), $.depotParse(form.getFormData()));
                    });
                }
            });

            self.on('click', self.params.itemsFilter.tagsSelector, function (event) {
                event.preventDefault();
                var $tag = $(this);
                self.$tags.aria('pressed', 'false').removeClass(self.params.activeClassName);
                $tag.aria('pressed', 'true').addClass(self.params.activeClassName);
                self.itemsFilter();
            });

            return self;
        },
        initItemsFilter: function () {
            var self = this;

            self.getInitialState = self.proxyCallback(self.getInitialState, function () {
                return $.extend(true, {}, this, {
                    itemsFilter: {}
                });
            });

            self.params = $.extend(true, {}, self.translate(MIXIN_DEFAULTS), self.params);

            self.getElements(self.params.itemsFilter);

            self.state = self.getInitialState();

            self.bindItemsFilterEvents();

            self.call(self.params.itemsFilter.onInit);
        }
    };
}(jQuery));
