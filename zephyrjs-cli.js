#!/usr/bin/env node

'use strict';

var device = require('./lib/usbDevice'),
    args = process.argv.slice(2),
    encoding = require('text-encoding'),
    fs = require('fs'),
    ihex = require('./ihex-web.js'),
    source = null,
    usbDevice = null,
    webInterface = null;

var options = {
    help: false,
    list: false,
    vid: null,
    pid: null,
    jsfile: null,
    debug: 0
};

const usage = 'usage: node iotjs-cli.js -f <JavaScript file to upload>\n' +
'options: \n' +
'  -d --debug <level: 0 to 4>       Set the libdevice debug level\n' +
'  -h --help                        output usage information\n' +
'  -l --list                        List all available USB devices\n' +
'  -v --vendor-id <Vedor ID>        Vedor ID of the USB device\n' +
'  -p --product-id <Product ID>     Product ID of the USB device\n' +
'  -f --file <JavaScript file>      JavaScript file to upload and execute\n';

for (var i = 0; i < args.length; i++) {
    var arg = args[i];

    switch (arg) {
        case '-h':
        case '--help':
            options.help = true;
            break;
        case '-l':
        case '--list':
            options.list = true;
            break;
        case '-d':
        case '--debuglevel':
            var level = args[i + 1];
            if (typeof level == 'undefined') {
                options.help = true;
                break;
            }
            options.debug = parseInt(level);
            break;
        case '-p':
        case '--product-id':
            var pid = args[i + 1];
            if (typeof pid == 'undefined') {
                options.help = true;
                break;
            }
            options.pid = pid;
            break;
        case '-v':
        case '--vendor-id':
            var vid = args[i + 1];
            if (typeof vid == 'undefined') {
                options.help = true;
                break;
            }
            options.vid = vid;
            break;
        case '-f':
        case '--file':
            var js = args[i + 1];
            if (typeof js == 'undefined') {
                options.help = true;
                break;
            }
            options.jsfile = js;
            break;
    }
}

if (!args.length || options.help == true) {
    console.log(usage);
    process.exit(0);
}

if (options.list == true) {
    console.log(device.getDevices());
    process.exit(0);
}

if (!options.jsfile || typeof options.jsfile !== 'string') {
    console.log(usage);
    process.exit(0);
} else {
    source = fs.readFileSync(options.jsfile, 'utf8');
}

if (options.debug < 0 || options.debug > 4) {
    console.log(usage);
    process.exit(0);
} else {
    device.setDebugLevel(options.debug);
}

function getWebUSBDevicesList() {
    var jsonConf = fs.readFileSync(__dirname + '/config/devices.json', 'utf8');
    var devices = JSON.parse(jsonConf);
    return devices;
}

function isWebUSBDevice(vid, pid) {
    var  list = getWebUSBDevicesList();

    for (var i in list) {
        if (list[i].vendorID == vid && list[i].productID == pid) {
            webInterface = list[i].WebUSBInterface;
            return true;
        }
    }
    return false;
}

if (source) {
    if (!options.vid || !options.pid) {
        var devices = getWebUSBDevicesList();
        var firstDevice = devices[Object.keys(devices)[0]];
        if (!firstDevice) {
            console.log('No WebUSB device exist in the configuration');
            process.exit(0);
        }
        options.vid = firstDevice.vendorID;
        options.pid = firstDevice.productID;
        webInterface = firstDevice.WebUSBInterface;
    } else if (!isWebUSBDevice(options.vid, options.pid)) {
        console.log('No WebUSB device exist in the configuration for the given VID and PID');
        process.exit(0);
    }

    device.findDevice(options.vid, options.pid).then((device) => {
        usbDevice = device;
        init();
    }).catch((error) => {
        console.log('USB device error: ' + error);
    });
}

function convIHex(source) {
    var array = ihex.intArrayFromString(source);
    var ptr = ihex.allocate(array, 'i8', ihex.ALLOC_NORMAL);
    var output = ihex._convert_ihex(ptr);

    var iHexString = ihex.Pointer_stringify(output);
    ihex._free(ptr);

    return iHexString;
}

function stripComments(source) {
    return source.replace(RegExp('[ \t]*//.*', 'g'), '');
}

function stripBlankLines(source) {
    return source.replace(RegExp('^[ \t]*\n', 'gm'), '');
}

function send(string) {
    var buffer = new encoding.TextEncoder('utf-8').encode(string);
    usbDevice.transfer(buffer).catch(function(error) {
        console.log('Transfer failed. Error:', err);
    });
}

function transfer(source) {
    send('set transfer ihex\n');
    send('stop\n');
    send('load\n');

    let stripped = stripBlankLines(stripComments(source));
    let ihex = convIHex(stripped);

    let line = ihex;
    for (let line of ihex.split('\n')) {
        send(line + '\n');
    }
    send('run temp.dat' + '\n');
    send('set transfer raw\n');
}

function init() {
    usbDevice.open().then(() => {
            return usbDevice.claimInterface(webInterface ? webInterface : 2);
        }).then(() => {
            return usbDevice.listen();
        }).then(() => {
            return usbDevice.controlTransferOut(0x22, 0x01, 0x02);
        }).then((data) => {
            // Wait 1 sec for the device to do all settings
            setTimeout(() => transfer(source), 1000);
        }).catch((error) => {
            console.log('USB Error: ' + error);
            exitHandler();
        });
}

// Cleanup when interrupted
function exitHandler() {
    if (usbDevice) {
        usbDevice.close().then(() => {
            console.log('Device closed');
            process.exit();
        }).catch((error) => {
            console.log('Failed to close the USB device!');
            process.exit();
        });
    }
}

// Press Ctrl+C to exit the process
process.on('SIGINT', exitHandler);
