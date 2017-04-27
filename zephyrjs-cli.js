#!/usr/bin/env node

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

'use strict';

var device = require('./lib/usbDevice'),
    program = require('commander'),
    encoding = require('text-encoding'),
    fs = require('fs'),
    readline = require('readline'),
    utils = require('./lib/cliUtils'),
    transferUtils = require('./lib/transferUtils'),
    source = null,
    usbDevice = null;

program
  .version('0.0.1')
  .description('JavaScript CLI for Zephyr OS')
  .usage('-c -f <JavaScript file to upload>')
  .option('-c, --connect', 'Connect to the WebUSB device')
  .option('-d, --debug <level: 0 to 4>', 'Set the libusb debug level', parseInt)
  .option('-l, --list', 'List all connected USB devices')
  .option('-v, --vid <Vendor ID>', 'Vendor ID of the USB device', parseInt)
  .option('-p, --pid <Product ID>', 'Product ID of the USB device', parseInt)
  .option('-f, --file <JavaScript file>', 'JavaScript file to upload and execute')
  .option('-w, --webusblist', 'List all connected WebUSB devices')
  .parse(process.argv);

if (!process.argv.slice(2).length || program.h) {
    program.help();
}

if (program.pid !== undefined && isNaN(program.pid)) {
    console.log('Product ID must be a non-empty numeric value.');
    process.exit();
}

if (program.vid !== undefined && isNaN(program.vid)) {
    console.log('Vendor ID must be a non-empty numeric value.');
    process.exit();
}

if (program.webusblist) {
    let allDevices = device.getDevices();
    console.log(utils.getWebUSBDevices(allDevices));
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

if (program.connect) {
    if (!program.vid || !program.pid) {
        console.log('No VID or PID provided, so try to connect to the first known WebUSB device in the configuration.');
        program = utils.getFirstKnownDevice();
    } else if (!utils.isWebUSBDevice(program.vid, program.pid)) {
        console.log('No WebUSB device exist in the configuration for the given VID and PID');
        process.exit(0);
    }

    device.findDevice(program.vid, program.pid).then((device) => {
        usbDevice = device;
        openDevice();
    }).catch((error) => {
        console.log('USB device error: ' + error);
    });
}

function send(string) {
    let buffer = new encoding.TextEncoder('utf-8').encode(string);
    usbDevice.transfer(buffer).catch(function(error) {
        console.log('Transfer failed. Error:', err);
    });
}

function transfer(source) {
    send('set transfer ihex\n');
    send('stop\n');
    send('load\n');

    let stripped = transferUtils.stripBlankLines(
        transferUtils.stripComments(source));
    let ihex = transferUtils.convIHex(stripped);

    let line = ihex;
    for (let line of ihex.split('\n')) {
        send(line + '\n');
    }
    send('run temp.dat' + '\n');
    send('set transfer raw\n');
}

function openDevice() {
    usbDevice.open().then(() => {
            // Setup event handlers.
            let printData = utils.parseData();
            let rawMode = true;
            let previousRead;

            // Setup event handlers.
            usbDevice.on('data', (event) => {
                let skip = true;
                let str = new encoding.TextDecoder('utf-8').decode(event.data);

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

            var webInterface = utils.getWebUSBInterface();
            return usbDevice.claimInterface(webInterface ? webInterface : 2);
        }).then(() => {
            return usbDevice.listen();
        }).then(() => {
            return usbDevice.controlTransferOut(0x22, 0x01, 0x02);
        }).then((data) => {
            // Wait 2 sec for the device to do all settings
            if (source) {
                setTimeout(() => transfer(source), 2000);
            } else {
                process.stdout.write('\u001b[33macm> \u001b[39;0m');
            }
            initReadableStream();
        }).catch((error) => {
            console.log('USB Error: ' + error);
            exitHandler();
        });
}

function initReadableStream() {
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    rl.on('line', (input) => {
        if (!input) {
            process.stdout.write('\u001b[33macm> \u001b[39;0m');
        } else if (input.includes('load') || input.includes('eval')) {
            console.log("'load' and 'eval' commands are unsupported in CLI mode");
            // print 'acm>' prompt.
            process.stdout.write('\u001b[33macm> \u001b[39;0m');
        } else if (input === 'quit' || input === 'exit') {
            exitHandler();
        } else {
            send(input + '\n');
        }
    });

    rl.on('SIGINT', () => {
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

// Press Ctrl+C to exit the process
process.on('SIGINT', exitHandler);
