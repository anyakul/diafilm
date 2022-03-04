#!/usr/bin/env node

const visualTest = require('./visualTest');

visualTest({
    media: 'smart',
    width: 320,
    height: 568
}, [
    {label: 'index', path: 'index.html'},
]);
