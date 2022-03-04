(function ($) {
    'use strict';

    function Earth(container, settings) {
        var self = this;

        return self.call(self._init, container, settings);
    }

    Earth.prototype = $.extend(true, {}, $.depotProto, {
        pluginName: 'earth',

        defaults: {
            playerSelector: '.js-earth-player',
            hintSelector: '.js-earth-hint',
            readyClassName: 'is-ready',
            carouselSelector: '.js-carousel-earth',
            carouselOverflowSelector: '.js-carousel-overflow',
            itemsTemplate: '#{for item in items}<li class="carousel__item carousel__item_default js-carousel-item">${itemTemplate}</li>#{endfor}',
            itemTemplate: '<article class="card card_earth" data-clickable><div class="card__picture"><img class="card__image" src="${item.image.x1}" srcset="${item.image.x2} 2x" width="${item.image.width}" height="${item.image.height}" intrinsicsize="${item.image.width}x${item.image.height}" loading="lazy" alt=""></div><div class="card__body"><div class="card__label" role="heading" aria-level="4"><a class="card__link" href="${item.url}">${item.label}</a></div><div class="card__params params params_card"><div class="params__year">${item.year}</div><div class="params__age">${item.age}</div>#{for param in item.params}<div class="params__item">#{if param.label}${param.label}#{endif} #{if param.value}<strong>${param.value}</strong>#{endif}</div>#{endfor}</div></div></article>',
            errorClassName: 'is-error',
            pointerClassName: 'is-pointer',
            popupClassName: 'has-popup',
            normalMaterial: {
                color: 0x39B54A,
                transparent: true,
                opacity: .8
            },
            activeMaterial: {
                color: 0x27A035,
                transparent: true,
                opacity: 1
            },
        },

        getInitialState: function () {
            var self = this;
            return self.cleanObject({
                fontLoaded: false,
                textureLoaded: false,
                inited: false,
                ready: false,
                rotate: true,
                pointPk: '',
                childPk: '',
                hintTransform: null,
                pointer: {
                    active: false,
                    down: null,
                    x: 0,
                    y: 0
                }
            });
        },

        convertCoordinatesToPosition: function (coordinatesString, radius) {
            var coordinates = coordinatesString.split(/[, ]+/).map(function (x) {
                return parseFloat(x);
            });

            var lat = coordinates[0];
            var lng = coordinates[1];

            var phi = (90 - lat) * (Math.PI / 180);
            var theta = (lng + 180) * (Math.PI / 180);

            return {
                x: -((radius) * Math.sin(phi) * Math.cos(theta)),
                z: ((radius) * Math.sin(phi) * Math.sin(theta)),
                y: ((radius) * Math.cos(phi))
            };
        },

        loadJSON: function (url, data, callback) {
            var self = this;
            if (self.state.request) {
                self.state.request.abort();
            }

            if (self.getType(data) === 'function' && self.getType(callback) === 'undefined') {
                callback = data;
                data = null;
            }

            self.state.request = $.ajax({
                url: url,
                type: 'GET',
                dataType: 'json',
                data: data,
                success: function (response) {
                    if (response && response.success) {
                        self.call(callback, response.items);
                    } else {
                        self.$container.removeClass(self.params.processingClassName);
                        self.$container.addClass(self.params.errorClassName);
                        self.error({
                            action: 'Earth.loadJSON',
                            data: {
                                url: url,
                                response: response
                            },
                            name: 'Unexpected Response',
                            message: 'Неожиданный ответ сервера'
                        });
                    }
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    self.$container.removeClass(self.params.processingClassName);
                    self.$container.addClass(self.params.errorClassName);
                    self.error({
                        action: 'Earth.loadJSON',
                        data: {
                            url: url
                        },
                        name: textStatus,
                        number: jqXHR.status,
                        message: errorThrown
                    });
                }
            });
        },

        getTextureURL: function () {
            var self = this;

            var imagePNGSrc = '/static/core/img/foyer/earth/map.png';
            var imageWEBPSrc = '/static/core/img/foyer/earth/map.webp';

            return Modernizr && !!Modernizr.webp ? imageWEBPSrc : imagePNGSrc;
        },

        animateMaterial: function (material, params) {
            var self = this;
            var THREE = window.THREE;
            var sourceOpacity = material.opacity;
            var sourceColor = new THREE.Color(material.color.getHex());
            var delta = {
                opacity: params.opacity ? params.opacity - sourceOpacity : 0,
                color: params.color ? (function () {
                    var newColor = new THREE.Color().setHex(params.color);
                    return {
                        r: newColor.r - sourceColor.r,
                        g: newColor.g - sourceColor.g,
                        b: newColor.b - sourceColor.b
                    };
                }()) : null
            };

            self.animate(250, function (timeDelta, progress) {
                if (delta.color) {
                    var r = sourceColor.r + delta.color.r * progress;
                    var g = sourceColor.g + delta.color.g * progress;
                    var b = sourceColor.b + delta.color.b * progress;
                    material.color.setRGB(r, g, b);
                }
                if (delta.opacity) {
                    material.opacity = sourceOpacity + delta.opacity * progress;
                }
            });

            return self;
        },

        inViewport: function () {
            var self = this;

            var offset = self.$container.offset();

            var containerTop = offset.top;
            var containerLeft = offset.left;
            var containerRight = containerLeft + self.$container.outerWidth();
            var containerBottom = containerTop + self.$container.outerHeight();

            var windowTop = self.$WINDOW.scrollTop();
            var windowLeft = self.$WINDOW.scrollLeft();
            var windowRight = windowTop + self.$WINDOW.innerWidth();
            var windowBottom = windowTop + self.$WINDOW.innerHeight();

            var isEnterVertically = containerTop < windowTop && containerBottom >= windowTop && containerBottom <= windowBottom;
            var isCenterVertically = containerTop >= windowTop && containerBottom <= windowBottom;
            var isLeaveVertically = containerTop >= windowTop && containerTop <= windowBottom && containerBottom >= windowBottom;
            var isAroundVertically = containerTop <= windowTop && containerBottom >= windowBottom;

            var isEnterHorizontally = containerLeft < windowRight && containerRight >= windowLeft && containerRight <= windowRight;
            var isCenterHorizontally = containerLeft >= windowRight && containerRight <= windowRight;
            var isLeaveHorizontally = containerLeft >= windowRight && containerLeft <= windowRight && containerRight >= windowRight;
            var isAroundHorizontally = containerLeft <= windowRight && containerRight >= windowRight;

            var inViewportVertically = isEnterVertically || isCenterVertically || isLeaveVertically || isAroundVertically;
            var inViewportHorizontally = isEnterHorizontally || isCenterHorizontally || isLeaveHorizontally || isAroundHorizontally;

            var inViewport = inViewportVertically && inViewportHorizontally;
            var hasSize = self.$container.outerWidth() && self.$container.outerHeight();

            return inViewport && hasSize;
        },

        getIntersectsAt: function (offsetX, offsetY) {
            var self = this;
            var x = (offsetX / self.cache.player.clientWidth) * 2 - 1;
            var y = -(offsetY / self.cache.player.clientHeight) * 2 + 1;

            self.THREE.pointer.x = x;
            self.THREE.pointer.y = y;
            self.THREE.raycaster.setFromCamera(self.THREE.pointer, self.THREE.camera);

            return self.THREE.raycaster.intersectObjects(self.THREE.interactive.filter(function (fill) {
                return fill.parent.visible;
            }));
        },

        processPoints: function (points) {
            var self = this;

            points.map(function (point) {
                point.parentPk = '';

                if (point.children && point.children.length) {
                    point.children = point.children.map(function (child) {
                        child.parentPk = point.pk;

                        return child;
                    });
                }

                return point;
            });

            return points;
        },

        createPoint: function (options, renderOrder) {
            var self = this;
            var THREE = window.THREE;
            var point = new THREE.Group();
            var isDistrict = Boolean(options.children && options.children.length);

            point.name = options.label;
            point.userData = options;
            point.renderOrder = renderOrder;

            var pointPosition = self.convertCoordinatesToPosition(options.coordinates, self.cache.radius * 1.001);
            point.position.x = pointPosition.x;
            point.position.y = pointPosition.y;
            point.position.z = pointPosition.z;

            var pointFacePosition = self.convertCoordinatesToPosition(options.coordinates, self.cache.radius * 2);
            point.lookAt(pointFacePosition.x, pointFacePosition.y, pointFacePosition.z);

            var pointSize = isDistrict ? self.cache.radius * 0.04 : self.cache.radius * 0.025;
            var pointBGGeometry = new THREE.CircleGeometry(pointSize, 64);
            var pointBGMaterial = new THREE.MeshBasicMaterial(self.params.normalMaterial);
            pointBGMaterial.color.setHex(self.params.normalMaterial.color);
            var pointBG = new THREE.Mesh(pointBGGeometry, pointBGMaterial);
            pointBG.name = 'fill';
            point.add(pointBG);
            self.THREE.interactive.push(pointBG);

            if (options.quantity) {
                var textGeometry = new THREE.TextGeometry(options.quantity.toString(), {
                    font: self.cache.font,
                    size: pointSize * .75,
                    height: 1
                });
                var textMaterial = new THREE.MeshBasicMaterial({
                    color: 0xFFFFFF
                });
                textMaterial.color.convertSRGBToLinear();
                var text = new THREE.Mesh(textGeometry, textMaterial);
                text.name = 'text';

                textGeometry.computeBoundingBox();
                text.position.x = -0.5 * (textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x);
                text.position.y = -0.5 * (textGeometry.boundingBox.max.y - textGeometry.boundingBox.min.y);
                text.position.z = -0.5 * (textGeometry.boundingBox.max.z - textGeometry.boundingBox.min.z);

                point.add(text);
            }

            return point;
        },

        createPoints: function () {
            var self = this;
            var points = self.processPoints(self.cache.points);
            var renderOrder = 0;

            $.each(points, function (i, point) {
                renderOrder += 1;
                var country = self.createPoint(point, renderOrder);
                self.THREE.points.add(country);

                $.each(point.children, function (j, child) {
                    renderOrder += 1;
                    var district = self.createPoint(child, renderOrder);
                    district.visible = false;
                    self.THREE.points.add(district);
                });
            });

            self.THREE.world.add(self.THREE.points);

            return self;
        },

        collectAssets: function () {
            var self = this;

            self.state.inited = true;

            self.addScripts([{
                src: '/static/vendor/three/three.min.js',
                exports: 'THREE',
                plugins: [
                    {src: '/static/vendor/three/OrbitControls.min.js', exports: 'THREE.OrbitControls'}
                ]
            }], function (error) {
                var THREE = window.THREE;
                var fontSrc = '/static/core/fonts/Proxima-Nova_Regular.json';
                self.THREE = self.cleanObject();

                self.THREE.textureLoader = new THREE.TextureLoader();
                self.THREE.fontLoader = new THREE.FontLoader();

                self.THREE.textureLoader.load(self.getTextureURL(), function (texture) {
                    self.state.textureLoaded = true;
                    self.cache.texture = texture;
                    self.initPlayer();
                });

                self.THREE.fontLoader.load(fontSrc, function (font) {
                    self.state.fontLoaded = true;
                    self.cache.font = font;
                    self.initPlayer();
                });

                self.$container.addClass(self.params.processingClassName);
                self.loadJSON(self.$container.data('points'), function (points) {
                    self.state.pointsLoaded = true;
                    self.cache.points = points;
                    self.initPlayer();
                });
            });

            return self;
        },

        initPlayer: function () {
            var self = this;
            var THREE = window.THREE;

            if (self.state.textureLoaded && self.state.fontLoaded && self.state.pointsLoaded) {
                self.cache.radius = 1000;
                self.cache.player = self.$player.get(0);
                var color = new THREE.Color();
                self.params.normalMaterial.color = color.setHex(self.params.normalMaterial.color).convertSRGBToLinear().getHex();
                self.params.activeMaterial.color = color.setHex(self.params.activeMaterial.color).convertSRGBToLinear().getHex();

                self.THREE.interactive = [];
                self.THREE.raycaster = new THREE.Raycaster();
                self.THREE.pointer = new THREE.Vector2(0, 0);

                self.THREE.scene = new THREE.Scene();

                self.THREE.world = new THREE.Group();
                self.THREE.world.rotation.y = Math.PI / 4 * 3;

                self.THREE.points = new THREE.Group();
                self.THREE.points.name = 'Points';

                self.THREE.camera = new THREE.PerspectiveCamera(50, self.cache.player.clientWidth / self.cache.player.clientHeight, self.cache.radius / 10, self.cache.radius * 10);
                self.THREE.camera.position.z = self.cache.radius * 2.5;

                self.THREE.renderer = new THREE.WebGLRenderer({
                    alpha: true,
                    antialias: true,
                    powerPreference: 'high-performance'
                });
                self.THREE.renderer.outputEncoding = THREE.sRGBEncoding;
                self.THREE.renderer.shadowMap.enabled = false;
                self.THREE.renderer.shadowMap.autoUpdate = false;
                self.THREE.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
                self.THREE.renderer.setSize(self.cache.player.clientWidth, self.cache.player.clientHeight);

                self.THREE.controls = new THREE.OrbitControls(self.THREE.camera, self.cache.player);
                self.THREE.controls.enablePan = false;
                self.THREE.controls.enableZoom = false;
                self.THREE.controls.minPolarAngle = Math.PI / 6;
                self.THREE.controls.maxPolarAngle = Math.PI / 6 * 5;
                self.THREE.controls.rotateSpeed = .75;
                self.THREE.controls.enableDamping = true;
                self.THREE.controls.dampingFactor = .05;

                var earthGeometry = new THREE.SphereGeometry(self.cache.radius, 256, 128);
                self.cache.texture.encoding = THREE.sRGBEncoding;
                self.cache.texture.anisotropy = self.THREE.renderer.capabilities.getMaxAnisotropy();
                var earthMaterial = new THREE.MeshBasicMaterial({
                    map: self.cache.texture
                });

                self.THREE.earth = new THREE.Mesh(earthGeometry, earthMaterial);
                self.THREE.earth.name = 'Earth';

                self.THREE.world.add(self.THREE.earth);
                self.THREE.scene.add(self.THREE.world);
                self.THREE.scene.add(self.THREE.camera);

                self.createPoints();

                self.$player.append(self.THREE.renderer.domElement);

                self.THREE.renderer.setAnimationLoop(function () {
                    self.render();
                });

                self.$container.removeClass(self.params.processingClassName);
                self.$container.addClass(self.params.readyClassName);
                self.state.ready = true;
            }

            return self;
        },

        checkIntersects: function (intersects) {
            var self = this;

            if (intersects.length) {
                var point = intersects[0].object.parent;
                self.select(point.userData);
            } else {
                self.deselect();
            }

            return self;
        },

        select: function (pointData) {
            var self = this;

            self.state.rotate = false;
            self.state.pointPk = pointData.parentPk || pointData.pk;
            self.state.childPk = pointData.pk;

            self.update();

            return self;
        },

        deselect: function () {
            var self = this;

            self.state.rotate = true;
            self.state.pointPk = '';
            self.state.childPk = '';

            self.update();

            return self;
        },

        update: function () {
            var self = this;
            var hasCarousel = false;

            $.each(self.THREE.points.children, function (i, point) {
                var pointData = point.userData;
                var pointFill = point.children.filter(function (child) {
                    return child.name === 'fill';
                })[0];
                var pointIsGroup = Boolean(pointData.children && !!pointData.children.length);
                var pointIsSingle = !pointIsGroup && !pointData.parentPk;

                if (self.state.pointPk) {
                    if (pointData.pk === self.state.pointPk || pointData.parentPk === self.state.pointPk) {
                        point.visible = !pointIsGroup;

                        if (self.state.childPk) {
                            if (pointData.pk === self.state.childPk) {
                                // выбранная точка
                                hasCarousel = true;
                                self.animateMaterial(pointFill.material, self.params.activeMaterial);
                                self.$carousel.parent().addClass(self.params.processingClassName);
                                self.loadJSON(self.$container.data('cards'), {pk: pointData.pk}, function (items) {
                                    self.cache.items = items;
                                    self.renderCarousel();
                                });
                            } else if (pointFill.material.color.getHex() === self.params.activeMaterial.color) {
                                self.animateMaterial(pointFill.material, self.params.normalMaterial);
                            }
                        }
                    } else {
                        // если страна не совпала
                        // показываем группы и точки одиночки
                        point.visible = pointIsGroup || pointIsSingle;
                        if (pointFill.material.color.getHex() === self.params.activeMaterial.color) {
                            self.animateMaterial(pointFill.material, self.params.normalMaterial);
                        }
                    }
                } else {
                    // если нет выбранных точек
                    // показываем группы и точки одиночки
                    point.visible = pointIsGroup || pointIsSingle;
                    if (pointFill.material.color.getHex() === self.params.activeMaterial.color) {
                        self.animateMaterial(pointFill.material, self.params.normalMaterial);
                    }
                }
            });

            if (!hasCarousel) {
                self.cache.items = null;
                self.$container.removeClass(self.params.popupClassName);
                self.$carousel.removeClass(self.params.visibleClassName);
            }

            return self;
        },

        resize: function () {
            var self = this;

            if (self.state.ready) {
                self.THREE.camera.aspect = self.cache.player.clientWidth / self.cache.player.clientHeight;
                self.THREE.camera.updateProjectionMatrix();

                self.THREE.renderer.setSize(self.cache.player.clientWidth, self.cache.player.clientHeight);

                self.render();
            }

            return self;
        },

        render: function () {
            var self = this;

            if (self.state.ready) {
                if (self.state.rotate && !self.state.pointer.active) {
                    self.THREE.world.rotation.y += 0.001;
                }

                self.THREE.controls.update();
                self.THREE.renderer.render(self.THREE.scene, self.THREE.camera);

                if (self.state.pointer.active) {
                    self.throttle('hint', function () {
                        var intersects = self.getIntersectsAt(self.state.pointer.x, self.state.pointer.y);
                        if (intersects.length) {
                            var point = intersects[0].object.parent;
                            var isRightHalf = self.state.pointer.x > self.cache.player.clientWidth / 2;
                            var transform = {
                                x: self.state.pointer.x + (isRightHalf ? -16 : 16),// сдвигаю на ширину курсора
                                y: self.state.pointer.y,
                                invert: isRightHalf
                            };

                            if(!isSimilarObjects(self.state.hintTransform, transform)) {
                                var style = self.prefixed({
                                    transform: self.format('translate3d(${x}px, ${y}px, 0)#{if invert} translateX(-100%)#{endif}', transform)
                                });
                                self.$hint.css(style).text(point.userData.label);
                                self.$container.addClass(self.params.pointerClassName);
                                self.state.hintTransform = transform;
                            }
                        } else {
                            self.$container.removeClass(self.params.pointerClassName);
                        }
                    }, 100);
                }
            }

            return self;
        },

        renderCarousel: function () {
            var self = this;

            if (self.cache.items) {
                var itemsContext = self.cleanObject(self.params, {
                    items: self.cache.items
                });
                var itemsHtml = self.format(self.params.itemsTemplate, itemsContext);
                self.$carouselOverflow.html(itemsHtml);
                self.$carousel.trigger('update');
                self.$container.addClass(self.params.popupClassName);
                self.$carousel.addClass(self.params.visibleClassName);
            }

            self.$carousel.parent().removeClass(self.params.processingClassName);

            return self;
        },

        bindEvents: function () {
            var self = this;

            self.bind('load', self.$WINDOW, function (event) {
                self.throttle(event.type, function () {
                    self.delay(function () {
                        if (self.inViewport() && !self.state.inited) {
                            self.unbind('scroll load', self.$WINDOW);
                            self.collectAssets();
                        }
                    });
                });
            });

            self.bind('scroll', self.$WINDOW, function (event) {
                self.throttle(event.type, function () {
                    if (self.inViewport() && !self.state.inited) {
                        self.unbind('scroll load', self.$WINDOW);
                        self.collectAssets();
                    }
                });
            });

            self.bind('resize orientationchange', self.$WINDOW, self.resize.bind(self));

            self.on('mouseenter', self.params.playerSelector, function () {
                self.state.pointer.active = true;
            });

            self.on('mouseleave', self.params.playerSelector, function () {
                self.state.pointer.active = false;
            });

            self.on('pointerdown MSPointerDown', self.params.playerSelector, function (event) {
                self.state.pointer.down = {
                    x: event.offsetX,
                    y: event.offsetY
                };
            });

            self.on('mousemove', self.params.playerSelector, function (event) {
                self.state.pointer.active = true;
                self.state.pointer.x = event.offsetX;
                self.state.pointer.y = event.offsetY;
            });

            self.on('pointerup MSPointerup', self.params.playerSelector, function (event) {
                if (self.state.ready && self.state.pointer.down) {
                    var treshold = 30;
                    var deltaX = Math.abs(self.state.pointer.down.x - event.offsetX);
                    var deltaY = Math.abs(self.state.pointer.down.y - event.offsetY);
                    self.state.pointer.down = null;

                    if (deltaX <= treshold && deltaY <= deltaY) {
                        self.checkIntersects(self.getIntersectsAt(event.offsetX, event.offsetY));
                    }
                }
            });

            return self;
        },

        init: function () {
            var self = this;

            self.$container.addClass(self.params.processingClassName);

            if (self.inViewport()) {
                self.collectAssets();
            }
        }
    });

    function isSimilarObjects(obj1, obj2){
        return JSON.stringify(obj1) === JSON.stringify(obj2);
    }

    $.fn.earth = function (settings) {
        return this.each(function (i, container) {
            $.data(this, 'earth', new Earth(container, settings));
        });
    };
}(jQuery));
