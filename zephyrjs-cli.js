#!/usr/bin/env node

'use strict';

var device = require('./lib/usbDevice'),
    program = require('commander'),
    encoding = require('text-encoding'),
    fs = require('fs'),
    ihex = require('./lib/ihex-web.js'),
    readline = require('readline'),
    source = null,
    usbDevice = null,
    webInterface = null;

program
  .version('0.0.1')
  .description('JavaScript CLI for Zephyr OS')
  .usage("-c -f <JavaScript file to upload>")
  .option('-c, --connect', 'Connect to the WebUSB device')
  .option('-d, --debug <level: 0 to 4>', 'Set the libusb debug level', parseInt)
  .option('-l, --list', 'List all connected USB devices')
  .option('-v, --vid <Vedor ID>', 'Vedor ID of the USB device', parseInt)
  .option('-p, --pid <Product ID>', 'Product ID of the USB device', parseInt)
  .option('-f, --file <JavaScript file>', 'JavaScript file to upload and execute')
  .option('-w, --webusblist', 'List all connected WebUSB devices')
  .parse(process.argv);

if (!process.argv.slice(2).length || program.h) {
    program.help();
}

if (program.pid !== undefined && isNaN(program.pid)) {
    console.log("Product ID must be a non-empty numeric value.");
    process.exit(0);
}

if (program.vid !== undefined && isNaN(program.vid)) {
    console.log("Vendor ID must be a non-empty numeric value.");
    process.exit(0);
}

if (program.webusblist) {
    console.log(getWebUSBDevices());
}

if (program.list) {
    console.log(device.getDevices());
}

if (program.debug !== undefined) {
    if (isNaN(program.debug) || program.debug < 0 || program.debug > 4) {
        program.help();
    } else {
        device.setDebugLevel(program.debug);
    }
}

if (program.file) {
    program.connect = true;
    source = fs.readFileSync(program.file, 'utf8');
}

function getWebUSBDevices() {
    var webusbDevices,
        allDevices = device.getDevices();

    webusbDevices = allDevices.filter(device => {
        var descriptor = device.deviceDescriptor;
        return isWebUSBDevice(descriptor.idVendor, descriptor.idProduct);
    });

    return webusbDevices;
}

function knownDevicesList() {
    var jsonConf = fs.readFileSync(__dirname + '/config/devices.json', 'utf8');
    var devices = JSON.parse(jsonConf);
    return devices;
}

function isWebUSBDevice(vid, pid) {
    var  list = knownDevicesList();

    for (var i in list) {
        if (parseInt(list[i].vendorID) === vid &&
                parseInt(list[i].productID) === pid) {
            webInterface = list[i].WebUSBInterface;
            return true;
        }
    }
    return false;
}

if (program.connect) {
    if (!program.vid || !program.pid) {
        var devices = knownDevicesList();
        var firstDevice = devices[Object.keys(devices)[0]];
        if (!firstDevice) {
            console.log('No WebUSB device exist in the configuration');
            process.exit(0);
        }
        program.vid = firstDevice.vendorID;
        program.pid = firstDevice.productID;
        webInterface = firstDevice.WebUSBInterface;
        console.log("No VID or PID provided, so try to connect to the first known WebUSB device in the configuration.");
    } else if (!isWebUSBDevice(program.vid, program.pid)) {
        console.log('No WebUSB device exist in the configuration for the given VID and PID');
        process.exit(0);
    }

    device.findDevice(program.vid, program.pid).then((device) => {
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

function parseData() {
    var stream = '';

    return function(data) {
        if (data.includes("acm>") && data.length <= 18) {
            process.stdout.write(data.replace(/\r/g,""));
            return;
        }
        stream += data;
        var lines = stream.split('\n');

        stream = lines.pop();
        for (var i in lines) {
            console.log(lines[i]);
        }
    };
}

function init() {
    usbDevice.open().then(() => {
            // Setup event handlers.
            var printData = parseData(),
                rawMode = true,
                previousRead;

            // Setup event handlers.
            usbDevice.on('data', (event) => {
                var skip = true,
                    str = new encoding.TextDecoder('utf-8').decode(event.data);

                 if (str === 'raw') {
                     rawMode = true;
                 } else if (str === 'ihex') {
                     rawMode = false;
                 }
                 skip = !rawMode && /^(\n|\[.*\])/.test(str);
                 if (!skip) {
                     if (str.length === 1 &&
                         str.charCodeAt(0) !== 13 &&
                         str.charCodeAt(0) !== 10 &&
                         previousRead !== undefined &&
                         previousRead.charCodeAt(
                            previousRead.length - 1) === 13) {
                         str = '\n' + str;
                     }

                     previousRead = str;
                     printData(previousRead);
                    }
            });

            usbDevice.on('error', (event) => {
                console.log('Error on ' + event.type + ': ' + event.error);
                process.exit();
            });

            usbDevice.on('detached', (event) => {
                console.log('Detached device');
                process.exit();
            });

            return usbDevice.claimInterface(webInterface ? webInterface : 2);
        }).then(() => {
            return usbDevice.listen();
        }).then(() => {
            return usbDevice.controlTransferOut(0x22, 0x01, 0x02);
        }).then((data) => {
            // Wait 1 sec for the device to do all settings
            if (source) {
                setTimeout(() => transfer(source), 1000);
            } else {
                process.stdout.write("\u001b[33macm> \u001b[39;0m");
            }
            initReadableStream();
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
    } else {
        process.exit();
    }
}

function initReadableStream()
{
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    rl.on('line', (input) => {
        if (!input) {
            process.stdout.write("\u001b[33macm> \u001b[39;0m");
        } else if (input.includes("load") || input.includes("eval")) {
            console.log("'load' and 'eval' commands are unsupported in CLI mode");
            // print 'acm>' prompt.
            process.stdout.write("\u001b[33macm> \u001b[39;0m");
        } else if (input === "quit" || input === 'exit') {
            exitHandler();
        } else {
            send(input + '\n');
        }
    });

    rl.on('SIGINT', () => {
        exitHandler();
    });
}

// Press Ctrl+C to exit the process
process.on('SIGINT', exitHandler);
