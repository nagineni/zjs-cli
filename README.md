# zjs-cli - JavaScript CLI for Zephyr OS
## Description

`CLI tool for Zephyr OS` allows you to connect and upload JavaScript code to a Zephyr
board, directly from the command line.

## Prerequisites

The ZJS development environment uses your host computer and Arduino 101 board.

* Ubuntu* 16.04 host.
* Arduino 101 board with ZJS IDE image.
* USB A-B cable for communications.

## Initial Setup

### Install dependencies

This tool uses libusb as a submodule, so you need libudev to build the module.

On Ubuntu:
```bash
$ sudo apt-get update
$ sudo apt-get install build-essential libudev-dev
```

### Clone the git repo
```bash
git clone https://github.com/nagineni/zjs-cli.git
```

## Installation

```bash
$ cd zjs-cli
$ npm install
```

### Steps for setting up your Arduino 101:

  See the ZJS project page for information on setting up your Arduino 101.
  https://github.com/01org/zephyr.js

### Adding udev rules

  Create udev rules to allow CLI tool to open the device and also prevent
  ModemManager interfering with that device by adding the following lines
  in /etc/udev/rules.d/99-arduino-101.rules

>     SUBSYSTEM=="tty", ENV{ID_VENDOR_ID}=="8086", ENV{ID_MODEL_ID}=="f8a1", MODE="0666", ENV{ID_MM_DEVICE_IGNORE}="1", ENV{ID_MM_CANDIDATE}="0"
>     SUBSYSTEM=="usb", ATTR{idVendor}=="8086", ATTR{idProduct}=="f8a1", MODE="0666" ENV{ID_MM_DEVICE_IGNORE}="1"

  Then run this command:
  ```bash
  $ sudo udevadm control --reload-rules
  ```

## Usage

Plug the board into your computer and start the tool to connect and upload JS code to a Zephyr board
```bash
$ node zjs-cli.js -c -f test/HelloWorld.js
  ```

## Command Line Options

The command line options
```bash
$ node zjs-cli.js -h

  Usage: zjs-cli -c -f <JavaScript file to upload>

  JavaScript CLI for Zephyr OS

  Options:

    -h, --help                    Output usage information
    -V, --version                 Output the version number
    -c, --connect                 Connect to the WebUSB device
    -d, --debug <level: 0 to 4>   Set the libusb debug level
    -l, --list                    List all connected USB devices
    -v, --vid <Vendor ID>         Vendor ID of the USB device
    -p, --pid <Product ID>        Product ID of the USB device
    -f, --file <JavaScript file>  JavaScript file to upload and execute
    -s, --save <JavaScript file>  Save file to device
    -w, --webusblist              List all connected WebUSB devices
  ```
