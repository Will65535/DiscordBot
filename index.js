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
            var roleName = gameFilter.split("**__")[1].split("__**")[0];
            roleName = roleName.toLowerCase().split(" ").map(word => word[0].toUpperCase() + word.substring(1)).join(" ");
            message.channel.send(gameFilter).then(
                function (message) {
                    message
                        .react(message.guild.emojis.cache.get(settings.green_tick))
                        .catch(() => console.error("Failed to react."));
                }
            ).then(() => console.log("Added game "+gameFilter)).catch(console.error);
            createChannelFromRole(message.guild, roleName);
            message.delete();
        break;
        case "output":
            message.guild.channels.cache.each((channel) => {
                console.log("Channel Name: "+channel.name);
                console.log("Channel Parent: "+channel.parentID);
            });
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

/*** gets role by name, creates if absent ***/
async function fetchRole(guild, roleName) {
    var roleManager = guild.roles;
    var role = roleManager.cache.find(role => role.name == roleName);
    if (role == undefined) {
        role = await roleManager.create({
            data: {
                name: roleName
            }   
        });
        console.log("Created role "+roleName);
    }
    return role;
}

async function createChannelFromRole(guild, roleName) {
    var channelManager = guild.channels;

    var channelName = roleName.toLowerCase().split(" ").join("-");
    var role = await fetchRole(guild, roleName);

    channelManager.create(channelName, {
        permissionOverwrites: [
            {
                id: guild.roles.everyone.id,
                deny: ['VIEW_CHANNEL']
            },
            {
                id: role.id,
                allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY']
            }
        ]
    }).then(
        channel => channel.setParent(settings.text_channel_parent)
    ).then(() => console.log("Added channel "+channelName)).catch(console.error);
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

    /*** update & validate */
    result = await validate(reaction, message, message_, result);
    result = result.split("\n[object Object]").join("");

    /*** role managing ***/
    await manageRole(user, message, message_, remove);

    message.edit(result).catch(console.log);

    if (settings.debug) {
        console.log("[EMOJI ID] "+emoji.id+" [EMOJI NAME] "+emoji.name);
    }
}

async function manageRole(user, message, message_, remove) {
    try {
        var guild = message.guild;

        var title = message_.split("**__")[1].split("__**")[0];
        title = title.toLowerCase().split(" ").map(word => word[0].toUpperCase() + word.substring(1)).join(" ");

        var role = fetchRole(guild, title);
        if (role != undefined) {
            var member = guild.member(user);
            if (remove) {
                member.roles.remove(role).then(member => console.log("Removed role " + role.name + " from " + member.displayName)).catch(console.log);
            } else {
                member.roles.add(role).then(member => console.log("Added role " + role.name + " to " + member.displayName)).catch(console.log);
            }
        }
    } catch (error) {
        console.log(error.message);
    }
}

async function validate(reaction, messageObject, messageContents, message) {
    try {
        if (reaction.partial) {
            await reaction.fetch();
        }

        var content = message;
        var size = reaction.count - 1;
        var matches = (content.match(/<@/g) || []).length;

        if (matches == size) {
            return message;
        }

        var users = await reaction.users.fetch();
        users = users.array();
        var user;
        for (var index = 0; index < users.length; index++) {
            user = users[index];
            if (!user || content.includes(user.toString()) || user.bot) {
                continue;
            }
            await manageRole(user, messageObject, messageContents, false);
            content += "\n" + user.toString();
            matches++;
            if (matches == size) {
                break;
            }
        }
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

/*** assumes users who can add games are admin ***/
//TODO no overwrites
async function onMessageDelete(message) {
    if (message.partial) {
        await message.fetch();
    }

    if (!message.author.bot) {
        return;
    }

    var message_ = message.content;

    var title = message_.split("**__")[1].split("__**")[0];
    title = title.toLowerCase().split(" ").map(word => word[0].toUpperCase() + word.substring(1)).join(" ");

    var guild = message.guild;
    var roleManager = guild.roles;
    var role = roleManager.cache.find(role => role.name == title);

    var channelManager = guild.channels;
    var channelName = title.toLowerCase().split(" ").join("-");
    var channel = await channelManager.cache.find(channel => channel.name == channelName);

    console.log("Deleted game " + title);
    if (role) {
        await role.delete().then(role => console.log("Deleted role " + role.name)).catch(console.log);
    }
    if (channel) {
        await channel.delete().then(channel => console.log("Deleted channel " + channel.name)).catch(console.log);
    }
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
client.on("messageDelete", onMessageDelete);
client.login(config.token);