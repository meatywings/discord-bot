const StringSearcher = require('../../StringSearcher.js');
const path = require('path');
const soundSearcher = new StringSearcher();
const database = require('../../db');

let guilds = {};
let sounds = {};
let triggers = {};


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
				default_sound boolean NOT NULL DEFAULT false,
				guild_id bigint DEFAULT null,
				CONSTRAINT sounds_pkey PRIMARY KEY (sound_id),
				CONSTRAINT fk_guild_id FOREIGN KEY (guild_id) REFERENCES public.guilds(guild_id)
			)`);

		// Copy in default sound data
		res = await database.querySync(`
			CREATE TEMP TABLE tmp_table
			ON COMMIT DROP
			AS
			SELECT *
			FROM public.sounds
			WITH NO DATA;

			COPY tmp_table FROM '${fileName}'
			WITH NULL '';

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
				guild_id bigint,
				default_trigger boolean DEFAULT false,
				CONSTRAINT triggers_pkey PRIMARY KEY (trigger_id),
				CONSTRAINT fk_sound_id FOREIGN KEY(sound_id) REFERENCES public.sounds(sound_id),
				CONSTRAINT fk_guild_id FOREIGN KEY(guild_id) REFERENCES public.guilds(guild_id)
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

			COPY tmp_table FROM '${fileName}'
			WITH NULL '';

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
				command_prefix text NOT NULL DEFAULT '!'
			)`);
		console.log(res);
	} catch (error) {
		console.log(error);
	}
}

async function loadSounds() {
	let obj = {};
	const result = await database.querySync(`
	SELECT * FROM public.sounds
	`);
	for (const sound of result.rows) {
		obj[sound.sound_id] = sound;
	}
	return obj;
}

async function loadTriggers() {
	let obj = {};
	const result = await database.querySync(`
	SELECT * FROM public.triggers
	`);
	for (const trigger of result.rows) {
		obj[trigger.trigger_id] = trigger;
	}
	return obj;
}

async function loadGuilds() {
	let obj = {};
	const result = await database.querySync(`
	SELECT * FROM public.guilds;
	`);
	for (const guild of result.rows) {
		obj[guild.guild_id] = guild;
	}
	return obj;
}

/**
 * Create the tables in the database
 */
async function _init() {
	await _createUUIDExtension();
	await _createGuildsTable();
	await _createSoundsTable();
	await _createTriggersTable();

	sounds = await loadSounds();
	triggers = await loadTriggers();
	guilds = await loadGuilds();
}

_init();

module.exports = {
	name: 'sounds',
	message: (message) => {
		console.log(message);
	},
	async addSound(guild, sound) {
		const result = await database.querySync(`
		DO $$
		DECLARE
			sid	UUID := uuid_generate_v4();
		BEGIN
			INSERT INTO public.sounds(sound_id, sound_name, sound_url)
			VALUES (sid, '${sound.name}', '${sound.url}' );
			INSERT INTO public.triggers(sound_id, trigger_key)
			VALUES (sid, '${sound.trigger}');
		END $$
		`);
		// Update local copy after succesful database save
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
			`DELETE FROM public.triggers * WHERE guild_id = ${guild.id}
			DELETE FROM public.sounds * WHERE guild_id = ${guild.id}
			DELETE FROM public.guilds * WHERE guild_id = ${guild.id}`);
	},
};