#!/usr/bin/env node

'use strict';

var device = require('./lib/usbDevice'),
    args = process.argv.slice(2);

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

if (options.debug < 0 || options.debug > 4) {
    console.log(usage);
    process.exit(0);
} else {
    device.setDebugLevel(options.debug);
}

