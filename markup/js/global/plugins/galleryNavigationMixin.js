(function ($) {
    'use strict';

    var MIXIN_DEFAULTS = {
        dictionary: {
            buttons: {
                backwards: {
                    ru: 'Назад',
                    en: 'Backwards'
                },
                forwards: {
                    ru: 'Вперед',
                    en: 'Forwards'
                }
            }
        },
        galleryNavigation: {
            template: '${buttonsTemplate}${bulletsTemplate}',
            buttonsTemplate: '#{if buttonsEnabled}<div class="gallery__buttons">${buttonBackwardsTemplate}${buttonForwardsTemplate}</div>#{endif}',
            buttonBackwardsTemplate: '<button class="gallery__button gallery__button_backwards ${backwardsSelector|substr(1)}" type="button" aria-label="_{buttons.backwards}" title="_{buttons.backwards}"${backwardsDisabled}></button>',
            buttonForwardsTemplate: '<button class="gallery__button gallery__button_forwards ${forwardsSelector|substr(1)}" type="button" aria-label="_{buttons.forwards}" title="_{buttons.forwards}"${forwardsDisabled}></button>',
            bulletsTemplate: '#{if bulletsEnabled}<div class="gallery__bullets">#{for bullet in 1..${bulletsQuantity}}${bulletTemplate}#{endfor}</div>#{endif}',
            bulletTemplate: '<button class="gallery__bullet ${bulletsSelector|substr(1)}" type="button" data-index="${bullet}"></button>',
            backwardsSelector: '.js-gallery-backwards',
            forwardsSelector: '.js-gallery-forwards',
            bulletsSelector: '.js-gallery-bullet',
            buttonsEnabled: true,
            bulletsEnabled: true,
            onInit: null
        }
    };

    $.galleryNavigationMixin = {
        navigationRender: function () {
            var self = this;
            var hasPages = self.state.itemsQuantity > 1;
            var navigationContext = $.extend(true, {}, self.params.galleryNavigation, {
                buttonsEnabled: hasPages && self.params.galleryNavigation.buttonsEnabled,
                bulletsEnabled: hasPages && self.params.galleryNavigation.bulletsEnabled,
                backwardsDisabled: self.state.galleryNavigation.backwardsDisabled ? ' disabled' : '',
                forwardsDisabled: self.state.galleryNavigation.forwardsDisabled ? ' disabled' : '',
                bulletsQuantity: self.state.itemsQuantity
            });

            var navigationHTML = self.format(self.params.galleryNavigation.template, navigationContext);

            self.$viewport.after(navigationHTML);

            self.getElements(self.params.galleryNavigation);

            return self;
        },

        navigationUpdate: function () {
            var self = this;

            self.state.galleryNavigation.backwardsDisabled = !self.params.loop && self.state.currentRealIndex === 1;
            self.state.galleryNavigation.forwardsDisabled = !self.params.loop && self.state.currentRealIndex === self.state.itemsQuantity;

            self.navigationBulletsUpdate();
            self.navigationButtonsUpdate();

            return self;
        },

        navigationBulletsUpdate: function () {
            var self = this;

            self.$bullets.filter('[aria-current="true"]').removeAria('current');
            self.$bullets.filter('[data-index="' + self.state.currentRealIndex + '"]').aria('current', 'true');

            return self;
        },

        navigationButtonsUpdate: function () {
            var self = this;

            self.$backwards.prop('disabled', self.state.galleryNavigation.backwardsDisabled);
            self.$forwards.prop('disabled', self.state.galleryNavigation.forwardsDisabled);

            return self;
        },

        navigationBindEvents: function () {
            var self = this;

            self.on('click', self.params.galleryNavigation.backwardsSelector, function (event) {
                event.preventDefault();
                self.throttle('backwards', self.goBackwards);
            });

            self.on('click', self.params.galleryNavigation.forwardsSelector, function (event) {
                event.preventDefault();
                self.throttle('forwards', self.goForwards);
            });

            self.on('click', self.params.galleryNavigation.bulletsSelector, function (event) {
                event.preventDefault();
                var $bullet = $(this);
                var realIndex = $bullet.data('index');
                var nextDOMIndex = self.getClosestDOMIndex(realIndex);

                self.throttle('goTo', function () {
                    self.goTo(nextDOMIndex);
                });
            });

            return self;
        },
        initGalleryNavigation: function () {
            var self = this;

            self.getInitialState = self.proxyCallback(self.getInitialState, function () {

                return $.extend(true, {}, this, {
                    galleryNavigation: {
                        backwardsDisabled: true,
                        forwardsDisabled: true
                    }
                });
            });

            self.params = $.extend(true, {}, self.translate(MIXIN_DEFAULTS), self.params);

            self.state = self.getInitialState();

            self.params.onChange = self.proxyCallback(self.params.onChange, function (DOMIndex, force) {
                if (!force) {
                    self.navigationUpdate();
                }
            });

            self.navigationRender();
            self.navigationUpdate();
            self.navigationBindEvents();

            self.call(self.params.galleryNavigation.onInit);
        }
    };
}(jQuery));
