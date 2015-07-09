'use strict';

var fs = require('fs');
var archive = require('archiver')('zip');
var pkg = require('./package');

var output = fs.createWriteStream(__dirname + '/build/' + pkg.name + '.zip');

output.on('close', function() {
    console.log(archive.pointer() + ' total bytes');
    console.log('archiver has been finalized and the output file descriptor has closed.');
});

archive.on('error', function(err) {
    throw err;
});

archive.pipe(output);

archive.file('index.js');

Object.keys(pkg.dependencies).forEach(function(dep) {
    archive.directory('node_modules/' + dep);
});

archive.finalize();
