var usb = require('usb'),
    _ = require('lodash');

exports.getDevices = function() {
    return usb.getDeviceList();
};

exports.setDebugLevel = function(level) {
    return usb.setDebugLevel(level);
}
