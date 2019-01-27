let sql = require("./method/connect.js");
const Discord = require("discord.js");
let SortedArray = require('collections/sorted-array');
let bag_limit = require('../config/status.json').basic.bag_limit;
let fx = require("./method/modules.js");

//Nick McCurdy's answer from StackOverflow
//URL: https://stackoverflow.com/questions/18112204/get-all-directories-within-directory-nodejs
const { lstatSync, readdirSync} = require('fs');
const { join} = require('path');
const isDirectory = source => lstatSync(source).isDirectory();
const getDirectories = source => readdirSync(source).map(name => join(source, name)).filter(isDirectory);
const item_path = '/home/arcrania/config/item/';

module.exports.run = (bot, msg, arg) => {
	let user_id = msg.author.id;

	let db, skip = false, i_lib;

	sql.database_connect().then(con => {
		db = con;
		return db.query(`SELECT * FROM player_info WHERE player_id = '${user_id}'`);
	}).then(result => {
		if(!result[0]) {
			skip = true;
			return;
		}
		//Grab all item from player's inventory
		return db.query(`SELECT * FROM player_inventory WHERE player_id = '${user_id}'`);
	}).then(result => {
		if(skip)
			return;
		//Player has empty page of inventory
		if(!result[0]) {
			msg.reply(`You do not own anything inside your bag.`);
			skip = true;
			return;
		}
		//Player has some item inside inventory
		//Find all unique item id inside player's bag
		let player_bag_map = new Map(), player_bag_id = new SortedArray();
		for(let key in result) {
			if(!player_bag_map.get(result[key].item_id)) {
				//Doesnt exist in player bag name array yet.
				player_bag_id.push(result[key].item_id);
				player_bag_map.set(result[key].item_id, null);
			}
		}
		//Load in the item library from the /item/ directory
		let sub = getDirectories(item_path), iid_arr, named = 0, to_be_removed;
		for(let i = 0; i < sub.length; i++) {
			i_lib = require('require-all')({
				dirname : sub[i]
			});
			for(let key in i_lib) {
				iid_arr = i_lib[key].item_id;
				to_be_removed = [];
				player_bag_id.forEach(e => {
					if(fx.within(iid_arr[0], iid_arr[iid_arr.length - 1], e)) {
						//Fetch the name from the lib and push it to the map setup from above
						player_bag_map.set(e, i_lib[key].item_name[e - iid_arr[0]]);
						to_be_removed.push(e);
						named++;
					}
				});
				//Apply to_be_remove to the current id bag
				player_bag_id.deleteEach(to_be_removed);
				//Escape sequence early if nothing else in the bag of id
				if(!player_bag_id.length)
					break;
			}
			if(!player_bag_id.length)
				break;
		}
		//Output the bag to player in rich embed
		msg.reply(build_bag_embed(result, player_bag_map, msg.author, arg[0] || 1));
		return db.end();
	}).catch(e => {
		if(db && db.end) db.end();
		console.log(e);
	});
}

const build_bag_embed = (player_bag, item_dictionary, author, page) => {
	//need to change page here
	if(isNaN(page))
		page = 1;
	const bag_output_data = format_bag_output(player_bag, item_dictionary, page);
	const embed = new Discord.RichEmbed()
		.setAuthor(`${author.username}#${author.discriminator}'s Inventory`, author.avatarURL)
		.setTitle(`Bag space (${player_bag.length}/${bag_limit})`)
		.setColor('#708090')
		.addField(`Page ${bag_output_data[1]} of ${Math.floor(player_bag.length/20+1)}\nCode | Item Information`, bag_output_data[0])
		.setFooter(`Player can increase bag size in passive skill section.\nTo jump to different page number use >>bag #`)
		.setTimestamp();
	return embed;
}

const format_bag_output = (bag, lib, page) => {
	let str = ``;
	//Find if page grabbed is possible
	//Each output can hold up to 20 lines
	let min_page = 1, max_page = bag.length / 20 + 1, cur_page = Math.floor(Math.min(Math.max(min_page, page), max_page));
	for(let i = (cur_page-1) * 20; i < bag.length && i < cur_page * 20; i++) {
		//ID (up to 10 digit or 7 b32) Amount (up to 3 digit or 2 b32) x Item Name
		str += `${fx.dec_to_b32(bag[i].inventory_id).toUpperCase().padEnd(' ', 5)} | ${bag[i].amount.toString().padStart(' ', 3)} x ${lib.get(bag[i].item_id)}\n`;
	}
	return [str, cur_page];
}

const get_last_dir = path => {
	let arr = [];
	path.forEach(e => {
		arr.push(e.split('/').pop());
	})
	return arr;
}

module.exports.help = {
	"name" : "bag"
}