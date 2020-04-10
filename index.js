const discord = require("discord.js");
const config = require("./config.json");
const settings = require("./settings.json");
const client = new discord.Client({ partials: ["MESSAGE", "CHANNEL", "REACTION"]});

function handleCommand(message) {
    var rawMessage = message.content.substring(settings.prefix.length);
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
                        .react(message.guild.emojis.cache.get(settings.green_tick))
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

async function addReaction(reaction, user) {
    reactionEvent(reaction, user, false);
}

async function removeReaction(reaction, user) {
    reactionEvent(reaction, user, true);
}

async function reactionEvent(reaction, user, remove) {
    if (user.bot) {
        return;
    }

    if (reaction.message.partial) {
        await reaction.message.fetch();
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

    result = validate(reaction, result);

    try {
        message.edit(result);
    } catch (error) {
        console.log(error.message);
    }

    if (settings.debug) {
        console.log("[EMOJI ID] "+emoji.id+" [EMOJI NAME] "+emoji.name);
    }
}

async function validate(reaction, message) {
    try {
        var content = message;
        var size = reaction.count - 1;
        var matches = (content.match(/<@/g) || []).length;

        if (matches == size) {
            return message;
        }

        var users = reaction.users.cache.array();
        var user;
        for (var index = 0; index < users.length; index++) {
            user = users[index];
            if (content.includes(user.toString())) {
                continue;
            }
            content += "\n" + user.toString();
            matches++;
            if (matches == size) {
                break;
            }
        }
        content = content.split("\n[object Object]").join("");
        if (settings.debug) {
            console.log("size: "+size);
            console.log("matches: "+matches);
            console.log("content: "+content);
        }
        return content;
    } catch (error) {
        console.log(error);
    }
    return message;
}

client.on("message", message => {
    if (message.channel.id == settings.channel && message.content.substring(0, settings.prefix.length) == settings.prefix) {
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
    try {
        let channel = client.channels.fetch(settings.channel, true);
        //channel.fetchMessages({ limit: 1024 }).then(channel => console.log(channel.messages.size));
    } catch (error) {
        console.log(error);
        client.destroy();
    }
});

client.on("messageReactionAdd", addReaction);
client.on("messageReactionRemove", removeReaction);
client.login(config.token);