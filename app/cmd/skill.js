let fx = require('./method/modules.js');

//Nick McCurdy's answer from StackOverflow
//URL: https://stackoverflow.com/questions/18112204/get-all-directories-within-directory-nodejs
const { lstatSync, readdirSync} = require('fs');
const { join} = require('path');
const isDirectory = source => lstatSync(source).isDirectory();
const getDirectories = source => readdirSync(source).map(name => join(source, name)).filter(isDirectory);
const passive_path = '/home/arcrania/config/skill/passive/';

module.exports.run = async (bot, msg, arg) => {
	let user_id = msg.author.id;
	let sql = require(`./method/connect.js`);

	let db, skip, passives, gold;
	
	sql.database_connect().then(con => {
		db = con;
		return db.query(`SELECT player_id FROM player_info WHERE player_id = '${user_id}'`);
	}).then(res => {
		if(!res[0]) {
			skip = true;
			return;
		}
		//Find what function to chose
		//skill, skill [id], skill learn, skill learn [id], skill queue, skill queue [id]
		return db.query(`SELECT passive_t1, passive_t2, passive_t3, passive_t4, lifeskill FROM player_passive WHERE player_id = '${user_id}'`);
	}).then(res => {
		if(skip) return;
		//Record the passives and insert a new page if new
		if(!res[0]) {
			passives = {"passive_t1" : null, "passive_t2" : null, "passive_t3" : null, "passive_t4" : null, "lifeskill" : null};
			return db.query(`INSERT INTO player_passive (player_id) VALUES ('${user_id}')`);
		} else
			passives = res[0];
		return;
	}).then(() => {
		if(skip) return;
		//Record the money the player has
		return db.query(`SELECT gold FROM player_currency WHERE player_id = '${user_id}'`);
	}).then(res => {
		if(skip) return;
		if(!res[0]) {
			gold = 0;
			return db.query(`INSERT INTO player_currency (player_id) VALUES ('${user_id}')`);
		} else
			gold = res[0].gold;
		return;
	}).then(() => {
		if(skip) return;
		console.log("Checkpoint 1");
		if(!arg[0]) {
			//Display all passives the player has
			msg.reply(buildEmbed_stat(passives));
		} else if(arg.length == 1 && validPassiveID(arg[0])) {
			//Display the information of the listed ID
			console.log(`skill ID`);
			console.log(passiveSplit(passives.passive_t1));
		} else if(arg.length == 1 && arg[0].toLowerCase() == 'learn') {
			//Display all ID that player can learn
			console.log(`skill learn`);
		} else if(arg.length == 2 && arg[0].toLowerCase() == 'learn' && validPassiveID(arg[1].toLowerCase())) {
			//Puts the ID into queue
			console.log(`skill learn ID`);
		} else if(arg.length == 1 && arg[0].toLowerCase() == 'queue') {
			//Display all learning queue the player has
			console.log(`skill queue`);
		}
		console.log(`Checkpoint 2`);
	}).then(() => {
		//Close database connect
		return db.end();
	}).catch(e => {
		if(db && db.end) db.end();
		console.log(e);
	});
}

const buildEmbed_stat = p => {
	//Find all ID of player
	const Discord = require('discord.js');
	let s1 = new Map(), s2 = new Map(), s3 = new Map();
	let m = [extractTotalBonus(passiveSplit(p.passive_t1))
		,extractTotalBonus(passiveSplit(p.passive_t2))
		,extractTotalBonus(passiveSplit(p.passive_t3))
		,extractTotalBonus(passiveSplit(p.passive_t4))
		,extractTotalBonus(passiveSplit(p.lifeskill))];
	//Turn and map id to each section
	for(let i = 0; i < m.length; i++) {
		m[i].forEach((e,k) => {
			let str_s = idStatString(k);
			if(str_s[0])
				s1.set(str_s[0], e + (s1.get(k) ? s1.get(k) : 0));
			else if(str_s[1])
				s2.set(str_s[1], e + (s2.get(k) ? s2.get(k) : 0));
			else
				s3.set(str_s[2], e + (s3.get(k) ? s3.get(k) : 0));
		});
	}
	const embed = new Discord.RichEmbed()
		.setTitle(`Player Passive Bonuses`)
		.addField(`Defensive Passive Bonus`,mapLayout(s1))
		.addField(`Offensive Passive Bonus`,mapLayout(s2))
		.addField(`Lifeskill Passive Bonus`,mapLayout(s3));
	return embed;
}

const mapLayout = m => {
	let str = [];
	m.forEach((e, k) => {
		str.push(`${e} ${k}`);
	});
	return str.length ? str.join('\n') : 'None';
}

const extractTotalBonus = m => {
	let sub = getDirectories(passive_path),pc,statMap = new Map();
	for(let i = 0; i < sub.length; i++) {
		pc = require('require-all')({
			dirname: sub[i]
		});
		for(const k in pc) {
			for(let key in pc[k])
				if(pc[k].hasOwnProperty(key) && m.get(key))
					m.get(key).forEach((e,mk) => {
						//e is lvl, mk is id
						let stat = pc[k][key]["stat"][parseInt(mk,32)];
						//Insert the stat into statmap with levels
						//Find the level
						let level = fx.b32_to_dec(e);
						//Insert the first set of stat
						statMap.set(stat[0][0], stat[0][1] * level + (statMap.get(stat[0][0]) ? statMap.get(stat[0][0]) : 0));
					});
		}
	}
	return statMap;
}

const idStatString = id => {
	/* Health		0 ~ 2		 	Armor 		3 ~ 5		DMG 			6 ~ 8
	 * CDmg			9 ~ 11	  CRate 		12 ~ 14 Mana			15 ~ 17
	 * Magic 		18 ~ 20		Pen 			21 ~ 23 DR 				24 ~ 26
	 * EXP 			27 ~ 29 	Max 			30 ~ 32 CDmg_			33 ~ 35
	 * C%- 			36 ~ 36 	Fish			37 ~ 38 Mining		39 ~ 40
	 * WC 			41 ~ 42   			
	 */
	 const m_def = new Map([[0,"Health"],[1,"Increased Health"],[2,"More Health"],[3,"Armor"],[4,"Increased Armor"],[5,"More Armor"],[15,"Mana"],[16,"Increased Mana"],[17,"More Mana"],
	 	[24,"Damage Reduction"],[25,"Increased Damage Reduction"],[26,"More Damage Reduction"],[27,"Combat EXP"],[28,"Increased Combat EXP"],[29,"More Combat EXP"]]);
	 const m_off = new Map([[6,"Damage"],[7,"Increased Damage"],[8,"More Damage"],[9,"Critical Damage"],[10,"Increased Critical Damage"],[11,"More Critical Damage"],[12,"Increased Critical Rate"],
	 	[13,"Greatly Increased Critical Rate"],[14,"More Critical Rate"],[18,"Magic"],[19,"Increased Magic"],[20,"More Magic"],[21,"Penetration"],[22,"Increased Penetration"],[23,"More Penetration"],
	 	[30,"Max DMG"],[31,"Increased Max DMG"],[32,"More Max DMG"],[33,"Critical Damage Rate"],[34,"Increased Critical Damage Rate"],[35,"More Critical Damage Rate"],[36,"More Critical Damage per level"]]);
	 const m_ls = new Map([[37,"Fishing EXP"],[38,"Fishing Value"],[39,"Mining EXP"],[40,"Increased Mining Damage"],[41,"Woodcutting EXP"],[42,"Increased Woodcutting Damage"]]);
	 return [m_def.get(id), m_off.get(id), m_ls.get(id)];
}

const passiveSplit = p => {
	//AB123 => A B 123
	const skill = new Map();
	if(!p) return skill;
	for(let i = 0; i < p.length; i += 5) {
		let cs = p.charAt(i);
		let id = p.charAt(i+1);
		let lvl = p.substring(i+2, i+5);
		if(skill.get(cs))
			skill.set(cs, skill.get(cs).set(id, lvl))
		else 
			skill.set(cs, new Map().set(id, lvl));
	}
	return skill;
}

//Needs improvement to adapt to JSON files
const validPassiveID = p => {
	p = p.toLowerCase();
	//From 97 (A) <--> 106 (J)
	return (p.charCodeAt(0) >= 97 && p.charCodeAt(0) <= 106) && !isNaN(fx.b32_to_dec(p.charAt(1)));
}

module.exports.help = {
	"name" : "skill"
}