let sql = require("./method/connect.js");

//Nick McCurdy's answer from StackOverflow
//URL: https://stackoverflow.com/questions/18112204/get-all-directories-within-directory-nodejs
const { lstatSync, readdirSync} = require('fs');
const { join} = require('path');
const isDirectory = source => lstatSync(source).isDirectory();
const getDirectories = source => readdirSync(source).map(name => join(source, name)).filter(isDirectory);
const item_path = '/home/arcrania/config/item/';

module.exports.run = (bot, msg, arg) => {
	let user_id = msg.author.id;

	let db, skip, i_lib, fixed_bag = [];

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
		//Player has empty page of inventory
		if(!result[0]) {
			msg.reply(`You do not own anything inside your bag.`);
			skip = true;
			return;
		}
		//Player has some item inside inventory
		let bag_size = result[0].size;
		//Load in the item library from the /item/ directory
		let sub = getDirectories(item_path), id_arr;
		for(let i = 0; i < sub.length; i++) {
			i_lib = require('require-all')({
				dirname : sub[i]
			});
			for(let key in i_lib) {
				id_arr = i_lib[key].item_id;
			}
		}
		
	}).catch(e => {
		if(db && db.end) db.end();
		console.log(e);
	});
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