// Copyright 2017 Intel Corporation
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

var fs = require('fs');

module.exports = {
    _webusbInterface: null,

    getWebUSBInterface: function() {
        return this._webusbInterface;
    },

    knownDevicesList: function() {
        var  json = fs.readFileSync(__dirname +
            '/../config/devices.json', 'utf8');
        var devices = JSON.parse(json);
        return devices;
    },

    getFirstKnownDevice: function() {
        var devices = this.knownDevicesList();
        var knownDevice = devices[Object.keys(devices)[0]];
        var result = {};

        this._webusbInterface = knownDevice.WebUSBInterface;
        if (knownDevice) {
            result.vid = knownDevice.vendorID;
            result.pid = knownDevice.productID;
        }

        return result;
    },

    isWebUSBDevice: function(vid, pid) {
        var  list = this.knownDevicesList();

        for (var i in list) {
            if (parseInt(list[i].vendorID) === vid &&
                parseInt(list[i].productID) === pid) {
                this._webusbInterface = list[i].WebUSBInterface;
                return true;
            }
        }
        return false;
    },

    getWebUSBDevices: function(devices) {
        var webusbDevices = devices.filter(device => {
            var descriptor = device.deviceDescriptor;
            return this.isWebUSBDevice(descriptor.idVendor,
                descriptor.idProduct);
        });

        return webusbDevices;
    },

    parseData: function() {
        var stream = '';

        return function(data) {
            if (data.includes('acm>') && data.length <= 18) {
                process.stdout.write(data.replace(/\r/g, ''));
                return;
            } else if (data.includes('\x1b[2J\x1b[H')) {
                // Handle 'clear' command.
                console.log(data);
                return;
            }

            stream += data;
            var lines = stream.split('\n');

            stream = lines.pop();
            for (var i in lines) {
                console.log(lines[i]);
            }
        };
    },

    isValidFilename: function(filename) {
        if (filename.length === 0)
            return false;

        // Check there aren't multiple slashes.
        if ((filename.split('/').length) > 2) {
            return false;
        }

        var fnsplit = filename.split('.');

        // Check there aren't multiple periods.
        if (fnsplit.length > 2) {
            return false;
        }

        var namelen = fnsplit[0].length;
        var extlen = fnsplit[1] ? fnsplit[1].length : 0;

        // Check the filename is in 8.3 format.
        if (namelen === 0 || namelen > 8 || extlen > 3) {
            return false;
        }

        return true;
    }
};
