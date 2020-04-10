const discord = require("discord.js");
const config = require("./config.json");
const settings = require("./settings.json");
const client = new discord.Client({ partials: ["MESSAGE", "CHANNEL", "REACTION"]});

function handleCommand(message) {
    var rawMessage = message.content.substring(prefix.length);
    var args = rawMessage.split(" ");
    var action = args[0];
    if(settings.debug) {
        console.log(action);
        console.log(rawMessage);
    }
    switch (action) {
        case "game":
            var gameFilter = "**__"+rawMessage.substring(action.length).split("_").join("").split("*").join("").trim().toUpperCase()+"__**";
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
    reactionEvent(reaction_, user, false);
}

function removeReaction(reaction, user) {
    reactionEvent(reaction_, user, true);
}

function reactionEvent(reaction, user, remove) {
    if (user.bot) {
        return;
    }

    const { message, emoji } = reaction;

    if (emoji.id != settings.green_tick) {
        return;
    }

    var message_ = message.content;
    var userString = user.toString();
    var includes_ = message_.includes(userString);

    if (includes_ != remove) {
        return;
    }

    var newline = "\n";
    var result = remove ? message_.split(newline+userString).join("") : message_ + newline + userString;

    try {
        message.edit(result);
    } catch (error) {
        console.log(error.message);
    }

    if (settings.debug) {
        console.log("[EMOJI ID] "+emoji.id+" [EMOJI NAME] "+emoji.name);
    }
}

client.on("message", message => {
    if (message.channel.id == channel && message.content.substring(0, settings.prefix.length) == settings.prefix) {
        try {
            handleCommand(message);
        } catch (error) {
            console.log(error.message);
            if (message.content === settings.prefix+"dc") {
                client.destroy();
            }
        }
        return;
    }

    if (message.author.bot) {
        return;
    }
    message.delete();
});

client.on("ready", () => {
    console.log("Starting...");
    let channel = client.channels.fetch(settings.channel, true);
    channel.fetchMessages({ limit: 1024 }).then(channel => console.log(channel.messages.size));
});

client.on("messageReactionAdd", addReaction);
client.on("messageReactionRemove", removeReaction);
client.login(config.token);