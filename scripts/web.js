const
    config = require('../config').web,
    path = require('path'),
    express = require('express'),
    app = express(),
    http = require('http').Server(app),
    fs = require('fs'),
    tempath = path.join(__dirname, '..', 'temp');

!fs.existsSync(tempath) && fs.mkdirSync(tempath);

module.exports = {
    activate: new Promise(resolve => {
        app.use(config.root + '/temp', express.static(tempath));
        http.listen(config.port, config.host, () => {
            resolve('Activated http-service.');
        });
    }),
    addTemp: (name, buffer) => new Promise((resolve, reject) => {
        fs.writeFile(path.join(tempath, name), buffer, err => {
            if (err) reject(err);
            else resolve();
        });
    }),
    removeTemp: name => new Promise((resolve, reject) => {
        fs.unlink(path.join(tempath, name), err => {
            if (err) reject(err);
            else resolve();
        });
    })
}
