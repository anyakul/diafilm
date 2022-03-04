(function ($) {
    'use strict';

    function FormFieldSelect(container, settings) {
        var self = this;

        return self.call(self._init, container, settings);
    }

    FormFieldSelect.prototype = $.extend(true, {}, $.depotProto, {
        pluginName: 'formFieldSelect',

        defaults: {
            labelSelector: '.js-form-field-label',
            valueSelector: '.js-form-field-value',
            elementSelector: '.js-form-field-element',
            valueTemplate: '#{for item in selected}#{if item.icon}#{endif}${item.text}#{if !loop.isLast}, #{endif}#{endfor}',
            dropDown: {
                template: '<div class="field__dropdown ${dropDown.selector|substr(1)}">${dropDown.listTemplate}#{if isMultiple}${dropDown.actionsTemplate}#{endif}</div>',
                listTemplate: '<ul class="field__list" id="${id}" role="listbox" aria-multiselectable="${isMultiple}" aria-orientation="vertical">${dropDown.listItemsTemplate}</ul>',
                listItemsTemplate: '#{for item in items}<li class="field__item ${dropDown.itemSelector|substr(1)}" data-icon="${item.icon}" data-value="${item.value}" role="option" aria-selected="${item.selected}" aria-disabled="${item.disabled}" tabindex="0">${item.text}</li>#{endfor}',
                actionsTemplate: '<div class="field__actions">${dropDown.buttonApplyTemplate}${dropDown.buttonResetTemplate}</div>',
                buttonApplyTemplate: '<button class="field__button field__button_apply ${dropDown.applySelector|substr(1)}" type="button">_{buttons.apply}</button>',
                buttonResetTemplate: '<button class="field__button field__button_reset ${dropDown.resetSelector|substr(1)}" type="button">_{buttons.reset}</button>',
                selectedClassName: 'is-selected',
                selector: '.js-form-field-dropdown',
                itemSelector: '.js-form-field-item',
                applySelector: '.js-form-field-apply',
                resetSelector: '.js-form-field-reset',
                mediaQuery: '(min-width: 740px)'
            },
            dictionary: {
                buttons: {
                    apply: {
                        ru: 'Применить',
                        en: 'Apply'
                    },
                    reset: {
                        ru: 'Сбросить',
                        en: 'Reset'
                    }
                }
            },
            nullValue: '',
            onChangeSubmit: false,
            onChange: null
        },

        isMultiple: function () {
            var self = this;

            return self.$element.prop('multiple');
        },

        isDisabled: function () {
            var self = this;

            return self.$element.prop('disabled');
        },

        getItemData: function (item) {
            var self = this;
            var $item = $(item);
            var itemData = {
                text: item.textContent.trim(),
                value: $item.data('value') || '',
                icon: $item.data('icon') || '',
                selected: $item.aria('selected') === 'true',
                disabled: $item.aria('disabled') === 'true'
            };
            itemData.hash = self.hashify(itemData, 12);
            return itemData;
        },

        getOptionData: function (option) {
            var self = this;
            var optionData = {
                text: option.textContent.trim(),
                value: option.value,
                icon: $(option).data('icon') || '',
                selected: option.selected,
                disabled: option.disabled
            };
            optionData.hash = self.hashify(optionData, 12);
            return optionData;
        },

        getSelectData: function () {
            var self = this;
            var data = {
                items: [],
                selected: []
            };

            self.$element.find('option').each(function (i, item) {
                var itemData = self.getOptionData(item);
                data.items = data.items.concat(itemData);
                if (itemData.selected) {
                    data.selected = data.selected.concat(itemData);
                }
            });

            if (!data.selected.length) {
                data.selected = data.selected.concat(data.items[0]);
            }

            data.hash = self.hashify(data, 12);

            return data;
        },

        getDropDownData: function () {
            var self = this;
            var data = {
                items: [],
                selected: []
            };

            self.$dropDown.find(self.params.dropDown.itemSelector).each(function (i, item) {
                var itemData = self.getItemData(item);
                data.items = data.items.concat(itemData);
                if (itemData.selected) {
                    data.selected = data.selected.concat(itemData);
                }
            });

            if (!data.selected.length) {
                data.selected = data.selected.concat(data.items[0]);
            }

            data.hash = self.hashify(data, 12);

            return data;
        },

        updateValue: function () {
            var self = this;

            self.$value.html(self.format(self.params.valueTemplate, self.state.data));

            return self;
        },

        updateTabindex: function () {
            var self = this;

            if (self.state.mediaQuery.matches) {
                self.$element.attr('tabindex', '-1');
                self.$value.attr('tabindex', '0');
            } else {
                self.$element.attr('tabindex', '0');
                self.$value.attr('tabindex', '-1');
            }

            return self;
        },

        updateState: function () {
            var self = this;
            var currentData = self.getSelectData();

            if (self.state.data.hash !== currentData.hash) {
                self.state.data = currentData;
                self.updateValue();
            }

            return self;
        },

        update: function () {
            var self = this;
            var dropDownData = self.getDropDownData();

            if (dropDownData.hash !== self.state.data.hash) {
                var $selectItems = self.$element.find('option');

                $.each(dropDownData.items, function (i, dropDownItem) {
                    var stateItem = self.state.data.items[i];
                    var $selectItem = $selectItems.eq(i);
                    if (dropDownItem.hash !== stateItem.hash) {
                        self.state.data.items[i] = dropDownItem;
                        $selectItem.prop('disabled', dropDownItem.disabled);
                        $selectItem.prop('selected', dropDownItem.selected);
                    }
                });
                self.$element.trigger('change');
                self.$element.trigger('focusout');
            }

            return self;
        },

        buildDropDown: function () {
            var self = this;

            if (self.$dropDown) {
                self.$dropDown.remove();
            }

            var dropdownContext = $.extend({
                id: self.eventNameSpace.substr(1),
                isMultiple: self.isMultiple(),
                dropDown: self.params.dropDown
            }, self.state.data);

            var dropDownHTML = self.format(self.params.dropDown.template, dropdownContext);
            var $dropDown = $(dropDownHTML);
            self.$value.aria('controls', dropdownContext.id);
            self.$container.append($dropDown);

            return $dropDown;
        },

        expandDropDown: function () {
            var self = this;

            self.state.isExpanded = true;

            self.$dropDown = self.buildDropDown();

            self.delay(function () {
                var $selectedItem = self.$dropDown.find(self.params.dropDown.itemSelector + '[aria-selected="true"]').first();

                self.$container.addClass(self.params.activeClassName);
                self.$value.aria('expanded', 'true');
                self.$dropDown.aria('hidden', 'false');

                if ($selectedItem.length) {
                    $selectedItem.focus();
                }

                self.$BODY.on(self.addEventNS('click', '.kickoff'), function (event) {
                    if (self.state.isExpanded && !$(event.target).closest(self.params.dropDown.selector).length) {
                        self.collapseDropDown();
                    }
                });

                self.call(self.params.onExpand);
            });

            return self;
        },

        collapseDropDown: function (reset) {
            var self = this;

            self.state.isExpanded = false;
            self.$container.removeClass(self.params.activeClassName);
            self.$value.aria('expanded', 'false');
            self.$dropDown.aria('hidden', 'true');

            self.$BODY.off(self.addEventNS('click', '.kickoff'));

            if (!reset) {
                self.update();
            }

            self.$value.focus();

            self.call(self.params.onCollapse, reset);

            return self;
        },

        toggleDropDown: function () {
            var self = this;

            if (self.state.isExpanded) {
                self.collapseDropDown();
            } else {
                self.expandDropDown();
            }

            return self;
        },

        toggleItem: function ($item, collapse) {
            var self = this;

            var $nullItem = self.$dropDown.find(self.params.dropDown.itemSelector + '[data-value="' + self.params.nullValue + '"]');
            var isSelected = $item.aria('selected') === 'true';
            var isDisabled = $item.aria('disabled') === 'true';

            if (!isDisabled) {
                if ($item.data('value') !== self.params.nullValue) {
                    if (self.isMultiple()) {
                        if (isSelected) {
                            $item.aria('selected', 'false');
                            if (!self.$dropDown.find(self.params.dropDown.itemSelector + '[aria-selected="true"]').length) {
                                $nullItem.aria('selected', 'true').focus();
                            }
                        } else {
                            $item.aria('selected', 'true').focus();
                            $nullItem.aria('selected', 'false');
                        }
                    } else {
                        $item.aria('selected', 'true').focus();
                        $item.siblings().aria('selected', 'false');
                    }
                } else {
                    $nullItem.aria('selected', 'true').focus();
                    $nullItem.siblings().aria('selected', 'false');
                }
            }

            if (!self.isMultiple() || collapse) {
                self.collapseDropDown();
            }

            return self;
        },

        updateAll: function () {
            var self = this;

            self.updateState();
            self.buildDropDown();

            return self;
        },

        reset: function (event) {
            var self = this;

            if (event) {
                event.stopPropagation();
            }

            self.$element.html(self.state.initialHTML);
            self.delay(function () {
                self.$element.trigger('clear');
                self.updateState();
            }, 10);

            return self;
        },

        bindEvents: function () {
            var self = this;

            self.bind('resize', self.$WINDOW, self.updateTabindex.bind(self));

            self.on('reset', self.params.elementSelector, self.reset.bind(self));

            self.on('update', self.params.elementSelector, self.updateAll.bind(self));

            self.on('change', self.params.elementSelector, function (event) {
                self.updateState();

                self.call(self.params.onChange);

                if (self.params.onChangeSubmit) {
                    self.$container.closest('form').trigger('submit');
                }
            });

            self.on('click', self.params.labelSelector, function (event) {
                if (self.state.mediaQuery.matches) {
                    if (!self.isDisabled()) {
                        event.preventDefault();
                        event.stopPropagation();
                        self.toggleDropDown();
                    }
                }
            });

            self.on('click', self.params.valueSelector, function (event) {
                if (self.state.mediaQuery.matches) {
                    if (!self.isDisabled()) {
                        event.preventDefault();
                        event.stopPropagation();
                        self.toggleDropDown();
                    }
                }
            });

            self.on('keyup', self.params.valueSelector, function (event) {
                if (self.state.mediaQuery.matches) {
                    if (!self.state.isExpanded && !self.isDisabled()) {
                        if (event.keyCode === self.KEYS.ARROW_DOWN || event.keyCode === self.KEYS.ARROW_UP) {
                            event.preventDefault();

                            self.expandDropDown();
                        }

                        if (event.keyCode === self.KEYS.ESCAPE) {
                            event.preventDefault();
                            event.stopPropagation();

                            self.collapseDropDown(true);
                        }
                    }
                }
            });

            self.on('keydown', self.params.valueSelector, function (event) {
                if (self.state.mediaQuery.matches) {
                    if (event.keyCode === self.KEYS.SPACE || event.keyCode === self.KEYS.ENTER || event.keyCode === self.KEYS.ARROW_DOWN) {
                        event.preventDefault();

                        if (!self.state.isExpanded) {
                            self.expandDropDown();
                        }
                    }
                }
            });

            self.on('transitionend', self.params.dropDown.selector, function (event) {
                self.$dropDown.find(self.params.dropDown.itemSelector + '[aria-selected="true"]').first().focus();
            });

            self.on('keydown', self.params.dropDown.selector, function (event) {
                var $focusItem = self.$dropDown.find(self.params.dropDown.itemSelector + ':focus');

                if ((event.keyCode === self.KEYS.TAB) || event.keyCode === self.KEYS.ARROW_DOWN || event.keyCode === self.KEYS.ARROW_UP) {
                    event.preventDefault();

                    if (event.keyCode === self.KEYS.ARROW_DOWN || (!event.shiftKey && event.keyCode === self.KEYS.TAB)) {
                        var $nextItem = $focusItem.next();
                        if (!$nextItem.length) {
                            $nextItem = self.$dropDown.find(self.params.dropDown.itemSelector).first();
                        }

                        $nextItem.focus();
                    } else if (event.keyCode === self.KEYS.ARROW_UP || (event.shiftKey && event.keyCode === self.KEYS.TAB)) {
                        var $prevItem = $focusItem.prev();
                        if (!$prevItem.length) {
                            $prevItem = self.$dropDown.find(self.params.dropDown.itemSelector).last();
                        }

                        $prevItem.focus();
                    }
                }

                if (event.keyCode === self.KEYS.SPACE) {
                    event.preventDefault();

                    self.toggleItem($focusItem);
                }

                if (event.keyCode === self.KEYS.ENTER) {
                    event.preventDefault();

                    self.toggleItem($focusItem);
                    self.collapseDropDown();
                }

                if (event.keyCode === self.KEYS.ESCAPE) {
                    event.preventDefault();
                    event.stopPropagation();

                    self.collapseDropDown(true);
                }
            });

            self.on('click', self.params.dropDown.applySelector, function (event) {
                event.preventDefault();

                self.collapseDropDown();
            });

            self.on('click', self.params.dropDown.resetSelector, function (event) {
                event.preventDefault();

                self.collapseDropDown(true);
            });

            self.on('click', self.params.dropDown.itemSelector, function (event) {
                event.preventDefault();

                self.toggleItem($(this));
            });

            return self;
        },

        getInitialState: function () {
            var self = this;

            return {
                data: {
                    items: [],
                    selected: []
                },
                mediaQuery: window.matchMedia(self.params.dropDown.mediaQuery),
                initialHTML: self.$element.html(),
                isDisabled: self.isDisabled()
            };
        },

        init: function () {
            var self = this;

            self.updateState();
            self.updateTabindex();

            self.call(self.params.onInit);

            return self;
        }
    });

    $.fn.formFieldSelect = function (settings) {
        return $(this).each(function (i, container) {
            $.data(this, 'formFieldSelect', new FormFieldSelect(container, settings));
        });
    };
}(jQuery));
