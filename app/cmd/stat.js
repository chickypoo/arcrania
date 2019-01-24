let sql = require("./method/connect.js");
let _stat = require("../config/status.json");
let bot_setting = require("../config/bot.json");

const talked = new Set();

module.exports.run = async (bot, msg, arg) => {
	let user_id = String(msg.author.id);

	let db, db2, player, row, reply, skip = false, statSQL;

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
			if(arg && arg.length == 0) {
			//Only output player's status page
			reply = `<@${user_id}>\n\`\`\`css\n${format_stat_output(player)}\`\`\``;
			msg.channel.send(reply);
			skip = true;
			return db.end();
		} else if(arg && valid_allocation(arg[0]) && (arg.length == 1 || (!isNaN(arg[1]) && arg[1] > 0))) {
			//Adds Status if possible and enough experience points
			let add = (arg.length > 1 ? arg[1] : 1), needed_exp = player.exp_needed(arg[0], _stat.base, _stat.inc, _stat.multi, add);
			//Calculates how much experience is required.
			if(player.exp >= needed_exp) {
				//Checks if user talked recently
				if(talked.has(user_id)) {
					msg.reply(`You entered this command too fast. There is a 10 seconds cooldown for this command: \`${bot_setting.prefix}${this.help.name} [attribute]\``);
				} else {
					talked.add(user_id);
					setTimeout(() => {
						talked.delete(user_id);
					}, 10000);
					//Player has enough experience to upgrade. Do an emoji poll to confirm.
					const filter = (reaction, user) => {
						return ['✅', '❎'].includes(reaction.emoji.name) && user.id === user_id;
					};
					msg.channel.send(`\`\`\`css\nIt will cost [${needed_exp} Experience Points] to raise [${arg[0].toLowerCase()}] by ${add}.\nReact with a ✅ to [confirm] or ❎ to [decline].\nYou have up to 10 seconds to decides.\`\`\``)
						.then(poll => {
							poll.react('✅')
								.then(() => poll.react('❎'))
								.catch(() => console.error('Failed to attach emoji to allocation message'));

								poll.awaitReactions(filter, {max: 1, time: 10000, error: ['time']})
									.then(c => {
										if(c.first().emoji.name === '✅') {
											//Player confirms with the selection
											msg.reply(`\`\`\`css\nYour [${arg[0].toLowerCase()}] has increased by ${add}!\n${player.getStat(arg[0].toLowerCase())} -> ${player.getStat(arg[0].toLowerCase()) + add}\`\`\``);
											statSQL = `UPDATE player_stat SET exp = exp - ${needed_exp}, ${arg[0].toLowerCase()} = ${player.getStat(arg[0].toLowerCase()) + add} WHERE player_id = '${user_id}'`;
											sql.database_connect().then(con => {
												con.query(statSQL);
												con.end();
											})
											.catch(err => {
												console.log(err);
											});
										} else {
											//Player declines with the selection
										}
									})
									.catch(() => {
										msg.reply(`\`\`\`You did not vote. No changes made.\`\`\``);
										skip = true;
									});
						})
						.catch(() => console.error('Allocation message error'));
				}
			} else {
				//Player does not have enough experience to upgrade that amount.
				msg.reply(`\`\`\`css\nYou do not have enough [Experience Points]. (Needed ${needed_exp - player.exp} more Experience Points)\`\`\``);
			}
			skip = true;
			return db.end();
		}
	}).catch(err => {
		if(db && db.end) db.end();
		console.log(err);
	});
}

const valid_allocation = str => {
	const valid = {power: 0, might: 1, focus: 2, stamina: 3, arcane: 4, balance: 5};
	return (str.toString().toLowerCase() in valid);
}

class Player {
	constructor(exp = 0, power = 0, might = 0, focus = 0, stamina = 0, arcane = 0, balance = 0) {
		this.exp = exp;
		this.power = power;
		this.might = might;
		this.focus = focus;
		this.stamina = stamina;
		this.arcane = arcane;
		this.balance = balance;
	}

	map_player_to_map() {
		let map = new Map();
		map.set('power', this.power)
			.set('might', this.might)
			.set('focus', this.focus)
			.set('stamina', this.stamina)
			.set('arcane', this.arcane)
			.set('balance', this.balance);
		return map;
	}

	total_stat() {
		return this.power + this.might + this.focus + this.stamina + this.arcane + this.balance;
	}

	exp_needed(attribute, base, inc, multi, amount) {
		let original = this.get();
		let need, total_need = 0;
		for(let i = 0; i < amount; i++) {
			need = Math.floor((base + inc * this.getStat(attribute)) * (1 + multi * this.total_stat()));
			total_need += need;
			this.add(attribute, 1);
		}
		this.set(original);
		return total_need;
	}

	get() {
		return [this.power, this.might, this.focus, this.stamina, this.arcane, this.balance];
	}

	getStat(arg) {
		return (this.map_player_to_map()).get(arg);
	}

	set(a) {
		this.power = a[0];
		this.might = a[1];
		this.focus = a[2];
		this.stamina = a[3];
		this.arcane = a[4];
		this.balance = a[5];
	}

	add(attribute, amount) {
		switch(attribute) {
			case 'power' : this.power = this.power + amount; break;
			case 'might' : this.might = this.might + amount; break;
			case 'focus' : this.focus = this.focus + amount; break;
			case 'stamina': this.stamina = this.stamina + amount; break;
			case 'arcane': this.arcane = this.arcane + amount; break;
			case 'balance': this.balance = this.balance + amount; break;
		}
	}
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