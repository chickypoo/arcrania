let sql = require('./method/connect.js');
let Discord = require('discord.js');

module.exports.help = {
	"name" : "mode"
}

module.exports.run = async (bot, msg, arg) => {
	let userID = msg.author.id,db;

	sql.database_connect().then(con => {
		db = con;
		return db.query(`SELECT * FROM player_info WHERE player_id = '${userID}'`);
	}).then(res => {
		if(!res[0]) {
			return;
		}
		if(arg[0] && arg[0] === '?') {
			msg.reply(embedWhat());
			return;
		} else if(arg[0] && validSwitch(arg[0])) {
			msg.reply(`Your difficulty is now ${validSwitch(arg[0])}.`);
			return db.query(`UPDATE player_info SET difficulty = '${validSwitch(arg[0])}' WHERE player_id = '${userID}'`);
		}
	}).then(() => {
		return db.end();
	}).catch(e => {
		if(db && db.end) db.end();
		console.log(e);
	})
}

const validSwitch = arg => {
	const valid = "easy normal hard veteran lunatic hunter monster";
	if(!isNaN(arg)) {
		arg = Math.min(Math.max(parseInt(arg),1),7);
		switch(arg) {
			case 1 : return 'easy';
			case 2 : return 'normal';
			case 3 : return 'hard';
			case 4 : return 'veteran';
			case 5 : return 'lunatic';
			case 6 : return 'hunter';
			case 7 : return 'monster';
		}
	}
	for(let i = 0; i < valid.split(' ').length; i++)
		if(arg.toLowerCase() === valid.split(' ')[i])
			return arg.toLowerCase();
	return false;
}

const embedWhat = () => {
	const embed = new Discord.RichEmbed()
		.setTitle('Difficulty Setting')
		.setColor([102,153,255])
		.setFooter('Difficulty setting only affect combat.')
		.addField('Easy (1)','Monsters do not gain any bonuses')
		.addField('Normal (2)','Monsters have 50% more health\nMonsters have 20% more armor, damage, penetration and magic\nMonsters give 50% more combat experience\nMonster have 1 ~ 2 traits\nLoots has 20% more value')
		.addField('Hard (3)','Monsters have 100% more health\nMonsters have 30% more armor, damage, penetration and magic\nMonsters give 75% more combat experience\nMonster have 2 ~ 4 traits\nLoots has 50% more value')
		.addField('Veteran (4)','Monsters have 175% more health\nMonsters have 40% more armor, damage, penetration and magic\nMonsters give 100% more combat experience\nMonster have 3 ~ 6 traits\nLoots has 100% more value')
		.addField('Lunatic (5)','Monsters have 250% more health\nMonsters have 50% more armor, damage, penetration and magic\nMonsters give 125% more combat experience\nMonster have 5 ~ 10 traits\nLoots has 200% more value')
		.addField('Hunter (6)','Monsters have 350% more health\nMonsters have 60% more armor, damage, penetration and magic\nMonsters give 150% more combat experience\nMonster have 8 ~ 12 traits\nLoots has 350% more value')
		.addField('Monster (7)','Monsters have 500% more health\nMonsters have 75% more armor, damage, penetration and magic\nMonsters give 200% more combat experience\nMonster have 11 ~ 14 traits\nLoots has 650% more value');
	return embed;
}