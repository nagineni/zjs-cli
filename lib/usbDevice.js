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
        var callback_data = [];

        if (device) {
            usb.on('detach', function(detached) {
                var descriptor = detached.deviceDescriptor;
                if (descriptor.idVendor == vid && descriptor.idProduct == pid) {
                    callback_data[0].dispatchEvent("detached", {
                        device: detached
                    });
                }
            });

            var usbDevice = WebUSBDevice(device);
            callback_data.push(usbDevice);
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

require('util').inherits(WebUSBDevice, require('events').EventEmitter);

_.extend(WebUSBDevice.prototype, {
    _isWebUSBDevice: true,
    _inEndpoint: null,
    _outEndpoint: null,
    _claimedInterface: null,

    _inDataEvent: function(data) {
        if (data && data.length > 0) {
            this.dispatchEvent('data', {
                type: 'In endpoint',
                data: data
            });
        }
    },

    _inErrorEvent: function(err) {
        this.dispatchEvent('error', {
            type: 'InEndpoint',
            error: err
        });
    },

    _outErrorEvent: function(err) {
        this.dispatchEvent('error', {
            type: 'OutEndpoint',
            error: err
        });
    },

    open: function() {
        return new Promise(_.bind(function(fulfill, reject) {
            if (this._device) {
                this._device.open();
                fulfill();
            } else {
                reject(new Error('Failed to open USB device!'));
            }
        }, this));
    },

    claimInterface: function(interfacce) {
        return new Promise(_.bind(function(fulfill, reject) {
            this._claimedInterface = this._device.interfaces[interfacce];
            if (this._claimedInterface) {
                this._inEndpoint = this._claimedInterface.endpoints[0];
                this._outEndpoint = this._claimedInterface.endpoints[1];

                this._inEndpoint.on('error', this._inErrorEvent.bind(this));
                this._inEndpoint.on('data', this._inDataEvent.bind(this));
                this._outEndpoint.on('error', this._outErrorEvent.bind(this));

                this._claimedInterface.claim();
                fulfill();
            } else {
                reject(new Error('Failed to claim the interface!'));
            }
        }, this));
    },

    controlTransferOut: function(bRequest, wValue, wIndex) {
        return new Promise(_.bind(function(fulfill, reject) {

            if (!bRequest || !wValue || !wIndex) {
                reject(new Error('Input arguments are invalid'));
            }

            var type = usb.LIBUSB_REQUEST_TYPE_CLASS |
                usb.LIBUSB_RECIPIENT_INTERFACE |
                usb.LIBUSB_ENDPOINT_OUT;
            var buffer = new Buffer(64);
            this._device.controlTransfer(type, bRequest, wValue,
                wIndex, buffer, function(err, data) {
                    if (err) {
                        reject(new Error('Control Transfer failed:' + err));
                    } else {
                        fulfill(data);
                    }
                });
        }, this));
    },

    listen: function() {
        return new Promise(_.bind(function(fulfill, reject) {
            if (this._inEndpoint) {
                this._inEndpoint.startPoll();
                fulfill();
            } else {
                reject(new Error('Claim the interface before start polling'));
            }
        }, this));
    },

    close: function() {
        return new Promise(_.bind(function(fulfill, reject) {
            if (this._claimedInterface) {
                this._inEndpoint.stopPoll(function() {
                    this._claimedInterface.release(true, function(err) {
                        if (err) {
                            reject(new Error('Failed to release the interface'));
                        } else {
                            this._device.close();
                            fulfill();
                        }
                    }.bind(this));
                }.bind(this));
            } else {
                this._device.close();
                fulfill();
            }
        }, this));
    },

    addEventListener: WebUSBDevice.prototype.addListener,

    removeEventListener: WebUSBDevice.prototype.removeListener,

    dispatchEvent: function(event, request) {
        this.emit(event, request);
        if (typeof this[ 'on' + event ] === 'function') {
            this[ 'on' + event ](request);
        }
    }
});

exports.WebUSBDevice = WebUSBDevice;
