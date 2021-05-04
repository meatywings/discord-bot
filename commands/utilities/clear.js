module.exports = {
	name: 'clear',
	description: 'Clear all messages in channel',
	guildOnly: true,
	permissions: 'MANAGE_MESSAGES',
	cooldown: 1,
	execute(message, args) {
		if (!message.channel.isText()) return;

		const msg_manager = message.channel.messages;
		const text_channel = message.channel;

		msg_manager.fetch().then((msgs) => {
			text_channel.bulkDelete(msgs);
		});
	},
};