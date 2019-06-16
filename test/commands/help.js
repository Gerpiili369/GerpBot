/* eslint-disable func-names */
const
    { should, expect } = require('chai'),
    help = require('../../objectLib/help');

should();

module.exports = commandSuite => {
    const commands = Object.keys(help);

    describe('Response to help -command', function() {
        commandSuite('help', values => {
            it('doesn\'t contain a message', () => {
                values.res.message
                    .should.equal('');
            });

            it('does contain an embed', () => {
                values.res.evt.d.embeds
                    .should.have.lengthOf(1);
            });
            it('embed has description', () => expect(values.res.evt.d.embeds[0].description).to.exist);
            it('embed has thumbnail', () => expect(values.res.evt.d.embeds[0].thumbnail).to.exist);
            it('embed has fields', () => {
                values.res.evt.d.embeds[0]
                    .should.property('fields').with.length.above(0);
            });
        });

        for (const command of commands) {
            commandSuite(`help ${ command }`, values => {
                it('doesn\'t contain a message', () => {
                    values.res.message
                        .should.equal('');
                });

                it('does contain an embed', () => {
                    values.res.evt.d.embeds
                        .should.have.lengthOf(1);
                });

                it('embed has descripion', () => expect(values.res.evt.d.embeds[0].thumbnail).to.exist);
                it('embed has thumbnail', () => expect(values.res.evt.d.embeds[0].thumbnail).to.exist);

                it('has correct title', () => {
                    const embed = values.res.evt.d.embeds[0];
                    switch(command) {
                        case 'main':
                            embed.title
                                .should.equal('GerpBot');
                            break;
                        case 'files':
                            embed.title
                                .should.contain('filetypes');
                            break;
                        default:
                            embed.title
                                .should.equal(`Help for \`${ command }\` -command`);
                    }
                });
            });
        }
    });
};
