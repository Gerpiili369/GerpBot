const fs = require('fs');

fs.writeFile('./config.json', JSON.stringify({
    auth: {
        token: process.env.TOKEN,
    },
    test: {
        token: process.env.TESTERTOKEN,
        botID: process.env.BOTID,
        serverID: process.env.SERVERID
    }
}, null, 4), err => console.error(err));