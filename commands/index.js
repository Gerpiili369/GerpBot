const
    path = require('path'),
    fs = require('fs'),
    common = require('../scripts/common'),
    Command = require('./command'),
    commands = {};

fs.readdir(__dirname, (err, files) => {
    if (err) common.logger.error(err);
    else {
        for (const file of files) {
            const
                command = require(path.join(__dirname, file)),
                key = file.slice(0, file.length - 3);
            if (command.prototype instanceof Command) {
                commands[key] = command;
                common.logger.info(`Added "${ key }".`, { label: 'commands' });
            }
        }
        common.logger.info(`Total of ${ Object.keys(commands).length } command(s) added.`, { label: 'commands' });
    }
});


module.exports = commands;
