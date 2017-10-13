// Copyright (c) 2017, Intel Corporation.

// Test code for Arduino 101 that uses the two onboard LEDs for output
console.log("GPIO test with two LEDs...");

// import gpio module
var gpio = require("gpio");

// LED1 and LED2 are onboard LEDs on Arduino 101
var pinA = gpio.open({pin: 'LED0', activeLow: true});
var pinB = gpio.open({pin: 'LED1', activeLow: false});

// tick is the delay between blinks
var tick = 1000, toggle = 0;

setInterval(function () {
    toggle = 1 - toggle;
    pinA.write(toggle);
    pinB.write(toggle);
}, tick);
