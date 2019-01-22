let sql = require("./method/connect.js");
let _stat = require("../config/status.json");

module.exports.run = async (bot, msg, arg) => {
	let user_id = String(msg.author.id);

	let db, player, row, reply, skip = false;

	sql.database_connect().then(con => {
		db = con;
		return db.query(`SELECT player_id FROM player_info WHERE player_id = '${user_id}'`);
	}).then(rows => {
		//Player not found in the world
		if(!rows[0]) {
			db.end();
			skip = true;
			return;
		}
		//Player found in the world, fetch player's stat data
		return db.query(`SELECT * FROM player_stat WHERE player_id = '${user_id}'`);
	}).then(rows => {
		if(skip) return;
		//New player, create a blank stat page
		if(!rows) {
			player = new Player();
			return db.query(`INSERT INTO player_stat (player_id) VALUES ('${user_id}')`);
		}
		//Player exists.
		row = rows[0];
		player = new Player(row.exp, row.power, row.might, row.focus, row.stamina, row.arcane, row.balance);
	}).then(() => {
		if(skip) return;
		reply = `<@${user_id}>\n\`\`\`${format_stat_output(player)}\`\`\``;
		msg.channel.send(reply);
		return db.end();
	}).catch(err => {
		if(db && db.end) db.end();
		console.log(err);
	});
}

function Player(exp = 0, power = 0, might = 0, focus = 0, stamina = 0, arcane = 0, balance = 0) {
	this.exp = exp;
	this.power = power;
	this.might = might;
	this.focus = focus;
	this.stamina = stamina;
	this.arcane = arcane;
	this.balance = balance;
}

const format_stat_output = data => {
	let str = ``;
	str += `Experience: ${data.exp}\n`;
	str += `Power:   ${format_shift_left(data.power, 8)}\n`;
	str += `Might:   ${format_shift_left(data.might, 8)}\n`;
	str += `Focus:   ${format_shift_left(data.focus, 8)}\n`;
	str += `Stamina: ${format_shift_left(data.stamina, 8)}\n`;
	str += `Arcane:  ${format_shift_left(data.arcane, 8)}\n`;
	str += `Balance: ${format_shift_left(data.balance, 8)}\n\n`;
	str += `Health: ${format_shift_left(Math.floor(_stat.basic.max_health +
	  _stat.power.max_health * data.power +
	  _stat.might.max_health * data.might + 
	  _stat.stamina.max_health * data.stamina + 
	  _stat.balance.max_health * data.balance),
	  9)}\n`;
	str += `Mana: ${format_shift_left(Math.floor(_stat.basic.max_mana +
		_stat.arcane.max_mana * data.arcane +
		_stat.balance.max_mana * data.balance),
		9)}\n`;
	str += `Damage: ${Math.floor(_stat.basic.min_attack +
		_stat.power.min_attack * data.power +
		_stat.balance.min_attack * data.balance)} ~ ${Math.floor(_stat.basic.max_attack +
		_stat.power.max_attack * data.power +
		_stat.might.max_attack * data.might +
		_stat.balance.max_attack * data.balance)}\n`;
	str += `Critical Damage: ${_stat.basic.critical_percent}% | ${Math.floor(_stat.basic.critical +
		_stat.might.critical * data.might +
		_stat.focus.critical * data.focus +
		_stat.balance.critical * data.balance)}\n`;
	str += `Penetration: ${_stat.basic.penetration + _stat.focus.penetration * data.focus}\n`;
	str += `Magic: ${_stat.basic.magic + Math.floor(_stat.arcane.magic * data.arcane +
		_stat.balance.magic * data.balance)}`;
	return str;
}

const format_shift_left = (value, length) => {
	return value.toString().padStart(Math.min(value.toString().length, length), ' ');
}

module.exports.help = {
	"name" : "stat"
}