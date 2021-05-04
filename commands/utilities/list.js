module.exports = {
	name: 'list',
	description: 'list',
	guildOnly: true,
	cooldown: 1,
	execute(message, args) {
		if (!message.channel.isText()) return;

		let text = `List ${args[0]}:\n`;
		for (let i = 0; i < args[1].length; i++) {
			text = `${text}\n${args[1][i]}`;
		}

		message.channel.send(text);
	},
};