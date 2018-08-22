const
    path = require('path'),
    express = require('express'),
    app = express(),
    http = require('http').Server(app),
    tempath = path.join(__dirname, '..', 'temp');

module.exports = {
    activate: root => new Promise(resolve => {
        app.use(root + '/temp', express.static(tempath));
        http.listen(3000, '127.0.0.1', () => {
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
