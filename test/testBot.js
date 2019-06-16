const
    cp = require('child_process'),
    EventEmitter = require('events');

class TestBot extends EventEmitter {
    constructor(id, tester) {
        super();
        this.id = id;

        const node = cp.spawn('node', ['.']);

        node.stdout.on('data', data => {
            if (data.indexOf('ready for world domination!') > -1)
                this.emit('ready', data);
            if (data.indexOf('Disconnected!') > -1)
                this.emit('disconnect', data);
        });

        node.stderr.on('data', data => {
            this.emit('error', data);
            throw new Error(data);
        });

        node.on('close', code => {
            throw new Error(`bot exited with code ${ code }`);
        });

        tester.on('message', (user, userID, channelID, message, evt) => {
            if (userID == this.id) this.emit(channelID, user, userID, channelID, message, evt);
        });
    }
}

module.exports = TestBot;
