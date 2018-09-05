# GerpBot
GerpBot is a multi-purpose Discord bot.
## Invite the offical bot
- [GerpBot](https://discordapp.com/oauth2/authorize?client_id=388670149127045121&scope=bot&permissions=8):
Official version using master branch.
- [GB dev](https://discordapp.com/oauth2/authorize?client_id=423480559730163722&scope=bot&permissions=338783296):
Experimental development version using develop branch or one of the feature branches.

## Installation

### Requirements
- Node.js
- Discord bot account (recommended)
- Cairo (optional)
- Open port for web services (optional)

### Clone this repository
```bash
$ git clone https://github.com/Gerpiili369/GerpBot.git
```
Or [download](https://github.com/Gerpiili369/GerpBot/archive/master.zip) as a zip file.

### Install dependencies
Make sure you are in your `GerpBot` folder.
```bash
$ cd GerpBot
```
Now let's install.
```bash
$ npm i
```

### Add configuration file
Create `config.json` -file following the example below.
```json
{
    "saveSettings": true,
    "canvasEnabled": false,
    "web": {
        "root": "/discord",
        "host": "127.0.0.1",
        "port": 3000,
        "url": "http://localhost:3000/discord"
    },
    "auth": {
        "token": "<DISCORD-BOT-TOKEN-HERE>",
        "tubeKey": "<YOUTUBE-API-KEY-HERE>"
    }
}
```
- `saveSettings`: Enable/disable settings being updated to `settings.json`.
- `canvasEnabled`: Enable if you have [node-canvas](https://www.npmjs.com/package/canvas).
- `root`: "root" location for web server.
- `host` and `port`: Internal IP and port for web server.
- `url`: External address for web server.
- `token`: Discord bot token.
- `tubeKey`: YouTube API key. Required for playing music from YouTube.

### Install node-canvas (optional)
For canvas functionality you will need `node-canvas`. It is backed by [Cairo](http://cairographics.org/) which means it probably didn't install correctly when you were running `npm i`. Installation guide for `node-canvas` with Cairo can be found [here](https://www.npmjs.com/package/canvas). Don't forget to set `canvasEnabled` to `true` in your `config.json`!

### Start bot
```bash
$ node bot.js
```
You should soon see a message with your bot's username and ID.
