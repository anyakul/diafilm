const serveStatic = require('serve-static');
const finalhandler = require('finalhandler');
const url = require('url');
const path = require('path');
const http = require('http');
const {readFileSync, existsSync} = require('fs');
const TwigRenderer = require('@toptalo/twig-renderer');
const twigHelpers = require('@toptalo/twig-helpers');

const {gruntParams} = require('../package.json');
const markupPath = path.join(__dirname, '../');
const staticPath = path.join(__dirname, '../', gruntParams.distRoot);
const serveMarkup = serveStatic(markupPath);
const serveFiles = serveStatic(staticPath);

function parseCookie (cookieString) {
    var cookieObject = {};

    if (cookieString) {
        cookieString.split(/[; ]+/).forEach(substring => {
            var pair = substring.split(/[= ]+/);
            cookieObject[pair[0]] = pair[1];
        });
    }

    return cookieObject;
}

module.exports = function init (serverParams) {
    function serverErrorHTML (title, body) {
        return `<!DOCTYPE html><htm><head><title>${title}</title><script src="//localhost:${gruntParams.liveReloadPort}/livereload.js" async></script></head><body>${body}</body></htm>`;
    }

    return http.createServer(function onRequest (request, response) {
        let requestURL = url.parse(request.url, true);
        gruntParams.request = {
            url: request.url,
            headers: request.headers,
            cookie: parseCookie(request.headers.cookie),
            method: request.method,
            query: requestURL.query
        };

        gruntParams.env = serverParams.env || 'dev';
        if (request.method === 'POST' && requestURL.pathname.match(/\.json/)) {
            let body = '';
            request.on('data', function (chunk) {
                body += chunk;
            }).on('end', function () {
                try {
                    let content = readFileSync(requestURL.pathname.replace(/^\//, ''));
                    let jsonContent = JSON.parse(content);
                    if (!Array.isArray(jsonContent)) {
                        jsonContent._request = body.split(/[\r]?[\n]/g);
                    }
                    response.writeHead(200, {'Content-Type': 'application/json'});
                    response.write(JSON.stringify(jsonContent));
                    response.end();
                } catch (error) {
                    console.log('\x1b[31m' + error.message);
                    serveMarkup(request, response, finalhandler(request, response));
                }
            });
        } else if (requestURL.pathname.match(/service-worker\.min\.js/)) {
            try {
                let content = readFileSync(path.join(__dirname, '../', gruntParams.distRoot, gruntParams.corePath, 'js/service-worker.min.js'));
                response.writeHead(200, {'Content-Type': 'application/javascript'});
                response.write(content);
                response.end();
                serveMarkup(request, response, finalhandler(request, response));
            } catch (error) {
                console.log('\x1b[31m' + error.message);
                serveMarkup(request, response, finalhandler(request, response));
            }
        } else if (requestURL.pathname.match(/favicon\.ico/)) {
            try {
                let content = readFileSync(path.join(__dirname, '../', gruntParams.distRoot, gruntParams.corePath, 'icons/favicon.ico'));
                response.writeHead(200, {'Content-Type': 'image/x-icon'});
                response.write(content);
                response.end();
                serveMarkup(request, response, finalhandler(request, response));
            } catch (error) {
                console.log('\x1b[31m' + error.message);
                serveMarkup(request, response, finalhandler(request, response));
            }
        } else if (requestURL.pathname.match(new RegExp(gruntParams.staticPath))) {
            try {
                serveFiles(request, response, finalhandler(request, response));
            } catch (error) {
                console.log('\x1b[31m' + error.message);
                serveMarkup(request, response, finalhandler(request, response));
            }
        } else {
            let pathName = requestURL.pathname;

            if (pathName.match(/^\/$/)) {
                pathName = '/index.html';
            } else if (pathName.match(/offline/)) {
                pathName = '/offline.html';
            }

            let extMatches = pathName.match(/.*\.(html|json)/);
            let extName = extMatches && extMatches[1];
            let contentType = extName === 'json' ? 'application/json' : 'text/html';

            try {
                let renderer = new TwigRenderer({
                    namespaces: {
                        'blocks': 'templates/blocks/',
                        'layouts': 'templates/layouts/'
                    },
                    context: gruntParams,
                    globals: 'templates/context.json',
                    extensions: twigHelpers.extensions(gruntParams),
                    filters: twigHelpers.filters(gruntParams),
                    functions: twigHelpers.functions(gruntParams)
                });

                let template = pathName.replace(new RegExp(`\\.${extName}`, 'i'), '.twig');

                if(pathName.match(/ajax/)){
                    template = pathName + '.twig';
                }

                let templatePath = `templates${template}`;

                if (!existsSync(templatePath)) {
                    templatePath = `templates/pages${template}`;
                }

                if (existsSync(templatePath)) {
                    renderer.render(templatePath).then(content => {
                        response.writeHead(200, {'Content-Type': contentType});
                        response.write(content);
                        response.end();
                    }).catch(error => {
                        response.writeHead(500, {'Content-Type': 'text/html'});
                        response.write(serverErrorHTML(
                            `500: ${error.type} in ${error.file}`,
                            `<h1>${error.type} in ${error.file}</h1><pre>${error.message}</pre>`
                        ));
                        response.end();
                    });
                } else {
                    serveMarkup(request, response, finalhandler(request, response));
                }
            } catch (error) {
                response.writeHead(500, {'Content-Type': 'text/html'});
                response.write(serverErrorHTML(
                    '500',
                    error
                ));
                response.end();
            }
        }
    });
};
