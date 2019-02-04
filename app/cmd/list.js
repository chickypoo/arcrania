let sql = require('./method/connect.js');
module.exports.run = async (bot, msg, arg) => {
	let userID = msg.author.id, db;

	sql.database_connect().then(con => {
		db = con;
		return db.query(`SELECT * FROM player_info WHERE player_id = '${userID}'`);
	}).then(res => {
		if(!res[0]) return;
		msg.reply(listEmbed());
	}).then(() => {
		return db.end();
	}).catch(e => {
		if(db && db.end) db.end();
		console.log(e);
	});


}

module.exports.help = {
	"name" : "cmd"
}

const listEmbed = () => {
	let Discord = require('discord.js');
	const embed = new Discord.RichEmbed()
		.setTitle(`List of all commands`)
		.setColor([102,153,255])
		.addField('Player Stat','stat\nstat [Attribute] [Amount | 1]', true)
		.addField('Player Passive','skill\nskill [ID]\nskill learn\nskill learn [ID]\nskill queue',true)
		.addField('Player Inventory','bag [Page | 1]',true)
		.addField('Selling Item','sell [Code] [Amount | 1]',true)
		.addField('Player Currency','bal',true)
		.addField('Fishing','fish',true)
		.addField('Mining','mine',true)
		.setFooter('Remember to use the bot prefix token [>>] before each command listed above.');

	return embed;
}