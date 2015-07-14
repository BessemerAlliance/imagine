'use strict';

var fs = require('fs');
var archive = require('archiver')('zip');
var pkg = require('./package');
var nconf = require('@voyant/config');

var AWS = require('aws-sdk');
AWS.config.apiVersions = {
    lambda: '2015-03-31'
};

var lambda = new AWS.Lambda({
    accessKeyId: nconf.get('aws_key'),
    secretAccessKey: nconf.get('aws_secret'),
    region: 'us-east-1'
});

var filepath = __dirname + '/build/' + pkg.name + '.zip';
var output = fs.createWriteStream(filepath);

output.on('close', function() {
    console.log(archive.pointer() + ' total bytes');
    console.log('archiver has been finalized and the output file descriptor has closed.');

    // automatically upload zipped file to AWS Lambda
    lambda.updateFunctionCode({
        FunctionName: 'imagine',
        ZipFile: fs.readFileSync(filepath)
    }, function(err, data) {
        if (!err) {
            console.log('New code uploaded to imagine.');
        } else {
            console.log('Code upload error');
            console.log(err, err.stack);
        }
        var returnCode = err ? -1 : 0;
        process.exit(returnCode);
    });
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
