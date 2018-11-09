const
    isUrl = require('is-url'),
    logger = require('winston'),
    config = require('../config')

logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {
    colorize: true,
    timestamp: true
});
logger.level = 'debug';

const colors = {
    gerp: 16738816,     // GerpOrange
    error: 16711680     // ErrorRed
}

module.exports = {
    logger,
    colors,
    config,
}
