const
    { format, createLogger, transports } = require('winston'),
    logger = createLogger({
        format: format.combine(
            format.timestamp(),
            format.colorize(),
            format.printf(info => `${ info.timestamp } ${ info.level }: ${ info instanceof Error ? info.stack : info.message }`
            ),
        ),
        transports: [new transports.Console()]
    }),
    pkg = require('../package'),
    config = require('../config');

const colors = {
    default: 13290446,
    gerp: 16738816,
    error: 16711680
};

function dEsc(input) {
    return input
        .replace('_', '\\_')
        .replace('*', '\\*')
        .replace('`', '\\`')
        .replace('~', '\\~');
}

module.exports = {
    logger,
    pkg,
    colors,
    dEsc,
    config,
};
