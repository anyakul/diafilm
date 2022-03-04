(function ($) {
    'use strict';

    function DepotFigure(container, settings) {
        var self = this;

        return self.call(self._init, container, settings);
    }

    DepotFigure.prototype = $.extend(true, {}, $.depotProto, {
        pluginName: 'depotFigure',

        defaults: {
            sourceSelector: '.js-figure-source',
            captionSelector: '.js-figure-caption',
            zoomSelector: '.js-figure-zoom',
            playSelector: '.js-figure-play',
            excludeSelector: '.is-cloned',
            dataCollectionParam: 'collection',
            dataTypeParam: 'type'
        },

        getItemId: function ($element) {
            return $element.data('id');
        },

        getItemType: function ($element) {
            return $element.data('type') || $element.attr('itemprop');
        },

        getItemSrc: function ($element) {
            return $element.data('original') || $element.attr('src');
        },

        getItemUrl: function ($element) {
            return $element.data('url') || '';
        },

        getItemThumb: function ($element) {
            return $element.data('thumb') || $element.data('poster') || $element.attr('src');
        },

        getItemCaption: function ($element) {
            return $element && $element.length ? $element.text().trim() : undefined;
        },

        getCollectionId: function ($element) {
            var self = this;
            return $element.data(self.params.dataCollectionParam);
        },

        getItemData: function ($item) {
            var self = this;

            if ($item === undefined) {
                $item = self.$container;
            }
            var $source = $item.find(self.params.sourceSelector);

            var id = self.getItemId($item);
            var collectionId = self.getCollectionId($item);
            var type = self.getItemType($item);
            var src = self.getItemSrc($source);
            var thumb = self.getItemThumb($source);
            var url = self.getItemUrl($source);
            var caption = self.getItemCaption($item.find(self.params.captionSelector));

            return {
                id: id,
                type: type,
                src: src,
                thumb: thumb,
                url: url,
                caption: caption,
                collection: collectionId
            };
        },

        getCollectionData: function () {
            var self = this;
            var data = {
                item: self.getItemData(),
                collection: {
                    items: []
                }
            };

            var collectionSlug = self.$container.data(self.params.dataCollectionParam);

            if (typeof collectionSlug === 'string' && collectionSlug.length) {
                var $collection = $(self.format('[data-${param}="${value}"]', {
                    param: self.params.dataCollectionParam,
                    value: collectionSlug
                }));

                if ($collection.length) {
                    $collection.filter(function (i, item) {
                        return $(item).closest(self.params.excludeSelector).length === 0;
                    }).each(function (i, item) {
                        data.collection.items.push(self.getItemData($(item)));
                    });
                }
            } else {
                data.collection.items.push(self.state.item);
            }

            return data;
        },

        stop: function () {
            var self = this;
            if (self.state.item.type === 'video') {
                var video = self.$source.get(0);
                if (typeof video.pause === 'function') {
                    video.pause();
                }
            } else if (self.state.item.type === 'youtube') {
                if (self.$iframe && self.$iframe.length) {
                    self.$iframe.remove();
                }
            }

            self.$play.prop('disabled', false);

            return self;
        },

        play: function () {
            var self = this;
            self.$play.prop('disabled', true);

            if (self.state.item.type === 'video') {
                var video = self.$source.get(0);
                video.play();
            } else if (self.state.item.type === 'iframe') {
                self.$iframe = $(self.format('<iframe class="figure__iframe" src="${src}" allowfullscreen></iframe>', {
                    src: self.state.item.url
                }));
                self.$source.parent().append(self.$iframe);
            } else if (self.state.item.type === 'pdf') {
                self.addScripts({
                    src: 'https://cdnjs.cloudflare.com/ajax/libs/pdfobject/2.2.7/pdfobject.min.js',
                    exports: 'PDFObject'
                }, function (error) {
                    if (!error) {
                        var iframeId = self.format('iframe-${id|hash}', {
                            id: self.state.item.url
                        });
                        self.$iframe = $(self.format('<div class="figure__iframe" id="${id}"></div>', {
                            id: iframeId
                        }));
                        self.$source.parent().append(self.$iframe);
                        window.PDFObject.embed(self.state.item.url, '#' + iframeId, {
                            pdfOpenParams: {
                                view: 'FitV',
                                pagemode: 'thumbs',
                            }
                        });
                    }
                });
            } else if (self.state.item.type === 'youtube') {
                self.addScripts({
                    src: 'https://www.youtube.com/iframe_api',
                    exports: 'YT'
                }, function (error) {
                    if (!error) {
                        var iframeId = self.format('iframe-${id|hash}', {
                            id: self.state.item.url
                        });
                        self.$iframe = $(self.format('<div class="figure__iframe" id="${id}"></div>', {
                            id: iframeId
                        }));
                        self.$source.parent().append(self.$iframe);
                        window.YT.ready(function () {
                            var player = new window.YT.Player(iframeId, {
                                width: self.$iframe.width(),
                                height: self.$iframe.height(),
                                videoId: self.state.item.url,
                                playerVars: {
                                    controls: 1,
                                    enablejsapi: 1,
                                    fs: 0,
                                    hl: self.LANGUAGE,
                                    origin: window.location.origin,
                                    color: 'white',
                                    rel: 0,
                                    showinfo: 0,
                                    autoplay: 1
                                }
                            });
                            self.$iframe = $(player.f);
                        });
                    }
                });
            }

            return self;
        },

        zoom: function () {
            var self = this;

            self.$WINDOW.trigger('screen:show', self.getCollectionData());

            return self;
        },

        bindEvents: function () {
            var self = this;

            self.on('click', self.params.zoomSelector, function (event) {
                event.preventDefault();

                self.stop();
                self.zoom();
            });

            self.on('click', self.params.playSelector, function (event) {
                event.preventDefault();

                self.play();
            });

            self.on('figure:stop', self.stop.bind(self));

            self.on('figure:getCollection', function (event, data) {
                self.call(data.callback, self.getCollectionData());
            });

            return self;
        },

        getInitialState: function () {
            var self = this;

            return {
                item: self.getItemData()
            };
        },

        init: function () {
            var self = this;

            if ($.depotHash.has(self.state.item.id)) {
                self.zoom();
            }

            self.call(self.params.onInit);

            return self;
        }
    });

    $.fn.depotFigure = function (settings) {
        return this.each(function (i, container) {
            $.data(this, 'depotFigure', new DepotFigure(container, settings));
        });
    };

    $.depotProto.$DOCUMENT.on('figure:added', function (event, settings) {
        var $target = $(event.target);
        var $figure;

        if ($target.is('.js-figure')) {
            $figure = $target;
        } else {
            $figure = $target.find('.js-figure');
        }

        if ($figure && $figure.length) {
            $figure.depotFigure(settings);
        }
    });
}(jQuery));
