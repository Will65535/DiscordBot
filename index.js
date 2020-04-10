const discord = require("discord.js");
const config = require("./config.json");
const client = new discord.Client({ partials: ["MESSAGE", "CHANNEL", "REACTION"]});
const channel = 697787610570948645;
const prefix = "~~";
const green_tick = "698194459661303850";
const red_tick = "698194479336914994";

function handleCommand(message) {
    var rawMessage = message.content.substring(2);
    var args = rawMessage.split(" ");
    var action = args[0];
    console.log(action);
    console.log(rawMessage);
    switch (action) {
        case "game":
            var gameFilter = "**__"+rawMessage.substring(4).split("_").join("").split("*").join("").toUpperCase()+"__**";
            message.channel.send(gameFilter).then(
                function (message) {
                    message
                        .react(message.guild.emojis.cache.get(green_tick))
                        .catch(() => console.error("Failed to react."));
                }
            ).catch(console.error);
            message.delete();
        break;
        case "dc":
        case "disconnect":
            message.delete();
            client.destroy();
        break;
        default:
            message.delete();
        break;
    }
}

function addReaction(reaction, user) {
    if (user.bot) {
        return;
    }

    const { message, emoji } = reaction;
    var message_ = message.content;

    if (emoji.id == green_tick && !message_.includes(user.toString())) {
        try {
            message.edit(message_ + "\n" + user.toString());
        } catch (error) {
            console.log(error.message);
        }
    }

    console.log("[EMOJI ID] "+emoji.id+" [EMOJI NAME] "+emoji.name);
}

function removeReaction(reaction, user) {
    if (user.bot) {
        return;
    }

    const { message, emoji } = reaction;
    var message_ = message.content;

    if (emoji.id == green_tick && message_.includes(user.toString())) {
        try {
            message.edit(message_.split("\n"+user.toString()).join(""));
        } catch (error) {
            console.log(error.message);
        }
    }

    console.log("[EMOJI ID] "+emoji.id+" [EMOJI NAME] "+emoji.name);
}

client.on("message", message => {
    if (message.channel.id == channel && message.content.substring(0, 2) == prefix) {
        try {
            handleCommand(message);
        } catch (error) {
            console.log("[ERROR] "+error.message);
            if (message.content === "~~dc") {
                client.destroy();
            }
        }
    } else {
        if (!message.author.bot) {
            return;
        }
        message.delete();
    }
});

client.on("messageReactionAdd", addReaction);
client.on("messageReactionRemove", removeReaction);
client.login(config.token);