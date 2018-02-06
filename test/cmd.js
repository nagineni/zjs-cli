'use strict';

let exec = require('child_process').exec,
    path = require('path');

function run(opt) {
    let cmd = ['node', 'zjs-cli.js', opt].join(' '),
        data = {};
    return new Promise((resolve, reject) => {
        exec(cmd, {
            cwd: path.dirname(path.dirname(__filename))
        }, function(err, stdout, stderr) {
            if (err) {
                data['output'] = err;
                resolve(data);
            } else {
                let output = stdout.split('\t')[0].split('\n');
                data['output'] = output;
                resolve(data);
            }
        })
    });
}
module.exports = run;
