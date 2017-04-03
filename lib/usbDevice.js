var usb = require('usb'),
    _ = require('lodash');

exports.getDevices = function() {
    return usb.getDeviceList();
};

exports.setDebugLevel = function(level) {
    return usb.setDebugLevel(level);
}

exports.findDevice = function(vid, pid) {
    return new Promise(function(fulfill, reject) {
        if (!vid) {
            reject(new Error('Vendor ID must be a non-empty'));
        }

        if (!pid) {
            reject(new Error('Product ID  must be a non-empty'));
        }

        var device = usb.findByIds(vid, pid);
        var usbDevice = WebUSBDevice(device);

        if (usbDevice) {
            fulfill(usbDevice);
        } else {
            reject(new Error('USB device not found'));
        }
    });
};

var WebUSBDevice = function(device) {
    if (!this._isWebUSBDevice) {
        return new WebUSBDevice(device);
    }
    this._device = device;
};

_.extend(WebUSBDevice.prototype, {
    _isWebUSBDevice: true,

    open: function() {
        return new Promise(_.bind(function(fulfill, reject) {
            if (this._device) {
                this._device.open();
                fulfill();
            } else {
                reject(new Error('Failed to open USB device!'));
            }
        }, this));
    }
});

exports.WebUSBDevice = WebUSBDevice;
