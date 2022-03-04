#!/usr/bin/env node

const visualTest = require('./visualTest');

visualTest({
    media: 'tablet',
    width: 768,
    height: 1024
}, [
    {label: 'index', path: 'index.html'},
]);
