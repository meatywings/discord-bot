const StringSearcher = require('../../StringSearcher.js');

const db = require('../../db');

module.exports = {
	init_guild: (options) => {
		// Used when the bot is added to a new guild.
		// Creates new entry in 'guilds' table.
		// Populate entry with default sounds and triggers.
		console.log(options);
	},
	addSound: (options) => {
		const table = 'public.sounds';

		let defaults = {};
		defaults = Object.assign(defaults, {
			name: null,
			url: null,
		}, options);

		if (!defaults.name || !defaults.url) {
			console.error(`Missing arguements. Expected 2 arguments found ${0}.`);
			return;
		}

		if (typeof defaults.name !== 'string') {
			console.error(`name: ${defaults.name} was not a string. found type ${typeof defaults.name}.`);
			return;
		}

		if (typeof defaults.url !== 'string') {
			console.error(`url: ${defaults.url} was not a string. found type ${typeof defaults.url}.`);
			return;
		}

		db.query(`INSERT INTO ${table} (name, url) VALUES ('${defaults.name}', '${defaults.url}') ON CONFLICT (name) DO UPDATE SET name = excluded.name, url = excluded.url;`, null, (err, result) => {
			console.log(err ? err.stack : result.rowCount);
		});
	},
};