const
    Releases = require('./releases'),
    Command = require('./command');

class Changes extends Command {
    command() {
        const releases = new Releases(this.bot, this.params);
        releases.args.splice(1);
        releases.execute();
    }
}

module.exports = Changes;
