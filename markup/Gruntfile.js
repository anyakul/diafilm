module.exports = function (grunt) {
    'use strict';

    var pkg = require('./package.json');
    var path = require('path');

    var gruntParams = pkg.gruntParams;

    var sourcePath = gruntParams.sourcePath;
    var corePath = path.join(gruntParams.distRoot, gruntParams.corePath);

    var twigHelpers = require('@toptalo/twig-helpers');
    var server = require('./node_scripts/server');

    require('time-grunt')(grunt);

    // Project configuration.
    grunt.initConfig({

        // Task configuration.
        notify_hooks: {
            options: {
                enabled: true,
                success: true,
                duration: 10
            }
        },
        htmllint: {
            options: {
                force: true,
                ignore: [
                    'Article lacks heading. Consider using “h2”-“h6” elements to add identifying headings to all articles.',
                    'Section lacks heading. Consider using “h2”-“h6” elements to add identifying headings to all sections.',
                    'The “inputmode” attribute is not supported in all browsers. Please be sure to test, and consider using a polyfill.',
                    'Attribute “intrinsicsize” not allowed on element “video” at this point.',
                    'Attribute “intrinsicsize” not allowed on element “img” at this point.',
                ]
            },
            html: [
                sourcePath + '*.html',
                '!' + sourcePath + '*letter*.html'
            ]
        },
        eslint: {
            files: [
                sourcePath + 'js/**/*.js'
            ]
        },
        stylelint: {
            files: [
                corePath + 'css/**/*.css',
                '!' + corePath + 'css/**/*.min.css',
                '!' + corePath + 'css/**/*melfi*.css'
            ]
        },
        shell: {
            yaspeller: {
                options: {stderr: false},
                command: 'yaspeller-ci .'
            }
        },
        twig2html: {
            options: {
                namespaces: {
                    'blocks': 'templates/blocks/',
                    'layouts': 'templates/layouts/'
                },
                context: gruntParams,
                globals: sourcePath + 'templates/context.json',
                extensions: twigHelpers.extensions(gruntParams),
                filters: twigHelpers.filters(gruntParams),
                functions: twigHelpers.functions(gruntParams)
            },
            pages: {
                files: [
                    {
                        expand: true,
                        cwd: sourcePath + 'templates/pages/',
                        src: ['**/*.twig'],
                        dest: sourcePath,
                        ext: '.html'
                    }
                ]
            },
            ajax: {
                files: [
                    {
                        expand: true,
                        cwd: sourcePath + 'templates/ajax/',
                        src: ['**/*.twig'],
                        dest: sourcePath + '/ajax/',
                        ext: function (ext) {
                            return ext.replace(/\.twig$/, '');
                        }
                    }
                ]
            }
        },
        prettify: {
            options: {
                'indent': 4,
                'indent_char': ' ',
                'indent_scripts': 'normal',
                'indent_inner_html': false,
                'wrap_line_length': 0,
                'brace_style': 'collapse',
                'preserve_newlines': true,
                'max_preserve_newlines': 1,
                'unformatted': [
                    'code',
                    'pre'
                ]
            },
            pages: {
                expand: true,
                cwd: sourcePath,
                ext: '.html',
                src: ['*.html'],
                dest: sourcePath
            },
            ajax: {
                expand: true,
                cwd: sourcePath + '/ajax/',
                ext: '.html',
                src: ['*.html'],
                dest: sourcePath + '/ajax/'
            }
        },
        concat: {
            options: {
                process: {
                    data: {
                        pkg: pkg,
                        build: {
                            toString: function () {
                                return grunt.template.today('yyyy-mm-dd\'T\'HH:MM:ss');
                            }
                        }
                    }
                },
                sourceMap: true
            }
        },
        uglify: {
            options: {
                report: 'min'
            },
            develop: {
                files: [{
                    expand: true,
                    cwd: corePath + 'js/',
                    src: [
                        '**/*.js',
                        '!*.min.js',
                        '!*.md'
                    ],
                    dest: corePath + 'js/',
                    ext: '.min.js'
                }]
            },
            deploy: {
                options: {
                    compress: {
                        pure_funcs: [
                            'console.log',
                            'console.info',
                            'console.warn',
                            'console.error'
                        ],
                        passes: 2
                    }
                },
                files: '<%= uglify.develop.files %>'
            }
        },
        sass: {
            options: {
                implementation: require('sass'),
                outputStyle: 'expanded',
                sourceMap: true
            },
            target: {
                files: [
                    {
                        expand: true,
                        cwd: sourcePath + 'scss/',
                        src: ['*.scss'],
                        dest: corePath + 'css/',
                        ext: '.css'
                    }
                ]
            }
        },
        postcss: {
            options: {
                map: {
                    inline: false,
                    annotation: corePath + 'css/'
                },
                processors: [
                    require('autoprefixer')({
                        cascade: false,
                        supports: false
                    }),
                    require('@hail2u/css-mqpacker')({
                        sort: true
                    })
                ]
            },
            target: {
                expand: true,
                flatten: true,
                cwd: corePath + 'css/',
                src: [
                    '*.css',
                    '!*.min.css'
                ],
                dest: corePath + 'css/'
            }
        },
        csso: {
            target: {
                options: {
                    restructure: true
                },
                files: [
                    {
                        expand: true,
                        cwd: corePath + 'css/',
                        src: [
                            '*.css',
                            '!*.min.css'
                        ],
                        dest: corePath + 'css/',
                        ext: '.min.css'
                    }
                ]
            }
        },
        sprite: {
            options: {
                force: true
            },
            target: {
                src: sourcePath + 'sprite/*.png',
                dest: corePath + 'img/sprite.png',
                imgPath: '../img/sprite.png',
                destCss: sourcePath + 'scss/core/_sprite.scss',
                cssSpritesheetName: 'spritesheet',
                retinaSrcFilter: sourcePath + 'sprite/*@2x.png',
                retinaDest: corePath + 'img/sprite@2x.png',
                retinaImgPath: '../img/sprite@2x.png',
                cssRetinaSpritesheetName: 'spritesheet2x',
                algorithm: 'binary-tree',
                cssTemplate: './scss/core/png-sprite-template.hbs',
                padding: 2
            }
        },
        svg_sprite: {
            options: {
                shape: {
                    id: {
                        separator: '-'
                    },
                    spacing: {
                        padding: 2
                    }
                },
                mode: {
                    css: {
                        dest: corePath + 'css/',
                        sprite: '../img/sprite.svg',
                        bust: false,
                        render: {
                            scss: {
                                dest: '../../../../markup/scss/core/_svg-sprite.scss',
                                template: './scss/core/svg-sprite-template.hbs'
                            }
                        }
                    }
                }
            },
            target: {
                files: [{
                    expand: true,
                    cwd: sourcePath + 'sprite/',
                    src: ['**/*.svg'],
                    dest: sourcePath
                }]
            }
        },
        imagemin: {
            options: {
                optimizationLevel: 4, // png
                progressive: true, // jpg
                interlaced: false, // gif
                force: true
            },
            icons: {
                files: [
                    {
                        expand: true,
                        cwd: corePath + 'icons/',
                        src: ['**/*.{png,jpeg,jpg,gif}'],
                        dest: corePath + 'icons/'
                    }
                ]
            },
            img: {
                files: [
                    {
                        expand: true,
                        cwd: corePath + 'img/',
                        src: ['**/*.{png,jpeg,jpg,gif}'],
                        dest: corePath + 'img/'
                    }
                ]
            },
            sprite: {
                files: [
                    {
                        expand: true,
                        cwd: corePath + 'img/',
                        src: ['**/sprite*.{png,jpeg,jpg,gif}'],
                        dest: corePath + 'img/'
                    }
                ]
            },
            media: {
                files: [
                    {
                        expand: true,
                        cwd: corePath + 'markup-media/',
                        src: ['**/*.{png,jpeg,jpg,gif}'],
                        dest: corePath + 'markup-media/'
                    }
                ]
            }
        },
        cwebp: {
            options: {
                quality: 75,
                png: {
                    lossless: true
                }
            },
            sprite: {
                files: [
                    {
                        expand: true,
                        cwd: corePath + 'img/',
                        src: [
                            '**/*sprite*.png'
                        ],
                        dest: corePath + 'img/',
                        ext: '.webp'
                    }
                ]
            },
            img: {
                files: [
                    {
                        expand: true,
                        cwd: corePath + 'img/',
                        src: [
                            '**/*.{png,jpeg,jpg}'
                        ],
                        dest: corePath + 'img/',
                        ext: '.webp'
                    }
                ]
            },
            media: {
                files: [
                    {
                        expand: true,
                        cwd: corePath + 'markup-media/',
                        src: ['**/*.{png,jpeg,jpg}'],
                        dest: corePath + 'markup-media/',
                        ext: '.webp'
                    }
                ]
            }
        },
        svgmin: {
            options: {
                precision: 2,
                plugins: [
                    {sortAttrs: true},
                    {cleanupAttrs: false},
                    {
                        convertPathData: {
                            floatPrecision: 3
                        }
                    },
                    {removeViewBox: false},
                    {removeUselessStrokeAndFill: false}
                ]
            },
            icons: {
                files: [
                    {
                        expand: true,
                        cwd: corePath + 'icons/',
                        src: ['**/*.svg'],
                        dest: corePath + 'icons/'
                    }
                ]
            },
            img: {
                files: [
                    {
                        expand: true,
                        cwd: corePath + 'img/',
                        src: ['**/*.svg'],
                        dest: corePath + 'img/'
                    }
                ]
            },
            sprite: {
                files: [
                    {
                        expand: true,
                        cwd: sourcePath + 'sprite/',
                        src: ['**/*.svg'],
                        dest: sourcePath + 'sprite/'
                    }
                ]
            },
            media: {
                files: [
                    {
                        expand: true,
                        cwd: corePath + 'markup-media/',
                        src: ['**/*.svg'],
                        dest: corePath + 'markup-media/'
                    }
                ]
            }
        },
        clean: {
            options: {
                force: true
            },
            css: {
                src: [
                    corePath + 'css/*.{css,map}',
                    '!' + corePath + 'css/redactor.css',
                    '!' + corePath + 'css/melfi.css'
                ]
            },
            js: {
                src: [
                    corePath + 'js/*.{js,map}',
                    '!' + corePath + 'js/melfi.js'
                ]
            },
            sourcemaps: {
                src: [
                    corePath + '**/*.map'
                ]
            }
        },
        concurrent: {
            'sprite': ['png-sprite', 'svg-sprite'],
            'develop': ['styles', 'scripts-develop', 'html-pages', 'html-ajax'],
            'deploy': ['styles', 'scripts-deploy', 'html-pages', 'html-ajax']
        },
        watch: {
            options: {
                spawn: false,
                event: ['all'],
                livereload: {
                    port: gruntParams.liveReloadPort
                }
            },
            pngSprite: {
                files: ['sprite/**/*.png'],
                tasks: [
                    'png-sprite',
                    'styles'
                ]
            },
            svgSprite: {
                files: ['sprite/**/*.svg'],
                tasks: [
                    'svg-sprite',
                    'styles'
                ]
            },
            js: {
                files: ['js/**/*.js'],
                tasks: [
                    'scripts-develop'
                ]
            },
            sass: {
                files: ['scss/**/*.scss'],
                tasks: [
                    'styles'
                ]
            },
            images: {
                files: [corePath + 'img/**/*.png'],
                tasks: [
                    'cwebp:img'
                ]
            },
            html: {
                files: ['templates/**/*']
            }
        }
    });

    grunt.loadNpmTasks('@toptalo/grunt-webp');
    grunt.loadNpmTasks('grunt-contrib-imagemin');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-eslint');
    grunt.loadNpmTasks('grunt-html');
    grunt.loadNpmTasks('grunt-notify');
    grunt.loadNpmTasks('grunt-shell');
    grunt.loadNpmTasks('grunt-stylelint');
    grunt.loadNpmTasks('grunt-svgmin');

    grunt.task.run('notify_hooks');

// registerTasks
    grunt.registerTask('concatScripts', [], function (sourceMap) {
        var sourceMapEnabled = !!sourceMap;
        var fs = require('fs');
        grunt.file.expand(sourcePath + 'js/*').forEach(function (dir) {
            var dirName = dir.substr(dir.lastIndexOf('/') + 1),
                concat = grunt.config.get('concat') || {};

            if (!/\./.test(dirName)) {// skip files
                if (grunt.file.expand(dir + '/*.js').length || grunt.file.expand(dir + '/plugins/*.js').length) {
                    concat[dirName] = {
                        options: {
                            sourceMap: sourceMapEnabled
                        },
                        src: [
                            dir + '/plugins/depotProto.js',
                            dir + '/plugins/*.js',
                            dir + '/*.js'
                        ],
                        dest: corePath + 'js/' + dirName + '.js'
                    };
                }

                if (fs.existsSync(dir + '/async')) {
                    if (grunt.file.expand(dir + '/async/*.js').length || grunt.file.expand(dir + '/async/plugins/*.js').length) {
                        concat[dirName + '-async'] = {
                            options: {
                                sourceMap: sourceMapEnabled
                            },
                            src: [
                                dir + '/async/plugins/*.js',
                                dir + '/async/*.js'
                            ],
                            dest: corePath + 'js/' + dirName + '-async.js'
                        };
                    }
                }

                grunt.config.set('concat', concat);
            }
        });
        grunt.task.run('concat');
    });

    grunt.registerTask('menu', [], function () {
        var jsonFile = sourcePath + 'templates/context.json';
        var globals = grunt.file.readJSON(jsonFile);
        var slug = twigHelpers.filters(gruntParams).slug;
        var hash = twigHelpers.filters(gruntParams).hash;

        function modifyItem(item, path) {
            if (!item.slug && item.label) {
                item.slug = slug(item.label);
            }

            if (item.url && item.url === '#') {
                item.url = '#' + item.slug;
            }

            if (!item.id) {
                item.id = hash();
            }

            item.path = path ? [path, item.id].join('/') : item.id;

            if (item.children) {
                item.children = item.children.map(function (childItem) {
                    return modifyItem(childItem, item.path);
                });
            }

            var newItem = {
                label: item.label,
                url: item.url || false,
                slug: item.slug,
                id: item.id,
                path: item.path
            };

            Object.keys(item).forEach(function (key) {
                if (newItem[key] === undefined && key !== 'children' && key !== 'maxDepth') {
                    newItem[key] = item[key];
                }
            });

            if (item.maxDepth !== undefined) {
                newItem.maxDepth = item.maxDepth;
            }
            newItem.children = item.children || false;

            return newItem;
        }

        if (globals) {
            Object.keys(globals).forEach(function (key) {
                if (Array.isArray(globals[key])) {
                    globals[key] = globals[key].map(function (childItem) {
                        return modifyItem(childItem, '');
                    });
                }
            });
        }

        grunt.file.write(jsonFile, JSON.stringify(globals, null, 2));
        grunt.log.ok('Menu updated successfully'.green);
    });

    grunt.registerTask('html-pages', [], function () {
        grunt.loadNpmTasks('grunt-twig2html');
        grunt.loadNpmTasks('grunt-prettify');

        grunt.task.run('twig2html:pages', 'prettify:pages');
    });

    grunt.registerTask('html-ajax', [], function () {
        grunt.loadNpmTasks('grunt-twig2html');
        grunt.loadNpmTasks('grunt-prettify');

        grunt.task.run('twig2html:ajax', 'prettify:ajax');
    });

    grunt.registerTask('scripts-develop', [], function () {
        grunt.loadNpmTasks('grunt-contrib-clean');
        grunt.loadNpmTasks('grunt-contrib-concat');
        grunt.loadNpmTasks('grunt-contrib-uglify');

        grunt.task.run('clean:js', 'concatScripts:withSourceMaps', 'uglify:develop');
    });

    grunt.registerTask('scripts-deploy', [], function () {
        grunt.loadNpmTasks('grunt-contrib-clean');
        grunt.loadNpmTasks('grunt-contrib-concat');
        grunt.loadNpmTasks('grunt-contrib-uglify');

        grunt.task.run('clean:js', 'concatScripts:withSourceMaps', 'uglify:deploy');
    });

    grunt.registerTask('styles', [], function () {
        grunt.loadNpmTasks('grunt-contrib-clean');
        grunt.loadNpmTasks('grunt-sass');
        grunt.loadNpmTasks('@lodder/grunt-postcss');
        grunt.loadNpmTasks('grunt-csso');

        grunt.task.run('clean:css', 'sass', 'postcss', 'csso');
    });

    grunt.registerTask('png-sprite', [], function () {
        grunt.loadNpmTasks('grunt-spritesmith');

        grunt.task.run('sprite', 'imagemin:sprite', 'cwebp:sprite');
    });

    grunt.registerTask('svg-sprite', [], function () {
        grunt.loadNpmTasks('grunt-svg-sprite');

        grunt.task.run('svgmin:sprite', 'svg_sprite', 'svgmin:img');
    });

    grunt.registerTask('test', [], function () {
        grunt.registerTask('html-size', [], function () {
            var fs = require('fs');
            var files = grunt.file.expand(sourcePath + '*.html');
            var normalFiles = [];
            var largeFiles = [];

            files.forEach(function (file) {
                var stats = fs.statSync(file);
                var fileName = file.substr(file.lastIndexOf('/') + 1);
                var fileSize = (stats.size / 1000).toFixed(2);

                var fileData = {
                    name: fileName,
                    size: fileSize
                };

                if (stats.size > 200000) {
                    largeFiles.push(fileData);
                } else {
                    normalFiles.push(fileData);
                }
            });

            if (largeFiles.length) {
                largeFiles.forEach(function (file) {
                    grunt.log.error((file.name).blue + ' is ' + (file.size).red + ' Kb');
                });
            } else {
                grunt.log.ok(files.length + grunt.util.pluralize(files.length, ' file/ files') + ' lint free.');
                // normalFiles.forEach(function (file) {
                //     grunt.log.ok((file.name).blue + ' is ' + (file.size).cyan + ' Kb');
                // });
            }
        });


        grunt.task.run('html-size', 'htmllint', 'eslint', 'stylelint', 'shell:yaspeller');
    });

    grunt.registerTask('default', [], function () {
        grunt.loadNpmTasks('grunt-concurrent');

        grunt.task.run('concurrent:sprite', 'concurrent:deploy');
    });

    grunt.registerTask('develop', [], function () {
        grunt.loadNpmTasks('grunt-concurrent');

        grunt.task.run('concurrent:sprite', 'concurrent:develop', 'watch');
    });

    grunt.registerTask('deploy', [], function () {
        grunt.loadNpmTasks('grunt-contrib-clean');
        grunt.loadNpmTasks('grunt-concurrent');

        grunt.task.run('concurrent:sprite', 'concurrent:deploy', 'clean:sourcemaps', 'test');
    });

    grunt.registerTask('connect', [], function () {
        var done = this.async();
        server({
            env: 'dev'
        }).listen(
            gruntParams.connectPort,
            '127.0.0.1',
            function () {
                console.log('Waiting forever...');
                console.log('Started web server on http://localhost:' + gruntParams.connectPort);
            }
        );
    });

    grunt.registerTask('connect-public', [], function () {
        var done = this.async();
        var os = require('os');
        var interfaces = os.networkInterfaces();
        var lookupIpAddress = null;

        for (var device in interfaces) {
            if (device === 'en1' || device === 'en0') {
                interfaces[device].forEach(function (details) {
                    if (details.family === 'IPv4') {
                        lookupIpAddress = details.address;
                        return false;
                    }
                });
            }
        }

        if(lookupIpAddress) {
            server({
                env: 'dev'
            }).listen(
                gruntParams.connectPort,
                lookupIpAddress,
                function () {
                    console.log('Waiting forever...');
                    console.log('Started web server on http://' + lookupIpAddress + ':' + gruntParams.connectPort, '\n');
                }
            );
        } else {
            console.log('Oops! Can not find IPv4 address.');
            done();
        }
    });
};
