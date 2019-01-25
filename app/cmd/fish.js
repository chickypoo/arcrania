let sql = require("./method/connect.js");
let time = require("../config/action.json");
const talked = new Set();

module.exports.run = (bot, msg, arg) => {
	let user_id = String(msg.author.id);

	let db, skip = false, field, player_loc, skill_level;

	sql.database_connect().then(con => {
		db = con;
		return db.query(`SELECT player_act, location FROM player_info WHERE player_id = '${user_id}'`);
	}).then(rows => {
		//Player not found in the world
		if(!rows[0]) {
			db.end();
			skip = true;
			return;
		}
		if(!(rows[0].player_act == 'free' || rows[0].player_act == 'fishing')) {
			//Player are not able to fish
			msg.reply('You do not have the time to fish now. Please try again when you are free');
			db.end();
			skip = true;
			return;
		}
		//Player found in the world, checks if player is still fishing
		player_loc = rows[0].location;
		return db.query(`SELECT TIMEDIFF(expiry, CURRENT_TIMESTAMP()) as expires FROM timer WHERE player_id = '${user_id}' AND what = 'fishing'`);
	}).then(results => {
		if(skip) return;

		if(!results[0]) {
			//Player is not on fishing cooldown.
			//Find where player is and the place's fishing level
			field = require(`../config/field/${player_loc}.json`);
			//Fetch player's fishing level
			return db.query(`SELECT * FROM player_life_skill WHERE player_id = '${user_id}'`);
		} else {
			//Player is still on fishing cooldown; player is fishing still.
			msg.reply(`You still have ${timestamp_format(results[0].expires)} left until you finish fishing.`);
			skip = true;
			db.end();
			return;
		}
	}).then(result => {
		if(skip) return;

		if(!result[0]){
			//Player has not initialize a table yet.
			skill_level = 1;
			return db.query(`INSERT INTO player_life_skill (player_id) VALUES ('${user_id}')`);
		} else {
			//Player has a table already and grab user's fishing level
			skill_level = result[0].fishing_level;
		}
	}).then(() => {
		if(skip) return;

		//Checks if player's fishing level is sufficient in the current zone.
		if(skill_level >= field.fishing) {
			if(talked.has(user_id)) {
				msg.reply(`You entered this command too fast. There is a 2 seconds cooldown for this command: \`${bot_setting.prefix}${this.help.name}\``);
				skip = true;
				return db.end();
			} else {
				talked.add(user_id);
				setTimeout(() => {
					talked.delete(user_id);
					}, 2000);
			}
			if(field.fishing == 0) {
				msg.reply(`There is no fishing spot in this area.`);
				skip = true;
				return db.end();
			}
			//Starts fishing timer
			return db.query(`INSERT INTO timer VALUES ('${user_id}', TIMESTAMPADD(SECOND, ${file_to_second(time.fishing)}, CURRENT_TIMESTAMP()), 'fishing')`);
		} else {
			//Player does not have enough fishing level to fish here
			msg.reply(`You do not have high enough fishing level. (${player_loc}'s minimum fishing level is ${field.fishing})`);
			skip = true;
			return db.end();
		}
	}).then(() => {
		if(skip) return;

		//Change player's state into fishing
		msg.reply(`You have begun fishing in ${player_loc} for ${convert_time_from_to('second', 'minute', file_to_second(time.fishing))} minutes.`);
		return db.query(`UPDATE player_info SET player_act = 'fishing' WHERE player_id = '${user_id}'`);
	}).then(() => {
		if(skip) return;
		return db.end();
	}).catch(err => {
		if(db && db.end) db.end();
		console.log(err);
	});
}

const timestamp_format = data => {
	let times = data.split(':');
	let hour = parseInt(times[0]), minute = parseInt(times[1]), second = parseInt(times[2]);
	return `${(hour ? `${hour} hours ` : ``)}${(minute ? `${minute} minutes ` : ``)}${(second ? `${second} seconds` : ``)}`;
}

const file_to_second = data => {
	let total_seconds;
	total_seconds = data.second + data.minute * 60 + data.hour * 3600;
	return total_seconds;
}

const convert_time_from_to = (a, b, value) => {
	//This will round down.
	//Convert value of a down to second
	if(a == 'hour')
		value *= 3600;
	if(a == 'minute')
		value *= 60;
	//Convert back to b and return
	return (b == 'hour' ? value / 3600 : (b == 'minute') ? value / 60 : value);
}

module.exports.help = {
	"name" : "fish"
}