(function ($) {
    'use strict';
    $(function () {
        var VENDOR_PATH = '<%= pkg.gruntParams.absPath %>vendor';

//===========================
// Фиксация высоты окна
//===========================
        $.depotProto.$WINDOW.on('resize init:vh', function () {
            document.documentElement.style.setProperty('--vh', (window.innerHeight * .01) + 'px');
            document.documentElement.style.setProperty('--vw', (window.innerWidth * .01) + 'px');

            $('.js-layout').css({
                minHeight: window.innerHeight - $('.js-header').outerHeight()
            });
        }).trigger('init:vh');

//===========================
// Сбор телеметрии
//===========================
        $.depotHash.whenMatched(/^dd:debug$/, function () {
            $.depotProto.error({
                type: 'NotAnError',
                action: 'DEBUG',
                message: 'Отчёт о системе отправлен'
            }, true);
            $.depotNotifications.log({
                ru: 'Отчёт о системе отправлен разработчикам.',
                en: 'System report sent to developers.'
            });
        }, true);

//===========================
// Регистрация serviceWorker
//===========================
        $.depotProto.delay(function () {
            if ('serviceWorker' in navigator && navigator.serviceWorker !== null) {
                var webp = Modernizr && !!Modernizr.webp;
                var retina = window.devicePixelRatio && window.devicePixelRatio > 1;
                navigator.serviceWorker.register('/service-worker.min.js?retina=' + retina + '&webp=' + webp);
            }

            $.depotProto.$WINDOW.on('online', function () {
                if (document.visibilityState && document.visibilityState === 'visible') {
                    $.depotNotifications.info({
                        ru: 'Подключение к сети восстановлено.',
                        en: 'Network connection has been restored.'
                    });

                    if ($('.js-offline').length && !location.pathname.match(/\/offline\//)) {
                        window.location.reload();
                    }
                }
            });

            $.depotProto.$WINDOW.on('offline', function () {
                if (document.visibilityState && document.visibilityState === 'visible') {
                    $.depotNotifications.warn({
                        ru: 'Проверьте подключение к сети.',
                        en: 'Check your network connection.'
                    });
                }
            });
        });

//===========================
// Object-fit polyfill
//===========================
        if (window.Modernizr && !Modernizr.objectfit) {
            $.depotProto.addScripts({
                src: VENDOR_PATH + '/objectFitImages.min.js',
                exports: 'objectFitImages',
            }, function (error) {
                if (!error) {
                    window.objectFitImages(null, {watchMQ: true});
                }
            });
        }

//===========================
// Ленивые картинки
//===========================
        $('[loading="lazy"]').depotLazy();
        $.depotProto.$DOCUMENT.on('lazy:added', function (event, settings) {
            var $target = $(event.target);
            var $lazy;

            if ($target.is('[loading="lazy"]')) {
                $lazy = $target;
            } else {
                $lazy = $target.find('[loading="lazy"]');
            }

            if ($lazy && $lazy.length) {
                $lazy.depotLazy(settings);
            }
        });

//===========================
// Клик по карточке
//===========================
        $.depotProto.$BODY.on('click', '[data-clickable]', function (event) {
            var $target = $(event.target);
            var link = $(this).find('a').get(0);
            if (!$target.closest('a, button').length || $target.is(link)) {
                if (link) {
                    var cleanLocationHref = location.href.replace(location.hash, '');
                    var cleanLinkHref = link.href.replace(link.hash, '');
                    var linkHash = $.depotHash.get(link);
                    var isBlank = event.ctrlKey || event.metaKey;

                    if (linkHash !== undefined && cleanLinkHref === cleanLocationHref && !isBlank) {
                        event.preventDefault();
                        $.depotHash.add(linkHash);
                    } else if (!$target.is(link)) {
                        var originalTarget = link.target;

                        if (isBlank) {
                            link.target = '_blank';
                        }

                        link.click();
                        link.target = originalTarget;
                    }
                }
            }
        });

//===========================
// Форма подписки
//===========================
        $('.js-form-footer').depotForm({
            ajax: true,
            mixins: [
                $.formResponseMixin,
                $.formCSRFMixin
            ],
            formResponse: {
                onSuccess: function (response) {
                    $.depotNotifications.info({
                        ru: 'Ваша подписка оформлена.',
                        en: 'Your subscription has been completed.'
                    });
                },
                onError: function (response) {
                    $.depotNotifications.warn({
                        ru: 'Возникла ошибка, попробуйте в другой раз',
                        en: 'An error occurred, please try another time'
                    });
                }
            },
            beforeInit: function () {
                var self = this;

                self.initFormResponse();
                self.initFormCSRF();

                return self;
            }
        });

//===========================
// Форма подписки
//===========================
        $('.js-popup-menu').depotPopup();

//===========================
// Форма поиска
//===========================
        $('.js-popup-search').depotPopup();

//===========================
// Лифт на главной
//===========================
        $('.js-elevator').elevator({
            animationEnabled: false,
            mediaQueries: {
                '(min-width: 740px)': {
                    animationEnabled: true
                }
            }
        });

//===========================
// Липкая кнопка на главной
//===========================
        $('.js-elevator-toggle').depotSticky({
            position: 'bottom'
        });

//===========================
// Карусель вертикальная
//===========================
        $('.js-carousel-vertical').scrollCarousel({
            direction: 'VERTICAL',
            buttons: {enabled: true}
        });

//===========================
// Карусель горизонтальная
//===========================
        $('.js-carousel-horizontal').scrollCarousel({
            direction: 'HORIZONTAL',
            buttons: {enabled: true}
        });

//===========================
// Карусель просмотрового зала
//===========================
        $('.js-carousel-viewing').scrollCarousel({
            direction: 'HORIZONTAL',
            buttons: {enabled: true},
            mediaQueries: {
                '(min-width: 740px)': {
                    direction: 'VERTICAL'
                }
            }
        });

//===========================
// Карусель горизонтальная с фильтрацией
//===========================
        $('.js-carousel-filtered').scrollCarousel({
            direction: 'HORIZONTAL',
            buttons: {enabled: true},
            mixins: [
                $.itemsFilterMixin
            ],
            itemsFilter: {
                formSelector: '.js-carousel-filter',
                tagsSelector: '.js-carousel-tag',
                itemsSelector: '.js-carousel-item',
                onFilter: function (filterData) {
                    var self = this;

                    self.$items.each(function (i, item) {
                        var $item = $(item);
                        var itemData = {};
                        var matched = false;

                        $.each($item.data(), function (key, values) {
                            itemData[key] = values.split(/[, ]+/);
                        });

                        $.each(filterData, function (key, values) {
                            if (Array.isArray(values)) {
                                matched = itemData[key] && !values || values.reduce(function (result, value) {
                                    return result ? result : itemData[key].indexOf(value) !== -1;
                                }, false);
                            } else {
                                matched = itemData[key] && !values || itemData[key].indexOf(values) !== -1;
                            }

                            return matched;
                        });

                        $item.prop('hidden', !matched);
                    });
                }
            },
            beforeInit: function () {
                var self = this;

                self.initItemsFilter();
            }
        });

//===========================
// Лента с подгрузкой
//===========================
        $('.js-feed-lazy').depotLoaderMore({
            targetSelector: '.js-feed-list',
            itemsSelector: '.js-feed-item',
            buttonSelector: '.js-feed-button',
            onSuccess: function (response) {
                var self = this;

                if (response) {
                    self.$target.append(response);
                    $('[loading="lazy"]', self.$target).trigger('lazy:added');
                }

                return self;
            }
        });

//===========================
// Зум медии
//===========================
        $('.js-figure').depotFigure();

//===========================
// Галерея стандартная
//===========================
        $('.js-gallery-default').depotGallery({
            mixins: [
                $.galleryNavigationMixin,
                $.galleryThumbsMixin
            ],
            galleryNavigation: {
                buttonsEnabled: true,
                bulletsEnabled: false
            },
            galleryThumbs: {
                buttonsEnabled: false,
                bulletsEnabled: false,
                captionEnabled: true,
                onPage: 3
            },
            beforeInit: function () {
                var self = this;

                self.initGalleryNavigation();
                self.initGalleryThumbs();
            }
        });

//===========================
// Модель
//===========================
        $('.js-model').model();

//===========================
// Диафильм
//===========================
        $('.js-diafilm').diafilm({
            mixins: [
                $.fullscreenMixin
            ],
            fullscreen: {
                requestFullscreenSelector: '.js-diafilm-full',
                exitFullscreenSelector: '.js-diafilm-exit'
            },
            beforeInit: function () {
                var self = this;

                self.initFullscreen();

                return self;
            }
        });

//===========================
// Вкладки стандартные
//===========================
        $('.js-tabs-default').depotTabs({
            useHash: true
        });

//===========================
// Файлы
//===========================
        $('.js-form-field-file').formFieldFile();

//===========================
// Селект
//===========================
        $('.js-form-field-select').formFieldSelect({
            dropDown: {
                mediaQuery: 'all'
            }
        });

//===========================
// Форма обратной связи
//===========================
        $('.js-form-feedback').depotForm({
            ajax: true,
            validators: {
                'is-file-quantity': {
                    test: function (element, value, trimmedValue) {
                        var classMatches = element.getAttribute('class').match(/is-file-quantity:([^ ]+)/);
                        var maxQuantity = classMatches && parseFloat(classMatches[1]) || 0;
                        var files = element.files;
                        var filesQuantity = files.length;

                        return filesQuantity <= maxQuantity;
                    },
                    messagePath: 'errors.file.quantity'
                },
                'is-file-size': {
                    test: function (element, value, trimmedValue) {
                        var classMatches = element.getAttribute('class').match(/is-file-size:([^ ]+)/);
                        var maxSize = classMatches && parseFloat(classMatches[1]) || 0;
                        var files = element.files;
                        var filesQuantity = files.length;
                        var fileIndex = 0;
                        var isValid = true;
                        for (fileIndex; fileIndex < filesQuantity; fileIndex += 1) {
                            if (files.item(fileIndex).size > maxSize) {
                                isValid = false;
                            }
                        }

                        return isValid;
                    },
                    messagePath: 'errors.file.size'
                }
            },
            dictionary: {
                errors: {
                    file: {
                        size: {
                            ru: 'Проверьте размер ${files.length|plural(файла, файлов)}',
                            en: 'Check the size of ${files.length|plural(file, files)}'
                        },
                        quantity: {
                            ru: 'Проверьте количество файлов',
                            en: 'Check the count of files'
                        }
                    }
                }
            },
            mixins: [
                $.formResponseMixin,
                $.formCSRFMixin
            ],
            formResponse: {
                onSuccess: function (response) {
                    $.depotNotifications.info({
                        ru: 'Ваше письмо отправлено.',
                        en: 'Your letter has been sent.'
                    });
                },
                onError: function (response) {
                    $.depotNotifications.warn({
                        ru: 'Возникла ошибка, попробуйте в другой раз',
                        en: 'An error occurred, please try another time'
                    });
                }
            },
            beforeInit: function () {
                var self = this;

                self.initFormResponse();
                self.initFormCSRF();

                return self;
            }
        });

//===========================
// Карусель горизонтальная
//===========================
        $('.js-carousel-earth').scrollCarousel({
            direction: 'HORIZONTAL',
            buttons: {enabled: true}
        });

//===========================
// 3дэ земля
//===========================
        $('.js-earth').earth();

//===========================
// Шаринг
//===========================
        $('.js-sharing').depotSharing();

    }); // dom ready
}(jQuery));
