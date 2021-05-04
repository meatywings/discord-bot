module.exports = {
	name: 'ping',
	description: 'Ping command',
	guildOnly: true,
	cooldown: 0,
	execute(message, args) {
		message.channel.send('Pong.');
	},
};