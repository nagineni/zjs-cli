var usb = require('usb'),
    _ = require('lodash');

exports.getDevices = function() {
    return usb.getDeviceList();
};
