# zephyrjs-cli - JavaScript CLI for Zephyr OS
## Description

Zephyr.js CLI tool that allows you to connect and upload JS code to a Zephyr board
directly from the command line.

## Usage

Start the tool to connect and upload JS code to a Zephyr board

```$ node zephyrjs-cli.js -f test/HelloWorld.js```

## Command Line Options

The command line options
```
$ node zephyrjs-cli.js -h

options:
  -d --debug <level: 0 to 4>       Set the libusb debug level
  -h --help                        Output usage information
  -l --list                        List all available USB devices
  -v --vendor-id <Vedor ID>        Vedor ID of the USB device
  -p --product-id <Product ID>     Product ID of the USB device
  -f --file <JavaScript file>      JavaScript file to upload and execute
```
