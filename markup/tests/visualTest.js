const puppeteer = require('puppeteer');
const {readFileSync} = require('fs');
const {toMatchImageSnapshot} = require('jest-image-snapshot');

const server = require('../node_scripts/server')({
    env: 'test'
});

const getSnapshotIdentifier = (media, label) => {
    return `${media}-${label.replace(/[:]/g, '-')}`;
};

const styleTag = {
    content: readFileSync('tests/reset.css').toString()
};

const scriptTag = {
    content: readFileSync('tests/reset.js').toString()
};

expect.extend({toMatchImageSnapshot});

module.exports = async function visualTest (options, pages) {
    const MEDIA = options.media;
    const WIDTH = options.width;
    const HEIGHT = options.height;
    const HOST = '127.0.0.1';

    let browser;
    let page;
    let port;
    let origin;

    await describe(MEDIA, () => {
        beforeAll(async () => {
            jest.setTimeout(100000);
            await server.listen(0, HOST, function () {
                port = this.address().port;
                origin = `http://${HOST}:${port}`;
                console.log(`Server running on ${origin}`);
            });

            browser = await puppeteer.launch({
                headless: true,
                defaultViewport: {
                    width: WIDTH,
                    height: HEIGHT
                },
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage'
                ]
            });
            let pages = await browser.pages();
            page = pages && pages[0] || await browser.newPage();
        });

        afterAll(async () => {
            console.log('Stops server...');
            await page.close();
            await browser.close();
            await server.close();
        });

        const checkPage = async function (label, path) {
            path = path || label + '.html';

            await it(label, async () => {
                await page.goto(`${origin}/${path}`, {waitUntil: 'networkidle2'});
                await page.addStyleTag(styleTag);
                await page.addScriptTag(scriptTag);
                await page.waitFor(500);

                const image = await page.screenshot({
                    fullPage: true
                });

                expect(image).toMatchImageSnapshot({
                    customSnapshotIdentifier: getSnapshotIdentifier(MEDIA, label)
                });
            });
        };

        pages.forEach(async ({label, path}) => await checkPage(label, path));
    });
};
