(function ($) {
    'use strict';

    var MIXIN_DEFAULTS = {
        dictionary: {
            thumbs: {
                backwards: {ru: 'Назад', en: 'Backwards'},
                forwards: {ru: 'Вперед', en: 'Forwards'}
            }
        },
        galleryThumbs: {
            template: '<div class="gallery__thumbs thumbs"><div class="thumbs__viewport ${thumbsViewportSelector|substr(1)}"><ul class="thumbs__list ${thumbsListSelector|substr(1)}">#{for item in items}${thumbTemplate}#{endfor}</ul></div>${buttonBackwardsTemplate}${buttonForwardsTemplate}${bulletsTemplate}</div>',
            thumbTemplate: '<li class="thumbs__item ${thumbsSelector|substr(1)}" data-index="${item.index}"><img class="thumbs__image js-thumbs-image" src="${item.thumb}" alt="${item.index}">${captionTemplate}</li>',
            captionTemplate: '#{if captionEnabled}<div class="thumbs__caption">${item.caption}</div>#{endif}',
            buttonBackwardsTemplate: '#{if buttonsEnabled}<button class="thumbs__button thumbs__button_backwards ${thumbsBackwardsSelector|substr(1)}" type="button" aria-label="_{thumbs.backwards}" title="_{thumbs.backwards}" disabled></button>#{endif}',
            buttonForwardsTemplate: '#{if buttonsEnabled}<button class="thumbs__button thumbs__button_forwards ${thumbsForwardsSelector|substr(1)}" type="button" aria-label="_{thumbs.forwards}" title="_{thumbs.forwards}" disabled></button>#{endif}',
            bulletsTemplate: '#{if bulletsEnabled}<div class="thumbs__bullets">#{for bullet in 1..${bulletsQuantity}}${bulletTemplate}#{endfor}</div>#{endif}',
            bulletTemplate: '<button class="thumbs__bullet ${thumbsBulletsSelector|substr(1)}" type="button" data-index="${bullet}"></button>',
            thumbsViewportSelector: '.js-thumbs-viewport',
            thumbsListSelector: '.js-thumbs-list',
            thumbsSelector: '.js-thumbs-item',
            thumbsBackwardsSelector: '.js-thumbs-backwards',
            thumbsForwardsSelector: '.js-thumbs-forwards',
            thumbsBulletsSelector: '.js-thumbs-bullet',
            buttonsEnabled: true,
            bulletsEnabled: true,
            captionEnabled: true,
            onPage: 2,
            mediaQueries: {},
            onInit: null
        }
    };

    $.galleryThumbsMixin = {
        thumbsRender: function () {
            var self = this;
            var hasPages = self.state.itemsQuantity > self.state.galleryThumbs.onPage;
            var thumbsContext = $.extend(true, {}, self.params.galleryThumbs, {
                items: self.state.items,
                captionTemplate: self.params.galleryThumbs.captionTemplate,
                captionEnabled: self.params.galleryThumbs.captionEnabled,
                buttonsEnabled: hasPages && self.params.galleryThumbs.buttonsEnabled,
                bulletsEnabled: hasPages && self.params.galleryThumbs.bulletsEnabled,
                bulletsQuantity: self.state.galleryThumbs.bulletsQuantity
            });

            var thumbsHTML = self.format(self.params.galleryThumbs.template, thumbsContext);

            self.$viewport.after(thumbsHTML);

            self.getElements(self.params.galleryThumbs);

            return self;
        },
        thumbsUpdate: function () {
            var self = this;

            self.$thumbs.filter('[aria-current="true"]').removeAria('current');
            self.$thumbs.filter('[data-index="' + self.state.currentRealIndex + '"]').aria('current', 'true');
            self.state.galleryThumbs.currentBulletIndex = Math.ceil(self.state.currentRealIndex / self.state.galleryThumbs.onPage);

            if (self.state.currentRealIndex - 1 > self.state.galleryThumbs.targetDOMIndex + self.state.galleryThumbs.onPage - 1 || self.state.currentRealIndex - 1 < self.state.galleryThumbs.targetDOMIndex) {
                self.thumbsGoToBullet(self.state.galleryThumbs.currentBulletIndex);
            }

            return self;
        },
        thumbsBulletsUpdate: function () {
            var self = this;

            self.$thumbsBullets.filter('[aria-current="true"]').removeAria('current');
            self.$thumbsBullets.filter('[data-index="' + self.state.galleryThumbs.currentBulletIndex + '"]').aria('current', 'true');

            return self;
        },
        thumbsButtonsUpdate: function () {
            var self = this;

            self.$thumbsBackwards.prop('disabled', self.state.galleryThumbs.currentBulletIndex === 1);
            self.$thumbsForwards.prop('disabled', self.state.galleryThumbs.currentBulletIndex === self.state.galleryThumbs.bulletsQuantity);

            return self;
        },
        thumbsOnTransitionEnd: function () {
            var self = this;
            self.cancelDelay(self.state.galleryThumbs.transitionDelay);

            self.$thumbsList.removeClass(self.params.transitionClassName);
            self.$thumbsList.removeClass(self.params.slowTransitionClassName);
            self.state.galleryThumbs.isTransition = false;
            self.state.galleryThumbs.preventClick = false;

            return self;
        },
        thumbsGoTo: function (DOMIndex, force) {
            // TODO: (thumbs) Поправить протаскивание когда меньше чем нужно
            var self = this;
            var targetDOMIndex = self.clamp(0, DOMIndex, self.state.itemsQuantity);

            if (targetDOMIndex < 0 || self.state.itemsQuantity <= self.state.galleryThumbs.onPage) {
                targetDOMIndex = 0;
            } else if (targetDOMIndex + self.state.galleryThumbs.onPage > self.state.itemsQuantity) {
                targetDOMIndex = self.state.itemsQuantity - self.state.galleryThumbs.onPage;
            }

            var $target = self.$thumbs.eq(targetDOMIndex);
            var realIndex = self.$thumbs.eq(targetDOMIndex).data('index');

            if (!self.state.galleryThumbs.current) {
                self.state.galleryThumbs.current = $target.get(0);
                self.state.galleryThumbs.$current = $target;
            }

            self.state.galleryThumbs.preventClick = !force;
            self.state.galleryThumbs.currentDOMIndex = targetDOMIndex;
            self.state.galleryThumbs.targetDOMIndex = targetDOMIndex;
            self.state.galleryThumbs.currentBulletIndex = Math.ceil((realIndex + 1) / self.state.galleryThumbs.onPage);

            self.moveListToPositionLeft(self.$thumbsList, self.getItemPosition($target), self.state.galleryThumbs, force);
            self.thumbsBulletsUpdate();
            self.thumbsButtonsUpdate();

            return self;
        },
        thumbsGoForwards: function () {
            var self = this;
            var DOMIndex = self.state.galleryThumbs.currentDOMIndex + self.state.galleryThumbs.onPage;

            return self.thumbsGoTo(DOMIndex);
        },
        thumbsGoBackwards: function () {
            var self = this;
            var DOMIndex = self.state.galleryThumbs.currentDOMIndex - self.state.galleryThumbs.onPage;

            return self.thumbsGoTo(DOMIndex);
        },
        thumbsGoToBullet: function (bulletIndex) {
            var self = this;
            var targetIndex = (bulletIndex - 1) * self.state.galleryThumbs.onPage;

            self.thumbsGoTo(targetIndex);

            return self;
        },
        thumbsBindEvents: function () {
            var self = this;

            self.on('transitionend', self.params.galleryThumbs.thumbsListSelector, function (event) {
                event.stopPropagation();

                if ($(event.target).is(self.params.galleryThumbs.thumbsListSelector)) {
                    self.call(self.thumbsOnTransitionEnd);
                }
            });

            self.on('click', self.params.galleryThumbs.thumbsBackwardsSelector, function (event) {
                event.preventDefault();
                self.throttle('thumbsBackwards', self.thumbsGoBackwards);
            });

            self.on('click', self.params.galleryThumbs.thumbsForwardsSelector, function (event) {
                event.preventDefault();
                self.throttle('thumbsForwards', self.thumbsGoForwards);
            });

            self.on('click', self.params.galleryThumbs.thumbsBulletsSelector, function (event) {
                event.preventDefault();
                var $bullet = $(this);
                var bulletIndex = $bullet.data('index');
                self.throttle('thumbsForwards', function () {
                    self.thumbsGoToBullet(bulletIndex);
                });
            });

            self.on('click', self.params.galleryThumbs.thumbsSelector, function (event) {
                event.preventDefault();
                if (!self.state.galleryThumbs.isTransition && !self.state.galleryThumbs.preventClick) {
                    var $target = $(this);
                    var realIndex = $target.data('index');
                    var DOMIndex = self.state.currentDOMIndex + realIndex - self.state.currentRealIndex;

                    self.throttle('goTo', function () {
                        self.state.galleryThumbs.current = $target.get(0);
                        self.state.galleryThumbs.$current = $target;

                        self.goTo(DOMIndex);
                    });
                }
            });

            self.bind('resize', self.$WINDOW, function () {
                self.throttle('resizeThumbs', function () {
                    self.thumbsGoTo(self.state.galleryThumbs.targetDOMIndex, true);
                }, 15);
            });

            if (self.params.swipe) {
                if (self.hasPlugin('depotSwipe')) {
                    self.$thumbsViewport.depotSwipe({
                        targetSelector: self.params.galleryThumbs.thumbsListSelector,
                        touchThreshold: self.params.swipeThreshold,
                        mouse: true,
                        onStart: function (event) {
                            event.preventDefault();
                            self.state.galleryThumbs.preventClick = true;
                        },
                        onMove: function (event, swipe) {
                            event.preventDefault();

                            var $current = self.$thumbs.eq(self.state.galleryThumbs.targetDOMIndex);
                            var currentPosition = self.getItemPosition($current);
                            var delta = swipe.current.left - swipe.start.left;

                            if (delta !== 0) {
                                self.moveListToPositionLeft(self.$thumbsList, currentPosition + delta, self.state.galleryThumbs, true);
                            }
                        },
                        onEnd: function (event, swipe) {
                            event.preventDefault();
                            event.stopPropagation();

                            if (swipe.delta > 0) {
                                self.thumbsGoBackwards();
                            } else {
                                self.thumbsGoForwards();
                            }
                        },
                        onCancel: function (event, swipe) {
                            if (swipe.delta !== 0) {
                                self.state.galleryThumbs.preventClick = true;
                                var $target = self.$thumbs.eq(self.state.galleryThumbs.targetDOMIndex);
                                self.moveListToPositionLeft(self.$thumbsList, self.getItemPosition($target), self.state.galleryThumbs);
                            } else {
                                self.state.galleryThumbs.preventClick = false;
                            }
                        }
                    });
                }
            }

            return self;
        },
        initGalleryThumbs: function () {
            var self = this;

            self.getInitialState = self.proxyCallback(self.getInitialState, function () {
                // TODO: (thumbs) Использовать mediaQueries для обновления параметров: onPage, bulletsQuantity
                var onPage = self.params.galleryThumbs.onPage;
                var clientWidth = document.documentElement.clientWidth;
                if (clientWidth >= 740) {
                    onPage = 3;
                }
                if (clientWidth >= 1420) {
                    onPage = 6;
                }
                var bulletsQuantity = Math.ceil(self.state.itemsQuantity / onPage);

                return $.extend(true, {}, this, {
                    galleryThumbs: {
                        $current: null,
                        current: null,
                        targetDOMIndex: 0,
                        currentDOMIndex: 0,
                        currentBulletIndex: 0,
                        direction: 0,
                        isTransition: false,
                        preventClick: false,
                        onPage: onPage,
                        bulletsQuantity: bulletsQuantity,
                        transitionDelay: null
                    }
                });
            });

            self.params = $.extend(true, {}, self.translate(MIXIN_DEFAULTS), self.params);

            self.state = self.getInitialState();

            self.params.onChange = self.proxyCallback(self.params.onChange, function (DOMIndex, force) {
                if (!force) {
                    self.thumbsUpdate();
                }
            });

            self.thumbsRender();
            self.thumbsGoTo(self.params.startFrom, true);
            self.thumbsUpdate();
            self.thumbsBindEvents();

            self.call(self.params.galleryThumbs.onInit);
        }
    };
}(jQuery));
