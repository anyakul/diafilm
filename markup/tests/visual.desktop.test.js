#!/usr/bin/env node

const visualTest = require('./visualTest');

visualTest({
    media: 'desktop',
    width: 1280,
    height: 1024
}, [
    {label: 'index', path: 'index.html'},
]);
