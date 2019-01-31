let sql = require("./method/connect.js");
let fx = require("./method/modules.js");
let _stat = require("../config/status.json");
let bot_setting = require("../config/bot.json");
const Discord = require("discord.js");
let Player = require('../config/class/player.js');

const talked = new Set();

module.exports.run = async (bot, msg, arg) => {
	let user_id = String(msg.author.id);

	let db, db2, player, row, reply, skip = false, statSQL, lifeskill;

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
		if(!rows[0]) {
			player = new Player(_stat.basic);
			return db.query(`INSERT INTO player_stat (player_id) VALUES ('${user_id}')`);
		}
		//Player exists.
		row = rows[0];
		player = new Player(_stat.basic, row.exp, row.power, row.might, row.focus, row.stamina, row.arcane, row.balance);
	}).then(() => {
		if(skip) return;
		if(arg && arg.length == 0) {
			//Only output player's status page
			return db.query(`SELECT * FROM player_life_skill WHERE player_id = '${user_id}'`);
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
											}).catch(err => {
												console.log(err);
											});
										} else {
											//Player declines with the selection
										}
										talked.delete(user_id);
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
			return;
		}
	}).then(res => {
		if(skip) return;

		if(!res[0]) {
			lifeskill = {
				"fishing_level" : 1,
				"fishing_exp" : 0,
				"mining_level" : 1,
				"mining_exp" : 0,
				"woodcutting_level" : 1,
				"woodcutting_exp" : 0,
				"cooking_level" : 1,
				"cooking_exp" : 0,
				"forging_level" : 1,
				"forging_exp" : 0,
				"alchemy_level" : 1,
				"alchemy_exp" : 0,
				"farming_level" : 1,
				"farming_exp" : 0,
				"refining_level" : 1,
				"refining_exp" : 0
			};
			return db.query(`INSERT INTO player_life_skill (player_id) VALUES ('${user_id}')`);
		}
		lifeskill = res[0];
		return;
	}).then(() => {
		if(skip) return db.end();
		player.setLife(lifeskill);
		msg.reply(build_stat_embed(player, msg.author));
		return db.end();
	}).catch(err => {
		if(db && db.end) db.end();
		console.log(err);
	});
}

const valid_allocation = str => {
	const valid = {power: 0, might: 1, focus: 2, stamina: 3, arcane: 4, balance: 5};
	return (str.toString().toLowerCase() in valid);
}

const build_stat_embed = (data, author) => {
	let _power = data.can_add('power', _stat.base, _stat.inc, _stat.multi, 1);
	let _might = data.can_add('might', _stat.base, _stat.inc, _stat.multi, 1);
	let _focus = data.can_add('focus', _stat.base, _stat.inc, _stat.multi, 1);
	let _stamina = data.can_add('stamina', _stat.base, _stat.inc, _stat.multi, 1);
	let _arcane = data.can_add('arcane', _stat.base, _stat.inc, _stat.multi, 1);
	let _balance = data.can_add('balance', _stat.base, _stat.inc, _stat.multi, 1);
	const embed = new Discord.RichEmbed()
		.setAuthor(`${author.username}#${author.discriminator}'s Status Page`, author.avatarURL)
		.setColor('#708090')
		.addField(`Experience Points`, data.exp)
		.addField(`Power`, `${data.power}\n${_power[0] ? "[Ready]" : `[Needs ${_power[1]} more EXP]`}`, true)
		.addField(`Might`, `${data.might}\n${_might[0] ? "[Ready]" : `[Needs ${_might[1]} more EXP]`}`, true)
		.addField(`Focus`, `${data.focus}\n${_focus[0] ? "[Ready]" : `[Needs ${_focus[1]} more EXP]`}`, true)
		.addField(`Stamina`, `${data.stamina}\n${_stamina[0] ? "[Ready]" : `[Needs ${_stamina[1]} more EXP]`}`, true)
		.addField(`Arcane`, `${data.arcane}\n${_arcane[0] ? "[Ready]" : `[Needs ${_arcane[1]} more EXP]`}`, true)
		.addField(`Balance`, `${data.balance}\n${_balance[0] ? "[Ready]" : `[Needs ${_balance[1]} more EXP]`}`, true)
		.addBlankField()
		.addField(`Combat Power (Defensive)`, `HP: ${data.getHP()}\nMP: ${data.getMP()}\nAP: ${data.getAP()}`, true)
		.addField(`Combat Power (Offensive)`, `ATK: ${data.getMinAtk()} ~ ${data.getMaxAtk()}\n`
			+`Critical Rate: ${data.getCritRate()}%\n`
			+`Critical DMG: ${data.getCritDmg()[0]}% | ${data.getCritDmg()[1]}\n`
			+`Penetration: ${data.getPenetration()}\n`
			+`Magic: ${data.getMagic()}`, true)
		.addBlankField()
		.addField(`Fishing`, `Level ${data.lifeskill.fishing_level}\nEXP: ${data.lifeskill.fishing_exp}/${gather_exp_next(data.lifeskill.fishing_level)}`, true)
		.addField(`Mining`, `Level ${data.lifeskill.mining_level}\nEXP : ${data.lifeskill.mining_exp}/${gather_exp_next(data.lifeskill.mining_level)}`, true)
		.addField(`Woodcutting`, `Level ${data.lifeskill.woodcutting_level}\nEXP : ${data.lifeskill.woodcutting_exp}/${gather_exp_next(data.lifeskill.woodcutting_level)}`, true)
		.addField(`Cooking`, `Level ${data.lifeskill.cooking_level}\nEXP : ${data.lifeskill.cooking_exp}/PLACEHOLDER`, true)
		.addField(`Forging`, `Level ${data.lifeskill.forging_level}\nEXP : ${data.lifeskill.forging_exp}/PLACEHOLDER`, true)
		.addField(`Refining`, `Level ${data.lifeskill.refining_level}\nEXP : ${data.lifeskill.refining_exp}/PLACEHOLDER`, true)
		.addField(`Alchemy`, `Level ${data.lifeskill.alchemy_level}\nEXP : ${data.lifeskill.alchemy_exp}/PLACEHOLDER`, true)
		.addField(`Farming`, `Level ${data.lifeskill.farming_level}\nEXP : ${data.lifeskill.farming_exp}/PLACEHOLDER`, true);
	return embed;
}

const gather_exp_next = level => {
	let base = 10;
	for(let i = 1; i <= level / 10; i++)
		base += i;
	return base;
}

module.exports.help = {
	"name" : "stat"
}