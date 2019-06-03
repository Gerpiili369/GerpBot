const
    config = require('../config'),
    path = require('path'),
    express = require('express'),
    app = express(),
    http = require('http').Server(app),
    fs = require('fs'),
    tempath = path.join(__dirname, '..', 'temp');

if (!config.web) config.web = {
    root: '',
};

module.exports = {
    activate: new Promise((resolve, reject) => {
        checkTempath()
            .then(() => {
                app.use(path.join(config.web.root, 'temp'), express.static(tempath));
                http.listen(config.web.port, config.web.host, () => {
                    resolve('Activated http-service.');
                });
            })
            .catch(reject);
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
};

/**
 * @returns {Promise}
 */
function checkTempath() {
    return new Promise((resolve, reject) => {
        fs.access(tempath, fs.constants.F_OK, err => {
            if (err) fs.mkdir(tempath, err => err ? reject(err) : resolve());
            else resolve();
        });
    });
}
