const
    { format, createLogger, transports } = require('winston'),
    logger = createLogger({
        format: format.combine(
            format.timestamp(),
            format.colorize(),
            format.metadata({ fillExcept: ['timestamp', 'level', 'stack', 'message'] }),
            format.printf(info => `${ info.timestamp } ${ info.level } [${ info.metadata.label || 'bot' }]: ${ info instanceof Error ? info.stack : info.message }`
            ),
        ),
        transports: [new transports.Console()]
    }),
    pkg = require('../package'),
    config = require('../config');

const timeOf = {};

const colors = {
    default: 13290446,
    gerp: 16738816,
    error: 16711680
};

const kps = {};

function dEsc(input) {
    return input
        .replace('_', '\\_')
        .replace('*', '\\*')
        .replace('`', '\\`')
        .replace('~', '\\~');
}

function avatarUrl(user = {}) {
    return user.id && user.avatar ?
        `https://cdn.discordapp.com/avatars/${ user.id }/${ user.avatar }.png` :
        `https://cdn.discordapp.com/embed/avatars/${
            user.discriminator ? user.discriminator % 5 : Math.floor(Math.random() * 5)
        }.png`;
}

module.exports = {
    logger,
    pkg,
    timeOf,
    colors,
    kps,
    dEsc,
    config,
    avatarUrl,
};
