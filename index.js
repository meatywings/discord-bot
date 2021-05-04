const fs = require('fs');

const https = require('https');

const dotenv = require('dotenv');
dotenv.config();

const Discord = require('discord.js');
const client = new Discord.Client();

/**
 * Load commands from commands folder
 */
client.commands = new Discord.Collection();
const commandFolders = fs.readdirSync('./commands');
for (const folder of commandFolders) {
	const commandFiles = fs.readdirSync(`./commands/${folder}`).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const command = require(`./commands/${folder}/${file}`);
		client.commands.set(command.name, command);
	}
}

const sounds = require('./sounds.json');
// Map aliases to the equivalent sound
Object.keys(sounds).forEach(key => {
	const sound = sounds[key];
	if (Array.isArray(sound.aliases)) {
		sound.aliases.forEach(alias => sounds[alias] = sound);
	}
});

// Create StringSearcher and load the sounds into it
const StringSearcher = require('./StringSearcher.js');
StringSearcher.load(Object.keys(sounds));

/**
 * Cooldowns - stop people spamming shit
 */
client.cooldowns = new Discord.Collection();
client.defaultCooldown = 0;


/**
 * Read in config.json file
 */
const { prefix } = require('./config.json');

/**
 * Client is ready for processing
 */
client.once('ready', () => {
	console.log('Ready!');
});

/**
 * Process message.
 */
client.on('message', message => {
	// Check not that the message is not this bot
	if (message.author.id == client.user.id) {
		return;
	}

	if (message.member.voice.channel) {
		const matches = StringSearcher.search(message.content);
		if (matches.length > 0) {
			playAudio(message, sounds[matches[0].toLowerCase()]);
		}
	}

	// Get the arguments of the message
	const args = message.content.slice(prefix.length).trim().split(/ +/);

	if (args.length === 0) processMessage(message);

	// Get the command (first argument)
	const cmd_string = args.shift().toLowerCase();

	// Check if command or message
	if (message.content.startsWith(prefix) && client.commands.has(cmd_string)) {
		processCommand(message);
	} else {
		processMessage(message);
	}


});

/**
 * Log bot in
 */
client.login(process.env.DISCORD_TOKEN);

// 						FUNCTIONS

/**
 * Plays an audio file.
 * @param {Message} message The message that caused the audio file to be played.
 * @param {string} audio_file path to the audio file
 * @todo I want to make this search the message for a list of words that correlate to
 * audio files. If the user that sent the message is in a voice chat, the bot will join
 * the chat and play the audio file corresponding to the word. Will probably on make it play
 * the first word found because then it would just keep playing a heap of audio clips.
 */
async function playAudio(message, sound) {
	const audio_file = sound.location;
	try {
		if (sound.type == 'local' && !fs.existsSync(audio_file)) {
			return;
		}
	} catch (error) {
		console.error(error);
	}

	const connection = await message.member.voice.channel.join();

	const dispatcher = connection.play(audio_file);
	dispatcher.on('start', () => {
		console.log('audio file is now playing!');
	});

	dispatcher.on('finish', () => {
		console.log('audio file has finished playing!');
		console.log('disconnecting');
		connection.disconnect();
	});

	// Always remember to handle errors appropriately!
	dispatcher.on('error', console.error);
}

/**
 * Processes a command from a message.
 * @param {Message} message message to be processed.
 */
function processCommand(message) {
	// Get the arguments of the message
	const args = message.content.slice(prefix.length).trim().split(/ +/);
	// Get the command (first argument)
	const cmd_string = args.shift().toLowerCase();

	const command = client.commands.get(cmd_string);

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
	const { cooldowns } = client;
	// Get the default cooldown
	const { defaultCooldown } = client;

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
		if (command.name == 'list' && args[0].trim().toLowerCase() === 'sounds') {
			args.splice(1, 0, StringSearcher.strings);
		}
		command.execute(message, args);
	} catch (error) {
		console.error(error);
		message.reply('There was an error executing that command!');
	}
	return;
}

/**
 * Process a message that was received in the chat
 * @param {Message} message A discord Message Object to be processed
 * @todo I want to make this process a list of rules in the 'rules' folder.
 * I don't know how that will work yet though.
 */
function processMessage(message) {
	if ((/fuck/gmi).test(message.content)) {
		const edit = message.content.replace(/fuck/gmi, '\\*\\*\\*\\*');
		message.reply(`Watch your profanities '${edit}'`).then(message.delete());
	}
	return;
}