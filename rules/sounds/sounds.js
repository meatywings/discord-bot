const StringSearcher = require('../../StringSearcher.js');
const path = require('path');
const soundSearcher = new StringSearcher();
const database = require('../../db');


async function _createUUIDExtension() {
	try {
	// Create extension for generating UUIDs
		const res = await database.querySync(`
			CREATE EXTENSION IF NOT EXISTS "uuid-ossp"
				SCHEMA public
				VERSION "1.1";`);
	} catch (error) {
		console.log(`Error adding extensions to database. Error stack: ${err.stack}`);
	}
}

async function _createSoundsTable() {
	try {
		// Create sounds table if doesn't exist
		const fileName = path.resolve('./rules/sounds/default_sounds.csv');
		let res = await database.querySync(`
			CREATE TABLE IF NOT EXISTS public.sounds
			(
				sound_id uuid NOT NULL DEFAULT uuid_generate_v4(),
				sound_name text COLLATE pg_catalog."default",
				sound_url text COLLATE pg_catalog."default" NOT NULL,
				default_trigger_key boolean NOT NULL DEFAULT false,
				CONSTRAINT sounds_pkey PRIMARY KEY (sound_id)
			)`);

		// Copy in default sound data
		res = await database.querySync(`
			CREATE TEMP TABLE tmp_table
			ON COMMIT DROP
			AS
			SELECT *
			FROM public.sounds
			WITH NO DATA;

			COPY tmp_table FROM '${fileName}';

			INSERT INTO public.sounds
			SELECT *
			FROM tmp_table
			ON CONFLICT DO NOTHING`);
	} catch (error) {
		console.log(error.stack);
	}
}

async function _createTriggersTable() {
	try {
		const fileName = path.resolve('./rules/sounds/default_triggers.csv');
		// Create triggers table if doesn't exist
		let res = await database.querySync(`
			CREATE TABLE IF NOT EXISTS public.triggers
			(
				trigger_id uuid NOT NULL DEFAULT uuid_generate_v4(),
				trigger_key text COLLATE pg_catalog."default" NOT NULL,
				sound_id uuid,
				CONSTRAINT triggers_pkey PRIMARY KEY (trigger_id)
			)`);
		console.log(res);

		// Copy in default triggers data
		res = await database.querySync(`
			CREATE TEMP TABLE tmp_table
			ON COMMIT DROP
			AS
			SELECT *
			FROM public.triggers
			WITH NO DATA;

			COPY tmp_table FROM '${fileName}';

			INSERT INTO public.triggers
			SELECT *
			FROM tmp_table
			ON CONFLICT DO NOTHING`);
		console.log(res);
	} catch (error) {
		console.log(error.stack);
	}
}

async function _createGuildsTable() {
	try {
		// Create guilds table if doesn't exist
		const res = await database.querySync(
			`CREATE TABLE IF NOT EXISTS public.guilds 
			(
				guild_id bigint PRIMARY KEY NOT NULL,
				guild_name text NOT NULL,
				guild_sounds uuid[],
				triggers uuid[],
				command_prefix text NOT NULL DEFAULT '!'
			)`);
		console.log(res);
	} catch (error) {
		console.log(error);
	}
}

/**
 * Create the tables in the database
 */
async function _init() {

	await _createUUIDExtension();
	_createSoundsTable();
	_createTriggersTable();
	_createGuildsTable();

}

_init();

module.exports = {
	name: 'sounds',
	message: (message) => {
		console.log(message);
	},
	addSound: () => {
		const table = 'public.sounds';
		console.log(table);
	},
	async addGuild(guild) {

		const result = database.querySync(
			`INSERT INTO public.guilds(guild_id, guild_name) 
			VALUES(${guild.id}::bigint, '${guild.name}')
			ON CONFLICT (guild_id)
			DO
			UPDATE SET guild_name = EXCLUDED.guild_name`);
		console.log(result);
	},
	async updateGuild(oldGuild, newGuild) {
		this.addGuild(newGuild);
	},
	async guildDelete(guild) {
		const result = database.querySync(
			`DELETE FROM public.guilds * WHERE guild_id = ${guild.id}`);
	},
};