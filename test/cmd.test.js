'use strict';

let expect = require('chai').expect,
    run = require('./cmd.js'),
    exec = require('child_process').exec,
    path = require('path');


describe('Verify command option', function() {

    let help_info = [
        'Usage: zjs-cli -c -f <JavaScript file to upload>',
        'JavaScript CLI for Zephyr OS',
        'Options:',
        '-h, --help                    output usage information',
        '-V, --version                 output the version number',
        '-c, --connect                 Connect to the WebUSB device',
        '-d, --debug <level: 0 to 4>   Set the libusb debug level',
        '-l, --list                    List all connected USB devices',
        '-v, --vid <Vendor ID>         Vendor ID of the USB device',
        '-p, --pid <Product ID>        Product ID of the USB device',
        '-f, --file <JavaScript file>  JavaScript file to upload and execute',
        '-s, --save <JavaScript file>  Save file to device',
        '-w, --webusblist              List all connected WebUSB devices'
    ].join(',');

    it('-h --help', function() {
        return run('-h').then((result) => {
            result['output'].forEach(function(item) {
                expect(help_info).to.contain(item.trim());
            })
        });
    });

    it('-d --debug', function() {
        return run('-d').then((result) => {
            expect(result['output'].toString()).to.contain("error: option `-d, --debug <level: 0 to 4>' argument missing");
        })
    });

    it('-d --debug, with negative argument -1', function() {
        return run('-d -1').then((result) => {
            result['output'].forEach(function(item) {
                expect(help_info).to.contain(item.trim());
            })
        })
    });

    it('-d --debug, with negative argument 5', function() {
        return run('-d 5').then((result) => {
            result['output'].forEach(function(item) {
                expect(help_info).to.contain(item.trim());
            })
        })
    });

    it('-d --debug, with negative argument abc', function() {
        return run('-d abc').then((result) => {
            result['output'].forEach(function(item) {
                expect(help_info).to.contain(item.trim());
            })
        })
    });

    it('-d --debug, with positive argument 0', function() {
        return run('-d 0').then((result) => {
            expect(result['output'].toString()).to.be.empty;
        })
    });

    it('-V --version', function() {
        return run('-V').then((result) => {
            expect(result['output'].toString()).to.contain('0.0.1');
        })
    });

    it('-v --vid, without argument', function() {
        return run('-v').then((result) => {
            expect(result['output'].toString()).to.contain("error: option `-v, --vid <Vendor ID>' argument missing");
        })
    });

    it('-v --vid, with argument', function() {
        return run('-v 123').then((result) => {
            expect(result['output'].toString()).to.be.empty;
        })
    });

    it('-p --pid, without argument', function() {
        return run('-p').then((result) => {
            expect(result['output'].toString()).to.contain("error: option `-p, --pid <Product ID>' argument missing");
        })
    });

    it('-v --pid, with argument', function() {
        return run('-p 123').then((result) => {
            expect(result['output'].toString()).to.be.empty;
        })
    });

    it('-f --file <JavaScript file>, with invalid argument', function() {
        return run('-f aa.js').then((result) => {
            expect(result['output'].toString()).to.contain("Error: ENOENT: no such file or directory, open \'aa.js\'");
        })
    });

    it('-w --webusblist', function() {
        return run('-w').then((result) => {
            expect(result['output'].toString()).to.contain('idVendor: 32902');
            expect(result['output'].toString()).to.contain('idProduct: 63649');
        })
    });

    it('-c -v(invalid) -p(valid), with arguments invalid vid and valid pid', function() {
        return run('-c -v 123 -p 63649').then((result) => {
            let info = 'No WebUSB device exist in the configuration for the given VID and PID';
            expect(result['output'].toString()).to.contain(info);
        })
    });

    it('-c -v(valid) -p(invalid), with arguments valid vid and invalid pid', function() {
        return run('-c -v 32902 -p 63640').then((result) => {
            let info = 'No WebUSB device exist in the configuration for the given VID and PID';
            expect(result['output'].toString()).to.contain(info);
        })
    });

    it('-c -v(invalid) -p(invalid), with arguments invalid vid and invalid pid', function() {
        return run('-c -v 32901 -p 63640').then((result) => {
            let info = 'No WebUSB device exist in the configuration for the given VID and PID';
            expect(result['output'].toString()).to.contain(info);
        })
    });

    it('-c -f, with argument invalid file', function() {
        return run('-c -f aa.js').then((result) => {
            expect(result['output'].toString()).to.contain("Error: ENOENT: no such file or directory, open \'aa.js\'");
        })
    });

    it('-l --list', function(done) {
        run('-l').then((result) => {
            let data = [],
                num;
            exec('lsusb | wc -l', function(err, stdout, stderr) {
                if (err) {
                    except(false).to.be.ok;
                    done();
                } else {
                    num = parseInt(stdout);
                    result['output'].forEach(function(item, index) {
                        if (item.indexOf('Device {') > -1) {
                            data.push(index)
                        }
                    })
                    expect(data.length).to.equal(num);
                    done();
                }
            })
        })
    });

    it('-c -s with negative argument', function() {
        return run('-c -s package.json').then((result) => {
            let info = 'Error: Filename should be in the 8.3 format';
            expect(result['output'].toString()).to.contain(info);
        })
    });
})
