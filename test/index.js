/* eslint-disable no-invalid-this */
/* eslint-disable func-names */
const
    Discord = require('discord.io'),
    TestBot = require('./testBot'),
    testHelp = require('./commands/help'),
    common = require('../scripts/common'),
    { token, botID, serverID } = common.config.test,
    tester = new Discord.Client({ token }),
    testBot = new TestBot(botID, tester);

describe('Initialize', () => {
    it('tester is ready', function (done) {
        this.timeout(5000);
        new Promise((resolve, reject) => tester
            .on('disconnect', reject)
            .on('ready', resolve)
        )
            .then(() => done())
            .catch(done);

        tester.connect();
    });

    it('bot is ready', function (done) {
        this.timeout(5000);
        new Promise((resolve, reject) => testBot
            .on('disconnect', reject)
            .on('ready', resolve)
        )
            .then(() => done())
            .catch(done);
    });
});


describe('Test commands', () => {
    testHelp(commandSuite);
});

function commandSuite(command, tests) {
    describe(command, function () {
        const values = {};

        before('execute command and get response', function (done) {
            this.timeout(10000);

            tester.createChannel({
                serverID,
                name: `test help`,
            }, (err, res) => {
                if (err) done(err);
                else {
                    values.channelID = res.id;

                    testBot.once(values.channelID, (user, userID, channelID, message, evt) => {
                        values.res = {
                            user,
                            userID,
                            channelID,
                            message,
                            evt,
                        };
                        done();
                    });
                    tester.sendMessage({
                        to: values.channelID,
                        message: `<@${ botID }> ${ command }`
                    }, err => {
                        if (err) done(err);
                    });
                }
            });
        });

        it('is from the bot', () => {
            values.res.userID
                .should.equal(botID);
        });

        tests(values);

        after('remove test channel', done => {
            tester.deleteChannel(values.channelID, done);
        });
    });
}
