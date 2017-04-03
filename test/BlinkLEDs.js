// Copyright (c) 2017, Intel Corporation.

// Test code for Arduino 101 that uses the two onboard LEDs for output
console.log("GPIO test with two LEDs...");

// import gpio module
var gpio = require("gpio");
var pins = require("arduino101_pins");

// pins 8 (LED0) and 12 (LED1) are onboard LEDs on Arduino 101
var pinA = gpio.open({ pin: pins.LED0, activeLow: false });
var pinB = gpio.open({ pin: pins.LED1, activeLow: true });

// tick is the delay between blinks
var tick = 1000, toggle = false;

setInterval(function () {
    toggle = !toggle;
    pinA.write(toggle);
    pinB.write(toggle);
}, tick);
