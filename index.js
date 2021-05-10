const fs = require('fs');

class RuleManager {
	constructor() {
		this.rules = [];
	}
}

const ruleManager = new RuleManager();
ruleManager.rules.push(require('./rules/sounds/sounds'));

// Discord ////////////////////////////////////////////////////////////////////
const Discord = require('discord.js');
const discord_client = new Discord.Client();

discord_client.commands = new Discord.Collection();
const commandFolders = fs.readdirSync('./commands');
for (const folder of commandFolders) {
	const commandFiles = fs.readdirSync(`./commands/${folder}`).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const command = require(`./commands/${folder}/${file}`);
		discord_client.commands.set(command.name, command);
	}
}

discord_client.rules = new Discord.Collection();
const rulesFolders = fs.readdirSync('./rules');
for (const folder of rulesFolders) {
	const rulesFiles = fs.readdirSync(`./rules/${folder}`).filter(file => file.endsWith('.js'));
	for (const file of rulesFiles) {
		const rule = require(`./rules/${folder}/${file}`);
		discord_client.rules.set(rule.name, rule);
	}
}

discord_client.cooldowns = new Discord.Collection();
discord_client.defaultCooldown = 0;

/**
 * Read in config.json file
 */
const { prefix } = '!';

/**
 * Client is ready for processing
 */
discord_client.once('ready', () => {
	console.log('Discord Client Ready!');
});

discord_client.on('guildUpdate', (oldGuild, newGuild) => {
	console.log(oldGuild, newGuild);
	for (const rule of ruleManager.rules) {
		if (rule.updateGuild) rule.updateGuild(oldGuild, newGuild);
	}
});

discord_client.on('guildCreate', (guild) => {
	for (const rule of ruleManager.rules) {
		rule.addGuild(guild);
	}
});
/**
 * Process message.
 */
discord_client.on('message', message => {
	// Check not that the message is not this bot
	if (message.author.id == discord_client.user.id) {
		return;
	}

	for (const rule of ruleManager.rules) {
		rule.message(message);
	}

	// // Get the arguments of the message
	// const args = message.content.slice(prefix.length).trim().split(/ +/);

	// if (args.length === 0) processMessage(message);

	// // Get the command (first argument)
	// const cmd_string = args.shift().toLowerCase();

	// // Check if command or message
	// if (message.content.startsWith(prefix) && discord_client.commands.has(cmd_string)) {
	// 	processCommand(message);
	// } else {
	// 	processMessage(message);
	// }


});

/**
 * Log bot in
 */
discord_client.login(process.env.DISCORD_TOKEN);

// 						FUNCTIONS

/**
 * Processes a command from a message.
 * @param {Message} message message to be processed.
 */
function processCommand(message) {
	// Get the arguments of the message
	const args = message.content.slice(prefix.length).trim().split(/ +/);
	// Get the command (first argument)
	const cmd_string = args.shift().toLowerCase();

	const command = discord_client.commands.get(cmd_string);

	// Check if that command is guild only and we are not in DMs
	if (command.guildOnly && message.channel.type === 'dm') {
		return message.reply('I can\'t execute that command inside DMs!');
	}

	if (command.permissions) {
		const authorPerms = message.channel.permissionsFor(message.author);
		if (!authorPerms || !authorPerms.has(command.permissions)) {
			return message.reply('You can not do this!');
		}
	}

	// Get the cooldowns collection from client
	const { cooldowns } = discord_client;
	// Get the default cooldown
	const { defaultCooldown } = discord_client;

	// Check if the cooldowns collection has an instance of the command
	// otherwise, set it with the command name as the key and a discord as the collection
	if (!cooldowns.has(command.name)) {
		cooldowns.set(command.name, new Discord.Collection());
	}

	const now = Date.now();
	const timestamps = cooldowns.get(command.name);
	const cooldownAmount = (command.cooldown || defaultCooldown) * 1000;

	// Check if the timestamps contains an instance of the message author. e.g. has the author sent this command recently?
	if (timestamps.has(message.author.id)) {
		// Calculate expiration time
		const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

		if (now < expirationTime) {
			const timeLeft = (expirationTime - now) / 1000;
			return message.reply(`please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.name}\` command.`);
		}
	}

	// Add the message author to the timestamps for this command and the time it was received.
	timestamps.set(message.author.id, now);
	// delete the instance after the specified cooldown time.
	setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

	// Try to execute command.
	try {
		command.execute(message, args);
	} catch (error) {
		console.error(error);
		message.reply('There was an error executing that command!');
	}
	return;
}