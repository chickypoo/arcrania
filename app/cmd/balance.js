let sql = require("./method/connect.js");
let fx = require("./method/modules.js");
let Discord = require('discord.js');

module.exports.run = async (bot, msg, arg) => {
	let user_id = String(msg.author.id);

	let db, skip = false, wallet;

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
		//Player found in the world, fetch player's currency data
		return db.query(`SELECT * FROM player_currency WHERE player_id = '${user_id}'`);
	}).then(rows => {
		if(skip) return;
		//New player, create a blank currency page
		if(!rows[0]) {
			wallet = new Wallet();
			return db.query(`INSERT INTO player_currency (player_id) VALUES ('${user_id}')`);
		}
		//Player exists.
		wallet = new Wallet(rows[0].gold, rows[0].token, rows[0].medal);
	}).then(() => {
		if(skip)
			return;
		//Display the currency to chat
		msg.reply(build_currency_embed(wallet));
		return db.end();
	}).catch(err => {
		if(db && db.end) db.end();
		console.log(err);
	});
}

const build_currency_embed = wallet => {
	const embed = new Discord.RichEmbed()
		.setTitle('Currency Window')
		.addField(`Gold`, `${wallet.get('gold')}`, true)
		.addField(`Token`, `${wallet.get('token')}`, true)
		.addField(`Medal`, `${wallet.get('medal')}`, true);

	return embed;
}

class Wallet {
	constructor(gold = 0, token = 0, medal = 0) {
		this.gold = gold;
		this.token = token;
		this.medal = medal;
	}

	set(arg) {
		this.setGold(arg[0]);
		this.setToken(arg[1]);
		this.setMedal(arg[2]);
	}

	setGold(arg) {
		this.gold = arg;
	}

	setToken(arg) {
		this.token = arg;
	}

	setMedal(arg) {
		this.medal = arg;
	}

	getCurrency() {
		return [this.gold, this.token, this.medal];
	}

	get(arg) {
		switch(arg) {
			case 'gold' : return this.gold;
			case 'token' : return this.token;
			case 'medal' : return this.medal;
		}
	}

	get_currency_name(){
		const type = ['Gold', 'Token', 'Medal'];
		return type;
	}
}

module.exports.help = {
	"name" : "bal"
}