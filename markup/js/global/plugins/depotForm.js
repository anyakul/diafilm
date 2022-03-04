/**
 * @name depotForm
 * @version 5.0.0~
 * @author Виктор Дмитриевцев <v.dmitrievcev@designdepot.ru>
 * @see git@git.designdepot.ru:frontend/depotForm.git
 * @license MIT
 * (change) переименовал параметр `modificators` -> `modifiers`
 * (add) добавил метод update()
 * (add) добавил метод clearField(element)
 * (add) добавил возможность пробросить заголовок к запросу через параметр `requestHeaders` [{name,value}]
 * (fix) заменил new RegExp -> regexp
 * (fix) поправил сброску формы
 */

(function ($) {
    'use strict';

    function DepotForm(container, settings) {
        var self = this;

        return self.call(self._init, container, settings);
    }

    DepotForm.prototype = $.extend(true, {}, $.depotProto, {
        pluginName: 'depotForm',

        defaults: {
            fields: 'input:not([type="hidden"]), textarea, select',
            fieldSelector: '.js-form-field',
            fieldErrorSelector: '.js-form-field-error',
            submitButtonSelector: '.js-form-submit, [type="submit"]',
            busyClassName: 'is-busy',
            validClassName: 'is-valid',
            invalidClassName: 'is-invalid',
            processingClassName: 'is-processing',
            preventBadSubmit: true,
            preventRepeatedSubmit: true,
            ajax: false,
            dataType: 'json',
            processData: null,
            validation: true,
            validatorClassNamePrefix: 'is-',
            forceValidation: false,
            changeDebounce: 100,
            requestHeaders: [],
            validators: {
                'is-required': {
                    test: function (element, value, trimmedValue) {
                        return trimmedValue && Boolean(trimmedValue.length);
                    },
                    messagePath: 'errors.required'
                },

                'is-string': {
                    test: function (element, value, trimmedValue) {
                        var hasValue = trimmedValue && Boolean(trimmedValue.length);
                        return !hasValue || /^([a-zа-яё.'" -]{1,256})$/ig.test(trimmedValue);
                    },
                    messagePath: 'errors.value'
                },

                'is-number': {
                    test: function (element, value, trimmedValue) {
                        var hasValue = trimmedValue && !!trimmedValue.length;
                        return !hasValue || /^([0-9-]{1,256})$/ig.test(value);
                    },
                    messagePath: 'errors.number'
                },

                'is-email': {
                    test: function (element, value, trimmedValue) {
                        var hasValue = trimmedValue && Boolean(trimmedValue.length);
                        return !hasValue || /^[a-z0-9](['_.-a-z0-9]+)[@]([a-z0-9]+)([.-a-z0-9]+)+[.]([a-z]{2,})$/i.test(value);
                    },
                    messagePath: 'errors.email'
                },

                'is-tel': {
                    test: function (element, value, trimmedValue) {
                        var hasValue = trimmedValue && Boolean(trimmedValue.length);
                        var cleanValue = trimmedValue.replace(/[^0-9+]/g, '');
                        var hasWrong = trimmedValue.replace(/[0-9() +-]/g, '') !== '';
                        var hasRepeats = /([() +-]+)\1+/g.test(trimmedValue);
                        var correctLength = /^[+]?[0-9]{7,}$/i.test(cleanValue);

                        return !hasValue || (!hasWrong && !hasRepeats && correctLength);
                    },
                    messagePath: 'errors.tel'
                },

                'is-date': {
                    test: function (element, value, trimmedValue) {
                        var hasValue = trimmedValue && Boolean(trimmedValue.length);
                        var result = false;

                        var cleanValue = trimmedValue.replace(/[^0-9.]/g, '');
                        var parts = cleanValue.match(/^([0-3][0-9])\.([0-1][0-9])\.([1-2][09][0-9]{2})$/);

                        if (parts && parts.length === 4) {
                            var day = parseInt(parts[1], 10);
                            var month = parseInt(parts[2], 10) - 1;
                            var year = parseInt(parts[3], 10);

                            if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                                var date = new Date(year, month, day) || false;
                                var currentYear = new Date().getFullYear();
                                result = day === date.getDate() && month === date.getMonth() && year === date.getFullYear() && year >= currentYear - 100 && year <= currentYear + 100;
                            }
                        }

                        return !hasValue || Boolean(result);
                    },
                    messagePath: 'errors.value'
                },

                'is-message': {
                    test: function (element, value, trimmedValue) {
                        var hasValue = trimmedValue && Boolean(trimmedValue.length);
                        var minLength = element.minLength && element.minLength !== -1 ? element.minLength : 0;
                        var maxLength = element.maxLength && element.maxLength !== -1 ? element.maxLength : '';
                        var regExp = new RegExp('^(.{' + minLength + ',' + maxLength + '})', 'g');
                        return !hasValue || regExp.test(trimmedValue);
                    },
                    messagePath: 'errors.message'
                },

                'is-password': {
                    test: function (element, value, trimmedValue) {
                        var hasValue = trimmedValue && Boolean(trimmedValue.length);
                        return !hasValue || /^([^а-яё ])/ig.test(trimmedValue);
                    },
                    messagePath: 'errors.password'
                },

                'is-minlength': {
                    test: function (element, value, trimmedValue) {
                        var hasValue = trimmedValue && Boolean(trimmedValue.length);
                        return !hasValue || trimmedValue.length >= element.minLength;
                    },
                    messagePath: 'errors.minlength'
                },

                'is-maxlength': {
                    test: function (element, value, trimmedValue) {
                        var hasValue = trimmedValue && Boolean(trimmedValue.length);
                        return !hasValue || trimmedValue.length <= element.maxLength;
                    },
                    messagePath: 'errors.maxlength'
                },

                'is-same': {
                    test: function (element, value, trimmedValue) {
                        var self = this;
                        var result = false;
                        var hasValue = trimmedValue && Boolean(trimmedValue.length);
                        var sameSlugMatches = element.className.match(/is-same:([^ ]+)/);
                        var sameSlug = sameSlugMatches ? sameSlugMatches[0] : undefined;

                        if (sameSlug) {
                            if (!self.state.same[sameSlug]) {
                                self.state.same[sameSlug] = {
                                    elements: [],
                                    name: undefined,
                                    isSame: true
                                };
                            }

                            var hasElement = false;
                            $.each(self.state.same[sameSlug].elements, function (i, sameElement) {
                                if (element.name === sameElement.name) {
                                    hasElement = true;
                                }

                                return !hasElement;
                            });

                            if (!hasElement) {
                                self.state.same[sameSlug].elements.push(element);

                                if (self.state.same[sameSlug].name === undefined) {
                                    self.state.same[sameSlug].name = self.state.same[sameSlug].elements[0].name;
                                    self.state.same[sameSlug].value = self.state.same[sameSlug].elements[0].value;
                                }
                            }

                            if (self.state.same[sameSlug].elements.length > 1) {

                                if (self.state.same[sameSlug].name === element.name) {
                                    self.state.same[sameSlug].value = value;
                                    result = true;

                                    $.each(self.state.same[sameSlug].elements, function (i, sameElement) {
                                        if (i) {
                                            self.validateField(sameElement);
                                        }
                                    });
                                } else {
                                    result = self.state.same[sameSlug].value === value;
                                }
                            }
                        }

                        return !hasValue || result;
                    },
                    messagePath: 'errors.match'
                },

                'is-external': {
                    test: function (element, value, trimmedValue) {
                        var hasValue = trimmedValue && Boolean(trimmedValue.length);
                        var externalArray = $.data(element, 'external') || [];
                        var cleanValue = value.replace(/[^a-zа-яё0-9]/ig, '');

                        return !hasValue || externalArray.indexOf(cleanValue) === -1;
                    }
                },

                'is-select': {
                    test: function (element, value, trimmedValue) {
                        return trimmedValue !== '' && trimmedValue !== '0' && trimmedValue !== '-1';
                    },
                    messagePath: 'errors.choose'
                },

                'is-checked': {
                    test: function (element, value, trimmedValue) {
                        var self = this;
                        self.state.choose = self.state.choose || {};
                        var $elements = self.$container.find(self.params.fields).filter('[name="' + element.name + '"]');

                        return $elements && !!$elements.filter(':checked').length;
                    },
                    messagePath: 'errors.choose'
                }

            },
            formatters: {
                'to-date': {
                    patterns: ['([0-9]{2})', '([0-9]{2})'],
                    separators: ['.', '.'],
                    permitted: '0-9\.'
                },
                'to-time': {
                    patterns: ['([0-9]{2})'],
                    separators: [':'],
                    permitted: '0-9:'
                },
                'to-card': {
                    patterns: ['([0-9]{4})', '([0-9]{5})', '([0-9]{4})'],
                    separators: [' ', ' '],
                    permitted: '0-9 '
                },
                'to-tel': {
                    patterns: ['([+]?)', '([0-9])', '([0-9]{3})', '([0-9]{3})', '([0-9]{2})'],
                    separators: ['', ' (', ') ', '-', '-'],
                    permitted: '0-9+)(-'
                }
            },
            modifiers: {
                'to-upper': function (event, element, selectionStart, valueHead, valueTail) {
                    var key = event.key;
                    var isOverLength = element.maxLength && element.value.length >= element.maxLength;
                    if (key.length && (isOverLength ? element.selectionStart !== element.selectionEnd : true)) {
                        element.value = (valueHead + key + valueTail).toUpperCase();
                        element.selectionStart = selectionStart + 1;
                        element.selectionEnd = element.selectionStart;
                    } else {
                        element.selectionStart = selectionStart;
                        element.selectionEnd = selectionStart;
                    }
                },
                'to-number': function (event, element, selectionStart, valueHead, valueTail) {
                    var re = /[^0-9-.,]/g;
                    var key = event.key.replace(re, '');
                    var isOverLength = element.maxLength !== -1 && element.value.length >= element.maxLength;
                    if (key.length && (isOverLength ? element.selectionStart !== element.selectionEnd : true)) {
                        element.value = (valueHead + key + valueTail).replace(re, '');
                        element.selectionStart = selectionStart + 1;
                        element.selectionEnd = element.selectionStart;
                    } else {
                        element.selectionStart = selectionStart;
                        element.selectionEnd = selectionStart;
                    }
                },
                'to-phone': function (event, element, selectionStart, valueHead, valueTail) {
                    var re = /[^0-9( )+-]/g;
                    var key = event.key.replace(re, '');
                    var isOverLength = element.maxLength && element.value.length >= element.maxLength;
                    if (key.length && (isOverLength ? element.selectionStart !== element.selectionEnd : true)) {
                        element.value = (valueHead + key + valueTail).replace(re, '');
                        element.selectionStart = selectionStart + 1;
                        element.selectionEnd = element.selectionStart;
                    } else {
                        element.selectionStart = selectionStart;
                        element.selectionEnd = selectionStart;
                    }
                }
            },
            dictionary: {
                errors: {
                    required: {
                        'ru': 'Обязательное поле',
                        'en': 'Required'
                    },
                    value: {
                        'ru': 'Недопустимое значение',
                        'en': 'Invalid value'
                    },
                    email: {
                        'ru': 'Некорректный e-mail',
                        'en': 'Invalid e-mail'
                    },
                    number: {
                        'ru': 'Только числа',
                        'en': 'Only numbers'
                    },
                    tel: {
                        'ru': 'Некорректный формат номера',
                        'en': 'Incorrect number format'
                    },
                    message: {
                        'ru': 'Сообщение слишком короткое',
                        'en': 'The message is too short'
                    },
                    password: {
                        'ru': 'Пароль должен содержать латинские буквы, символы и цифры',
                        'en': 'Password must contain latin letters, symbols and numbers'
                    },
                    minlength: {
                        'ru': 'Минимум ${minLength} ${minLength|plural(символ,символа,символов)}',
                        'en': 'Minimum length ${minLength} ${minLength|plural(character,characters)}'
                    },
                    maxlength: {
                        'ru': 'Максимум ${maxLength} ${maxLength|plural(символ,символа,символов)}',
                        'en': 'Maximum length ${maxLength} ${minLength|plural(character,characters)}'
                    },
                    choose: {
                        'ru': 'Необходимо выбрать',
                        'en': 'Choose'
                    },
                    match: {
                        'ru': 'Поля должны совпадать',
                        'en': 'Fields must match'
                    }
                }
            },
            onChangeSubmit: false,
            onChange: null,
            onSubmit: null,
            onReset: null,
            onError: null,
            onProgress: null,
            onValidation: null
        },

        normalizeFieldName: function (name) {
            return name && name.replace(/[\[\]]/ig, '-') || name;
        },

        filterArray: function (array, filter) {
            var filteredArray = [];
            if (Array.prototype.filter) {
                filteredArray = array.filter(filter);
            } else {
                $.each(array, function (i, element) {
                    if (filter(element, i, array)) {
                        filteredArray.push(element);
                    }
                });
            }

            return filteredArray;
        },

        startProcessingForm: function () {
            var self = this;

            self.state.processing = true;
            self.$container.addClass(self.params.processingClassName);

            return self;
        },

        stopProcessingForm: function () {
            var self = this;

            self.state.processing = false;
            self.$container.removeClass(self.params.processingClassName);

            return self;
        },

        storeFields: function () {
            var self = this;

            self.state.fields = self.state.fields || {};

            self.$container.find(self.params.fields).each(function (i, element) {
                self.addField(element);
            });

            return self;
        },

        addField: function (element) {
            var self = this;

            if (element && element.id && self.state.fields && !self.state.fields[element.id]) {
                self.state.fields[element.id] = {
                    canValidate: false,
                    changed: self.isChangedField(element),
                    busy: self.isBusyField(element)
                };
            }

            return self;
        },

        removeField: function (element) {
            var self = this;

            if (element && element.id) {
                if (self.state.fields && !self.state.fields[element.id]) {
                    delete self.state.fields[element.id];
                }
                if (self.state.errors && !self.state.errors[element.id]) {
                    delete self.state.errors[element.id];
                }
            }

            return self;
        },

        switchValidation: function (element) {
            var self = this;

            var hashedField = self.state.fields[element.id];

            if (hashedField && hashedField.changed) {
                hashedField.canValidate = true;
            }

            return self;
        },

        checkFieldChanges: function (element) {
            var self = this;

            var hashedField = self.state.fields[element.id];

            if (hashedField && !hashedField.changed && self.isChangedField(element)) {
                hashedField.changed = true;
                self.removeExternalErrorFor(element);
            }

            return self;
        },

        busyField: function (element) {
            var self = this;
            var hashedField = self.state.fields[element.id];

            if (hashedField) {
                hashedField.busy = true;

                self.delay(function () {
                    if (hashedField.busy === true) {
                        var $element = $(element);
                        var $field = $element.closest(self.params.fieldSelector);

                        $field.addClass(self.params.busyClassName);
                    }
                });
            }

            return self;
        },

        freeField: function (element, force) {
            var self = this;
            var hashedField = self.state.fields[element.id];

            if (hashedField) {
                hashedField.busy = false;

                self.delay(function () {
                    if (hashedField.busy === false || force) {
                        var $element = $(element);
                        var $field = $element.closest(self.params.fieldSelector);

                        $field.removeClass(self.params.busyClassName);
                    }
                });
            }

            return self;
        },

        isMultipart: function () {
            return this.container.enctype && this.container.enctype.toLocaleLowerCase() === 'multipart/form-data';
        },

        isBusyField: function (element) {
            var isSelect = element.type.indexOf('select') !== -1;
            return (!isSelect && element.value.length > 0) || (isSelect && element.value !== '0' && element.value !== '-1' && element.value !== '');
        },

        isChangedField: function (element) {
            var isSelect = element.type.indexOf('select') !== -1;
            var isCheckbox = element.type === 'checkbox';
            var isRadio = element.type === 'radio';
            var isChanged;

            if (isSelect) {
                isChanged = element.value !== '0' && element.value !== '-1' && element.value !== '';
            } else if (isCheckbox || isRadio) {
                isChanged = element.checked !== element.defaultChecked;
            } else {
                isChanged = element.value !== element.defaultValue;
            }

            return isChanged;
        },

        updateBusynessField: function (element) {
            var self = this;

            if (self.isBusyField(element)) {
                self.busyField(element);
            } else {
                self.freeField(element);
            }

            return self;
        },

        updateBusynessForm: function () {
            var self = this;

            self.$container.find(self.params.fields).each(function () {
                self.updateBusynessField(this);
            });

            return self;
        },

        validateForm: function () {
            var self = this;

            self.$container.find(self.params.fields).each(function () {
                self.validateField(this);
            });

            self.checkSubmit();

            self.call(self.params.onValidation, self.state.errors);

            return self;
        },

        validateField: function (element) {
            var self = this;
            var isValid = true;

            if (self.params.validators) {
                var $element = $(element);
                var className = (element.required ? self.params.validatorClassNamePrefix + 'required ' : '') + element.className;
                var elementClassList = className.trim().split(/[ ]+/) || [];
                if (elementClassList.length) {
                    var $field = $element.closest(self.params.fieldSelector);
                    var field = self.state.fields[element.id];

                    elementClassList = self.filterArray(elementClassList, function (element) {
                        return element.indexOf(self.params.validatorClassNamePrefix) === 0;
                    });

                    $.each(elementClassList, function (i, validatorClassName) {
                        var validator = self.params.validators[validatorClassName.replace(/:(.*)/, '')];

                        if (validator) {
                            if (typeof validator.test === 'function') {
                                var value = element.value;
                                var trimmedValue = value.trim();

                                if (self.call(validator.test, element, value, trimmedValue) || element.disabled) {
                                    self.removeErrorFor(element, validatorClassName);
                                } else {
                                    isValid = false;
                                    self.setErrorFor(element, validatorClassName, validator.message, validator.messagePath);
                                }
                            }
                        } else if (validatorClassName.indexOf(self.params.validatorClassNamePrefix + 'external-') === 0) {
                            var dataArray = $.data(element, 'external') || [];

                            if (dataArray.length) {
                                var message = $.data(element, 'message');
                                var cleanValue = element.value.replace(/[^a-zа-яё0-9]/ig, '');
                                if (dataArray.indexOf(cleanValue) === -1 || element.disabled) {
                                    self.removeExternalErrorFor(element);
                                } else {
                                    isValid = false;
                                    self.setExternalErrorFor(element, message);
                                }
                            }
                        }
                    });

                    if (isValid && field && field.canValidate && field.changed && field.busy) {
                        $field.addClass(self.params.validClassName);
                    } else {
                        $field.removeClass(self.params.validClassName);
                    }
                }
            }

            return isValid;
        },

        setExternalErrorFor: function (element, errorMessage) {
            var self = this;

            if (element) {
                var errorCode = self.params.validatorClassNamePrefix + 'external-' + self.normalizeFieldName(element.name);
                var dataArray = $.data(element, 'external') || [];
                var cleanValue = element.value.replace(/[^a-zа-яё0-9]/ig, '');

                if (dataArray.indexOf(cleanValue) === -1) {
                    dataArray.push(cleanValue);
                    $.data(element, 'external', dataArray);
                    $.data(element, 'message', errorMessage);
                }

                self.setErrorFor(element, errorCode, errorMessage);
            }

            return self;
        },

        removeExternalErrorFor: function (element) {
            var self = this;

            var errorCode = self.params.validatorClassNamePrefix + 'external-' + self.normalizeFieldName(element.name);

            self.removeErrorFor(element, errorCode);

            return self;
        },

        setErrorFor: function (element, errorCode, errorMessage, errorMessagePath) {
            var self = this;

            if (element) {
                var fieldId = element.id;
                var validationFieldId = fieldId.split(':')[0];

                if (!self.state.errors[validationFieldId]) {
                    self.state.errors[validationFieldId] = [];
                }

                if (self.state.errors[validationFieldId].indexOf(errorCode) === -1) {
                    self.state.errors[validationFieldId].push(errorCode);
                }

                if ((self.state.fields[fieldId] && self.state.fields[fieldId].canValidate) || self.state.submitted) {
                    self.showErrorMessage(element, errorCode, errorMessage, errorMessagePath);

                    if (typeof element.willValidate !== 'undefined' && element.willValidate === true) {
                        element.setCustomValidity(self.getValidatorMessage(errorMessage, errorMessagePath, element));
                    }
                } else {
                    self.hideErrorMessage(element, errorCode, errorMessage, errorMessagePath);
                }
            }

            return self;
        },

        removeErrorFor: function (element, errorCode) {
            var self = this;

            if (element) {
                var fieldId = element.id;
                var validationFieldId = fieldId.split(':')[0];

                if (self.state.errors[validationFieldId]) {

                    var externalErrorCode = errorCode + '-' + self.normalizeFieldName(element.name);

                    var errorIndex = self.state.errors[validationFieldId].indexOf(errorCode);
                    var externalIndex = self.state.errors[validationFieldId].indexOf(externalErrorCode);

                    if (errorIndex !== -1) {
                        self.state.errors[validationFieldId].splice(errorIndex, 1);
                    }

                    if (externalIndex !== -1) {
                        self.state.errors[validationFieldId].splice(externalIndex, 1);
                    }

                    if (!self.state.errors[validationFieldId].length) {
                        self.removeErrorsFor(element);

                        if (typeof element.willValidate !== 'undefined') {
                            element.setCustomValidity('');
                        }
                    }
                }
            }

            return self;
        },

        removeErrorsFor: function (element, force) {
            var self = this;

            if (element) {
                var fieldId = element.id;
                var validationFieldId = fieldId.split(':')[0];

                if (self.state.errors[validationFieldId] || force) {
                    delete self.state.errors[validationFieldId];

                    self.hideErrorMessage(element);
                }
            }

            return self;
        },

        showErrorMessage: function (element, errorCode, errorMessage, errorMessagePath) {
            var self = this;

            if (element) {
                self.delay(function () {
                    var $element = $(element);
                    var $field = $element.closest(self.params.fieldSelector);
                    var $fieldError = $field.find(self.params.fieldErrorSelector);

                    $field.removeClass(self.params.validClassName);
                    $field.addClass(self.params.invalidClassName);
                    self.triggerTo($element, 'invalid');

                    if ($fieldError && $fieldError.length) {
                        var validatorMessage = self.getValidatorMessage(errorMessage, errorMessagePath, element);

                        if (validatorMessage) {
                            $field.attr('title', validatorMessage);
                            $fieldError.text(validatorMessage);
                            $fieldError.aria('hidden', 'false');
                        }
                    }

                    $element.aria('invalid', 'true');
                    $element.aria('describedby', $fieldError.attr('id'));
                });
            }

            return self;
        },

        hideErrorMessage: function (element) {
            var self = this;

            if (element) {
                self.delay(function () {
                    var $element = $(element);
                    var $field = $element.closest(self.params.fieldSelector);
                    var $fieldError = $field.find(self.params.fieldErrorSelector);

                    $field.removeClass(self.params.invalidClassName);
                    $field.removeAttr('title');
                    $element.aria('invalid', 'false');
                    $element.removeAria('describedby');
                    $fieldError.text('');
                    $fieldError.aria('hidden', 'true');
                });
            }

            return self;
        },

        calculateErrors: function () {
            var self = this;
            var quantity = 0;

            $.each(self.state.errors, function (i, errors) {
                if (errors && errors.length) {
                    quantity += errors.length;
                }
            });

            return quantity;
        },

        getValidatorMessage: function (message, messagePath, element) {
            var self = this;
            var messageText = message;

            if (!messageText || !messageText.length && messagePath) {
                messageText = self.format(self.getText(messagePath), element);
            }

            return messageText;
        },

        checkSubmit: function () {
            var self = this;

            if (self.params.preventBadSubmit) {
                if (self.calculateErrors()) {
                    self.state.submitDisabled = true;
                    self.$submitButton.prop('disabled', true);
                } else {
                    self.state.submitDisabled = false;
                    self.$submitButton.prop('disabled', false);
                }
            }

            return self;
        },

        getSelectionRange: function (element, isRange) {
            var elementType = element.type;
            var begin = 0;
            var end = 0;
            var selection;
            if (['text', 'search', 'url', 'tel', 'email', 'password'].indexOf(elementType) !== -1) {
                if (typeof element.selectionStart === 'number') {
                    begin = element.selectionStart;
                    end = element.selectionEnd;
                } else {
                    var range = document.selection.createRange();
                    var inputRange = element.createTextRange(),
                        endRange = element.createTextRange(),
                        length = element.value.length;
                    inputRange.moveToBookmark(range.getBookmark());
                    endRange.collapse(false);
                    if (inputRange.compareEndPoints('StartToEnd', endRange) > -1) {
                        begin = length;
                        end = length;
                    } else {
                        begin = -inputRange.moveStart('character', -length);
                        end = -inputRange.moveEnd('character', -length);
                    }
                }
            }
            if (isRange) {
                selection = {
                    begin: begin,
                    end: end
                };
            } else {
                selection = begin;
            }
            return selection;
        },

        setSelection: function (element, selection) {
            var acceptedTypes = ['text', 'search', 'URL', 'tel', 'password'];
            if (typeof element.setSelectionRange === 'function' && acceptedTypes.indexOf(element.type) !== -1) {
                element.focus();
                element.setSelectionRange(selection.begin, selection.end);
            } else if (typeof element.createTextRange === 'function') {
                var range = element.createTextRange();
                range.collapse(true);
                range.moveEnd('character', selection.begin);
                range.moveStart('character', selection.end);
                range.select();
            }
        },

        getCursorPosition: function (element) {
            var self = this;

            return self.getSelectionRange(element, false);
        },

        setCursorPosition: function (element, position) {
            var self = this;

            return self.setSelection(element, {begin: position, end: position});
        },

        maskField: function (event, element) {
            var self = this;
            if (self.params.formatters) {
                var hotKey = event.ctrlKey || event.shiftKey || event.metaKey || event.altKey;
                if (!hotKey && [8, 9, 16, 35, 36, 37, 38, 39, 40, 46].indexOf(event.which) === -1) {
                    if (element.className && element.className.length) {
                        var elementClassList = element.className.split(' ');
                        $.each(self.params.formatters, function (formattersClassName, formatter) {
                            var continueEach = true;
                            if (elementClassList.indexOf(formattersClassName) !== -1) {
                                if (formatter && formatter.patterns && formatter.separators) {
                                    var cursor;
                                    var cursorAtEnd;

                                    if (event.which) {
                                        cursor = self.getCursorPosition(element);
                                        cursorAtEnd = cursor === element.value.length;
                                    }

                                    self.formatField(element, formatter.patterns, formatter.separators, formatter.permitted);

                                    if (event.which) {
                                        if (!cursorAtEnd) {
                                            self.setCursorPosition(element, cursor);
                                        } else {
                                            self.setCursorPosition(element, element.value.length);
                                        }
                                    }
                                }
                            }
                            return continueEach;
                        });
                    }
                }
            }

            return self;
        },

        formatField: function (element, patterns, separators, permitted) {
            var self = this;
            var value = element.value;
            var formatted = value;
            var separatorsChars = '';
            $.each(separators.join('').split(''), function (i, separatorsChar) {
                if (separatorsChars.indexOf(separatorsChar) === -1) {
                    separatorsChars += separatorsChar;
                }
            });
            separatorsChars = separatorsChars.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            var cleanValue = value.replace(new RegExp('[' + separatorsChars + ']', 'ig'), '');
            if (permitted) {
                cleanValue = cleanValue.replace(new RegExp('[^' + permitted + ']', 'ig'), '');
            }
            var pattern = '';
            var replacement = '$1';

            $.each(patterns, function (i) {
                var currentPattern = patterns[i] || '';
                var currentSeparator = separators[i] || '';
                pattern += currentPattern;
                var currentRegExp = new RegExp(pattern, 'i');
                if (currentRegExp.test(cleanValue)) {
                    formatted = cleanValue.replace(currentRegExp, replacement + currentSeparator);
                    if (element.value !== formatted) {
                        element.value = formatted;
                        self.triggerTo(element, 'masked');
                    }
                }
                var nextI = i + 2;
                replacement += currentSeparator + '$' + nextI;
            });
        },

        modifyField: function (event, element) {
            var self = this;

            if (self.params.modifiers) {
                if (!event.ctrlKey && !event.metaKey && event.key && event.key.length === 1) {
                    $.each(self.params.modifiers, function (modificatorClassName, modificator) {
                        var continueEach = true;
                        if (element.className && element.className.length) {
                            if (element.className.split(' ').indexOf(modificatorClassName) !== -1) {
                                if (modificator && typeof modificator === 'function') {
                                    event.preventDefault();
                                    var selectionStart = Math.min(element.selectionStart, element.selectionEnd);
                                    var valueHead = element.value.substr(0, element.selectionStart);
                                    var valueTail = element.value.substr(element.selectionEnd, element.value.length);
                                    self.call(modificator, event, element, selectionStart, valueHead, valueTail);
                                }
                            }
                        }
                        return continueEach;
                    });
                }
            }

            return self;
        },

        deleteFormData: function () {
            var self = this;

            return delete self.state.formData;
        },

        getFormData: function (normalize) {
            var self = this;

            var formData = self.call(self.params.processData);

            if (!formData) {
                if (self.isMultipart()) {
                    formData = new FormData(self.container);
                    if (normalize) {
                        formData = $.depotParse(formData, {
                            reverse: true
                        });
                    }
                } else {
                    formData = self.$container.serialize();
                }
            }

            return formData;
        },

        submit: function (event) {
            var self = this;

            if (!self.state.processing) {
                self.state.submitted = true;

                self.startProcessingForm();

                if (self.params.validation) {
                    self.state.validation = true;
                    self.validateForm();
                }

                if (self.params.validation && self.calculateErrors()) {
                    if (event && typeof event.preventDefault === 'function') {
                        event.preventDefault();
                    }
                    self.stopProcessingForm();
                } else {
                    if (typeof self.params.onSubmit === 'function') {
                        var formData = self.getFormData();

                        if (self.params.preventRepeatedSubmit && self.state.formData === formData) {
                            if (self.params.ajax && event && typeof event.preventDefault === 'function') {
                                event.preventDefault();
                            }

                            self.stopProcessingForm();
                            self.call(self.params.onSubmit, self.state.response);
                        } else {
                            self.state.formData = formData;
                            if (self.params.ajax) {
                                if (event && typeof event.preventDefault === 'function') {
                                    event.preventDefault();
                                }

                                var multipartParams = {
                                    processData: false,
                                    contentType: false
                                };

                                $.ajax($.extend(true, self.isMultipart() ? multipartParams : {}, {
                                    url: self.$container.attr('action') || '',
                                    type: self.$container.attr('method') || 'GET',
                                    data: formData,
                                    dataType: self.params.dataType,
                                    cache: self.params.cache,
                                    xhr: function () {
                                        var xhr = $.ajaxSettings.xhr();
                                        if (xhr.upload) {
                                            xhr.upload.addEventListener('progress', function (progressEvent) {
                                                self.call(self.params.onProgress, progressEvent);
                                            }, true);
                                        }
                                        return xhr;
                                    },
                                    beforeSend: function (xhr) {
                                        if (self.params.requestHeaders.length) {
                                            self.params.requestHeaders.forEach(function (header) {
                                                xhr.setRequestHeader(header.name, header.value);
                                            });
                                        }
                                    },
                                    success: function (response, textStatus, request) {
                                        self.stopProcessingForm();
                                        self.state.response = response;
                                        self.call(self.params.onSubmit, response, textStatus, request);
                                    },
                                    error: function (jqXHR, textStatus, errorThrown) {
                                        self.stopProcessingForm();
                                        self.deleteFormData();
                                        self.call(self.params.onError, jqXHR, textStatus, errorThrown);
                                        self.error({
                                            action: 'DepotForm.submit',
                                            data: {
                                                url: self.container.action || '',
                                                type: self.container.method || 'GET',
                                                data: formData
                                            },
                                            name: textStatus,
                                            number: jqXHR.status,
                                            message: errorThrown
                                        });
                                    }
                                }));
                            } else {
                                self.call(self.params.onSubmit, event);
                                self.stopProcessingForm();
                            }
                        }
                    } else {
                        self.nativeSubmit();
                    }
                }
            }

            return self;
        },

        reset: function (event) {
            var self = this;

            if (event) {
                event.preventDefault();
            }

            self.$container.find(self.params.fields).each(function (i, element) {
                $(element).trigger('reset');
            });

            self.state = self.getInitialState();

            self.delay(function () {
                self.storeFields();
                self.validateForm();
            }, 0);

            if (event && typeof event === 'object' && event.type === 'reset') {
                self.call(self.params.onReset, event);
            }

            return self;
        },

        resetField: function (element) {
            var self = this;
            var $element = $(element);

            if ($element.is('select')) {
                $element.find('option').each(function (i, option) {
                    self.delay(function () {
                        option.selected = option.defaultSelected;
                    });
                });
            } else if ($element.is('[type="radio"]') || $element.is('[type="checkbox"]')) {
                element.checked = element.defaultChecked;
            } else {
                element.value = element.defaultValue;
            }

            self.state.fields[element.id] = {
                canValidate: false,
                changed: self.isChangedField(element),
                busy: self.isBusyField(element)
            };

            return self;
        },

        clearField: function (element) {
            var self = this;
            var $element = $(element);

            if ($element.is('select')) {
                $element.find('option').each(function (i, option) {
                    option.selected = i === 0;
                    option.defaultSelected = false;
                });
            } else if ($element.is('[type="radio"]') || $element.is('[type="checkbox"]')) {
                element.checked = false;
                element.defaultChecked = false;
            } else {
                element.value = '';
                element.defaultValue = '';
            }

            return self;
        },

        update: function () {
            var self = this;

            self.updateBusynessForm();
            self.validateForm();

            return self;
        },

        bindEvents: function () {
            var self = this;

            self.nativeSubmit = self.container.submit.bind(self.container);
            self.nativeReset = self.container.reset.bind(self.container);

            self.container.submit = self.submit.bind(self);
            self.container.reset = self.reset.bind(self);

            self.on('focusout', self.params.fields, function () {
                var element = this;
                var fieldId = element.id;

                self.throttle(['focusout', fieldId].join('-'), function () {
                    self.switchValidation(element);

                    if (self.params.validation) {
                        self.validateField(element);
                    }
                });
            });

            self.on('keypress', self.params.fields, function (event) {
                self.modifyField(event, this);
            });

            self.on('keyup', self.params.fields, function (event) {
                var element = this;
                var fieldId = element.id;

                self.throttle([event.type, fieldId].join('-'), function () {
                    self.maskField(event, element);
                }, self.params.changeDebounce);
            });

            self.on('change input keyup invalid update', self.params.fields, function (event) {
                var element = this;
                var fieldId = element.id;

                self.throttle([event.type, fieldId].join('-'), function () {
                    self.updateBusynessField(element);
                    self.checkFieldChanges(element);

                    if (self.params.validation) {
                        self.validateField(element);
                        self.checkSubmit();
                    }
                }, self.params.changeDebounce);

                self.throttle(['onChange', fieldId].join('-'), function () {
                    self.call(self.params.onChange, event, element);
                });

                if (self.params.onChangeSubmit) {
                    self.submit();
                }
            });

            self.on('submit', function (event) {
                if (self.state.processing) {
                    event.preventDefault();
                } else {
                    self.submit(event);
                }
            });

            self.on('reset', self.params.fields, function (event) {
                var element = event.target;
                event.stopPropagation();

                self.freeField(element, true);
                self.removeErrorsFor(element, true);
                self.resetField(element);
                self.validateField(element);

                self.checkSubmit();
            });

            self.on('clear', self.params.fields, function (event) {
                var element = event.target;
                event.stopPropagation();

                self.freeField(element, true);
                self.removeErrorsFor(element, true);
                self.clearField(element);
                self.validateField(element);
            });

            self.on('reset', function (event) {
                self.reset(event);
            });

            self.on('error', function (event) {
                self.call(self.params.onError, event.data.error);
            });

            self.$container.on('form:update', function () {
                self.throttle('form:update', function () {
                    self.update();
                });
            });

            return self;
        },

        getInitialState: function () {
            var self = this;

            var requestHeaders = Array.prototype.concat(self.params.requestHeaders || []);

            return {
                fields: {},
                errors: {},
                same: {},
                submitted: false,
                submitDisabled: false,
                validation: self.params.forceValidation,
                requestHeaders: requestHeaders
            };
        },

        init: function () {
            var self = this;

            self.storeFields();

            self.$submitButton.prop('disabled', Boolean(self.params.preventBadSubmit));
            self.$container.prop('novalidate', Boolean(self.params.validation));

            self.updateBusynessForm();
            self.validateForm();

            self.call(self.params.onInit);

            return self;
        }
    });

    $.fn.depotForm = function (settings) {
        return this.each(function (i, container) {
            $.data(container, 'depotForm', new DepotForm(container, settings));
        });
    };
}(jQuery));
