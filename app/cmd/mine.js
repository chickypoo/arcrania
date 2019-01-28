let sql = require('./method/connect.js');
let fx = require('./method/modules.js');
let mining_stat = require('../config/status.json').mining;
const mine_talked = new Set();

module.exports.run = async (bot, msg, arg) => {
	let user_id = msg.author.id;

	let db, skip, loc, act, res_id, mining;

	sql.database_connect().then(con => {
		db = con;
		//Find player's status and location
		return db.query(`SELECT player_act, location FROM player_info WHERE player_id = '${user_id}'`);
	}).then(res => {
		if(!res[0]) {
			//Player does not exists
			skip = true;
			return;
		}
		act = res[0].player_act;
		if(!(act == 'free' || act == 'mining' || act == 'fishing' || act == 'woodcutting')) {
			//Player are not able to mine
			msg.reply(`You do not have the time to mine now. Please try again when you are free. (You are currently ${act})`);
			skip = true;
			return;
		}
		loc = res[0].location;
		//Checks if player is already fishing/mining/woodcutting
		return db.query(`SELECT TIMEDIFF(expiry, CURRENT_TIMESTAMP()) as expires FROM timer WHERE player_id = '${user_id}' AND what IN ('fishing','mining','woodcutting')`);
	}).then(res => {
		if(skip) return;
		if(res[0]) {
			//Player is still on mining cooldown; player is mining still.
			msg.reply(`You still have ${timestamp_format(res[0].expires)} left until you finish ${act}.`);
			skip = true;
			return;
		}
		if(mine_talked.has(user_id)) {
			msg.reply(`You entered this command too fast. There is a 2 seconds cooldown for this command: \`${bot_setting.prefix}${this.help.name}\``);
			skip = true;
			return;
		} else {
			mine_talked.add(user_id);
			setTimeout(() => {
				mine_talked.delete(user_id);
			}, 2000);
		}
		//Checks if theres any more rocks in the current location
		return db.query(`SELECT resource_id FROM field_resource WHERE type = 'rock' AND location = '${loc}' AND durability > 0`);
	}).then(res => {
		if(skip) return;
		if(!res[0]) {
			//There is no more rock resource in current location.
			msg.reply(`All the rock minerals has been depleted in ${loc}. Please try again later or go to different location.`);
			skip = true;
			return;
		}
		//Roll a random rock from the list
		res_id = fx.random(0, res.length - 1);
		//Fetch player's mining skill
		return db.query(`SELECT mining_level FROM player_life_skill WHERE player_id = '${user_id}'`);
	}).then(res => {
		if(skip) return;
		if(!res[0]) {
			//Create a new lifeskill for player
			mining = 1;
			return db.query(`INSERT INTO player_life_skill (player_id) VALUES ('${user_id}')`);
		}
		//Saves the mining level of player
		mining = res[0].mining_level;
		return;
	}).then(() => {
		if(skip) return;
		//Calculate the mining damage off of mining level and player's passive skill tree
		let dmg = mining_damage(mining);
		//Checks if it pass the threshold of the rock.
		let threshold = require(`../config/field/${loc}.json`).mining_threshold;
		//Mine the rock
		return db.query(`UPDATE field_resource SET durability = durability - ${dmg >= threshold}, last_mined = ${(dmg >= threshold) ? `'${user_id}'` : `NULL`} WHERE resource_id = ${res_id}`);
	}).then(() => {
		if(skip) return;
		//Put player into a timer.
		return db.query(`INSERT INTO timer VALUES ('${user_id}', TIMESTAMPADD(MINUTE, 5, CURRENT_TIMESTAMP()), 'mining')`);
	}).then(() => {
		if(skip) return;
		//Change player status to mining
		msg.reply(`You have begun mining in ${loc} for 5 minutes`);
		return db.query(`UPDATE player_info SET player_act = 'mining' WHERE player_id = '${user_id}'`);
	}).then(() => {
		//Close database connection
		return db.end();
	}).catch(e => {
		if(db && db.end) db.end();
		console.log(e);
	})
}

const mining_damage = (level, skill = null) => {
	let dmg = Math.floor(mining_stat.base + level * mining_stat.inc)
	return dmg;
}

const timestamp_format = data => {
	let times = data.split(':');
	let hour = parseInt(times[0]), minute = parseInt(times[1]), second = parseInt(times[2]);
	return `${(hour ? `${hour} hours ` : ``)}${(minute ? `${minute} minutes ` : ``)}${(second ? `${second} seconds` : ``)}`;
}

module.exports.help = {
	"name" : "mine"
}