# zephyrjs-cli - JavaScript CLI for Zephyr OS
## Description

Zephyr.js CLI tool that allows you to connect and upload JS code to a Zephyr board
directly from the command line.

## Usage

Start the tool to connect and upload JS code to a Zephyr board

```$ node zephyrjs-cli.js -c -f test/HelloWorld.js```

## Command Line Options

The command line options
```
$ node zephyrjs-cli.js -h

  Usage: zephyrjs-cli -c -f <JavaScript file to upload>

  JavaScript CLI for Zephyr OS

  Options:

    -h, --help                    output usage information
    -V, --version                 output the version number
    -c, --connect                 Connect to the WebUSB device
    -d, --debug <level: 0 to 4>   Set the libusb debug level
    -l, --list                    List all connected USB devices
    -v, --vid <Vendor ID>         Vendor ID of the USB device
    -p, --pid <Product ID>        Product ID of the USB device
    -f, --file <JavaScript file>  JavaScript file to upload and execute
    -w, --webusblist              List all connected WebUSB devices
```
