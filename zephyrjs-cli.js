#!/usr/bin/env node

'use strict';

var device = require('./lib/usbDevice');

var list = true;

if (list == true) {
    console.log(device.getDevices());
    process.exit(0);
}


