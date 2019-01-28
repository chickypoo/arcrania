let sql = require('./method/connect.js');
let fx = require('./method/modules.js');
let prefix = require('../config/bot.json').prefix;
let Discord = require('discord.js');

//Nick McCurdy's answer from StackOverflow
//URL: https://stackoverflow.com/questions/18112204/get-all-directories-within-directory-nodejs
const { lstatSync, readdirSync} = require('fs');
const { join} = require('path');
const isDirectory = source => lstatSync(source).isDirectory();
const getDirectories = source => readdirSync(source).map(name => join(source, name)).filter(isDirectory);
const item_path = '/home/arcrania/config/item/';

const sell_talked = new Set();

module.exports.run = async (bot, msg, arg) => {
	let user_id = msg.author.id;
	let db, skip, dnum;

	sql.database_connect().then(con => {
		db = con;
		//Check player in database
		return db.query(`SELECT player_id FROM player_info WHERE player_id = '${user_id}'`);
	}).then(res => {
		if(!res[0]) {
			skip = true;
			return;
		}
		//Check arg
		if(arg && arg.length <= 2 && arg.length >= 1)
			dnum = arg[1] || 1;
		if(!arg[0] || !verify_inventory_id(arg[0])) {
			msg.reply(`Please input code listed. Example: \`${prefix}${this.help.name} [Code] [Amount (Optional)]\`. Code can be found with \`${prefix}bag\` command.`);
			skip = true;
			return;
		}
		return db.query(`SELECT inventory_id, amount, cost, item_id, arg_1 FROM player_inventory WHERE player_id = '${user_id}' AND inventory_id = ${fx.b32_to_dec(arg[0])}`);
	}).then(res => {
		if(skip) return;
		if(!res[0]) {
			msg.reply(`That item does not belong to you.`);
			skip = true;
			return;
		}
		//Find the item name from library
		let sub = getDirectories(item_path), i_lib, iName;
		for(let i = 0; i < sub.length; i++) {
			i_lib = require('require-all')({dirname : sub[i]});
			for(let key in i_lib) {
				let arr = i_lib[key].item_id;
				if(fx.within(arr[0], arr[arr.length-1], res[0].item_id))
					iName = i_lib[key].item_name[res[0].item_id - arr[0]];
				if(iName) break;
			}
			if(iName) break;
		}
		//Do a check to confirm the drop
		if(sell_talked.has(user_id)) {
			msg.reply(`You entered this command too fast. There is a 10 seconds cooldown for this command`);
			skip = true;
			return;
		} else {
			sell_talked.add(user_id);
			setTimeout(() => {
				sell_talked.delete(user_id);
			}, 10000);
		}
		const filter = (reaction, user) => {
			return ['✅', '❎'].includes(reaction.emoji.name) && user.id === user_id;
		};
		msg.channel.send(build_item_embed({"item_name" : iName, "item_value" : res[0].arg_1, "item_cost" : res[0].cost}))
			.then(poll => {
				poll.react('✅')
					.then(() => poll.react('❎'))
					.catch(() =>  console.error('Failed to attach emoji to allocation message'));

				poll.awaitReactions(filter, {max: 1, time: 10000, error: ['time']})
					.then(c => {
						if(c.first().emoji.name === '✅') {
							let db2;
							sql.database_connect().then(con => {
								db2 = con;
								//if amount is more than selected delete instead
								if(res[0].amount <= dnum)
									return db2.query(`DELETE FROM player_inventory WHERE player_id = '${user_id}' AND inventory_id = ${fx.b32_to_dec(arg[0])}`);
								else
									return db2.query(`UPDATE player_inventory SET amount = amount - ${dnum} WHERE player_id = '${user_id}' AND inventory_id = ${fx.b32_to_dec(arg[0])}`);
							}).then(() => {
								msg.reply(`You have sold ${dnum} ${iName} at ${res[0].cost} each. (+${dnum * res[0].cost} gold)`);
								return db2.query(`SELECT * FROM player_currency WHERE player_id = '${user_id}'`);
							}).then(ress => {
								if(!ress[0])
									return db2.query(`INSERT INTO player_currency (player_id, gold) VALUES ('${user_id}',${dnum * res[0].cost})`);
								else
									return db2.query(`UPDATE player_currency SET gold = gold + ${dnum * res[0].cost} WHERE player_id = '${user_id}'`);
							}).then(() => {
								return db2.end();
							}).catch(e => {
								if(db2 && db2.end) db2.end();
								console.log(e);
							});
						}
					}).catch(() => {

					});
			});
	}).then(() => {
		return db.end();
	}).catch(e => {
		if(db && db.end) db.end();
		console.log(e);
	});
}

const build_item_embed = (iData) => {
	const embed = new Discord.RichEmbed()
		.setTitle(`Sell confirmation`)
		.setColor('#708090')
		.addField(`Item Name`, iData.item_name)
		.addField(`Value`, iData.item_value, true)
		.addField(`Unit Price`, iData.item_cost, true)
		.addBlankField()
		.addField(`React with ✅ to confirm or ❎ to cancel.`, `Theres 10 seconds to decide.`);
	return embed;
}

const verify_inventory_id = arg => {
	let str = String(arg);
	for(let i = 0; i < str.length; i++)
		if(isNaN(parseInt(str.charAt(i), 32)))
			return false;
	return true;
}

module.exports.help = {
	"name" : "sell"
}