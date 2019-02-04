let fx = require('./method/modules.js');
const Discord = require('discord.js');

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

	let db, skip, passives, gold, sqlType, timeToLearn;
	
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
		if(!arg[0]) {
			//Display all passives the player has
			msg.reply(buildEmbed_stat(passives));
		} else if(arg.length == 1 && validPassiveID(arg[0])) {
			//Display the information of the listed ID
			msg.reply(buildEmbed_id(arg[0]));
		} else if(arg.length == 1 && arg[0].toLowerCase() == 'learn') {
			//Display all ID that player can learn
			msg.reply(buildEmbed_canlearn(passives));
		} else if(arg.length == 2 && arg[0].toLowerCase() == 'learn' && validPassiveID(arg[1].toLowerCase())) {
			//Puts the ID into queue
			timeToLearn = ableToLearn(arg[1], passives, gold);
			if(timeToLearn[0]) {
				//Grab the latest timestamp from the skill set
				sqlType = 1;
				return db.query(`SELECT TIMESTAMPDIFF(SECOND,CURRENT_TIMESTAMP(),learning_finish) AS toFinish FROM upgrade_queue WHERE player_id = '${user_id}' ORDER BY learning_finish DESC LIMIT 1`);
			} else
				msg.reply(`You either cannot learn the skill ${arg[1].toUpperCase()} due to requirement not met or not enough gold. Check the pre-requisite of the skill with >>skill ${arg[1].toUpperCase()}`);
		} else if(arg.length == 1 && arg[0].toLowerCase() == 'queue') {
			//Display all learning queue the player has
			sqlType = 2;
			return db.query(`SELECT TIMESTAMPDIFF(MINUTE,CURRENT_TIMESTAMP(),learning_finish) AS toFinish FROM upgrade_queue WHERE player_id = '${user_id}' ORDER BY learning_finish DESC`);
		}
		skip = true;
		return;
	}).then(res => {
		if(skip) return;
		//Enlist the skill into the queue
		if(sqlType == 1)
			return db.query(`INSERT INTO upgrade_queue VALUES ('${user_id}','${arg[1].toUpperCase()}',TIMESTAMPADD(SECOND,${timeToLearn[0] * 60 + (res[0] ? res[0].toFinish : 0)},CURRENT_TIMESTAMP()))`);
		else {
			if(!res[0])
				msg.reply(`You do not have any skill upgrading at the moment.`);
			else
				msg.reply(`You have ${res.length} skill in queue and will be finished in ${res[0].toFinish} minutes.`);
			skip = true;
			return;
		}
	}).then(() => {
		if(skip) return;
		//Deduct the gold cost from player's wallet
		msg.reply(`You have used ${timeToLearn[1]} gold to learn the skill ${arg[1].toUpperCase()}. Time required: ${timeToLearn[0]} minutes.`);
		return db.query(`UPDATE player_currency SET gold = gold - ${timeToLearn[1]} WHERE player_id = '${user_id}'`);
	}).then(() => {
		//Close database connect
		return db.end();
	}).catch(e => {
		if(db && db.end) db.end();
		console.log(e);
	});
}

const ableToLearn = (id, a, gold) => {
	//Checks if player can learn the said skill
	let haveArr = new Array();
	for(let name in a) {
		if(!a[name]) continue;
		for(let i = 0; i < a[name].length; i += 5)
			haveArr.push([a[name].substring(i,i+1), a[name].substring(i+1,i+2), fx.b32_to_dec(a[name].substring(i+2,i+5))]);
	}
	haveArr.sort();
	let learnables = getUpgradeAndLearn(a, haveArr);
	let sid = single_passive(id);
	return [((learnables[0].has(id.toUpperCase()) || learnables[1].has(id.toUpperCase())) && gold >= sid.cost) ? sid.time : 0, sid.cost];
}

const buildEmbed_canlearn = a => {
	//Get all passive learnt and their max level
	//Mapping all learnt
	let haveArr = new Array();
	for(let name in a) {
		if(!a[name]) continue;
		for(let i = 0; i < a[name].length; i += 5)
			haveArr.push([a[name].substring(i,i+1), a[name].substring(i+1,i+2), fx.b32_to_dec(a[name].substring(i+2,i+5))]);
	}
	haveArr.sort();
	//Fetch and compile for nonmax and new in req
	let learnables = getUpgradeAndLearn(a,haveArr);
	//Fetch the passive name from the library (return map)
	let upgradableNames = getNameFromID(learnables[0]), learnableNames = getNameFromID(learnables[1]);
	let upgradeStr = new Array(),learnStr = new Array();
	upgradableNames.forEach((v,k) => {
		upgradeStr.push(`${v} (ID: ${k})`);
	});
	learnableNames.forEach((v,k) => {
		learnStr.push(`${v} (ID: ${k})`);
	});
	const embed = new Discord.RichEmbed()
		.setTitle(`List of Learnable Passives`)
		.addField(`Old Passives to Upgrade`, upgradeStr.length ? upgradeStr.join(', ') : 'None')
		.addField(`New Passives to Learn`, learnStr.length ? learnStr.join(', ') : 'None')
		.setFooter(`To learn or upgrade passives, use >>skill learn [ID].`)
		.setColor('PURPLE');
		
	return embed;
}

const getNameFromID = s => {
	let sub = getDirectories(passive_path),pc, m = new Map();
	for(let i = 0; i < sub.length; i++) {
		pc = require('require-all')({
			dirname: sub[i]
		});
		for(const k in pc) {
			for(let key in pc[k])
				for(let i = 0; i < pc[k][key].id.length; i++) {
					if(s.has(`${key}${fx.dec_to_b32(i)}`))
						m.set(`${key}${fx.dec_to_b32(i)}`, pc[k][key].name[i]);
					if(m.size === s.size)
						return m;
				}
		}
	}
}

const getUpgradeAndLearn = (a,arr) => {
	let returnMap = new Map(), newSet = new Set(), canUpgrade = new Set(), canLearn = new Set();
	let sub = getDirectories(passive_path),pc,index = 0,p = '';
	for(let k in a)
		if(a[k])
			p += a[k];
	for(let i = 0; i < sub.length; i++) {
		pc = require('require-all')({
			dirname: sub[i]
		});
		for(const k in pc)
			for(let key in pc[k]) {
				//Get max level
				while(index < arr.length && arr[index][0] == key)
					returnMap.set(`${key}${arr[index][1]}`,pc[k][key].max[fx.b32_to_dec(arr[index++][1])]);
				//Get any Requirement that is either NULL or met expectation
				for(let j = 0; j < pc[k][key].id.length; j++)
					if(pc[k][key].req[j].length == 0 || metReq(p,pc[k][key].req[j]))
						newSet.add(`${key}${fx.dec_to_b32(j)}`);
			}
	}
	//Find all passive that can be upgraded (Player's passive)
	for(let i = 0; i < p.length; i += 5)
		if(fx.b32_to_dec(p.substring(i+2,i+5)) < returnMap.get(p.substring(i, i+2)))
			canUpgrade.add(p.substring(i,i+2));
	//Find new passive that can learn, met the requirement
	newSet.forEach(e => {
		if(p.indexOf(e) === -1 && !canUpgrade.has(e))
			canLearn.add(e);
	});
	return [canUpgrade, canLearn];
}

const metReq = (p, req) => {
	//Search each in constructed set
	for(let i = 0; i < req.length; i++) {
		let found = p.indexOf(req[i].substring(0,2));
		if(found === -1) return false;
		if(fx.b32_to_dec(p.substring(found+2,found+5)) < fx.b32_to_dec(req[i].substring(2,5))) return false;
	}
	return true;
}

const single_passive = id => {
	let sub = getDirectories(passive_path),pc;
	for(let i = 0; i < sub.length; i++) {
		pc = require('require-all')({
			dirname: sub[i]
		});
		for(const k in pc) {
			for(let key in pc[k])
				if(key == id.charAt(0).toUpperCase()) {
					let index = fx.b32_to_dec(id.substring(1,2));
					let json = pc[k][key];
					return {"name":json.name[index],"stat":json.stat[index],"req":json.req[index],"max":json.max[index],"cost":json.cost[index],"time":json.time[index]};
				}
		}
	}
	return null;
}
const buildEmbed_id = c => {
	const p = single_passive(c);
	//Build embed based on the ID fetched
	const embed = new Discord.RichEmbed()
		.setTitle(`Passive Skill ID: ${c.toUpperCase()}`)
		.addField(`Passive Name`,p.name)
		.addField(`Bonus Stats`,arrLayout(p.stat),true)
		.addField(`Max Level`,p.max,true)
		.addField(`Requirement`,reqSplit(p.req) || 'None')
		.addField(`Gold Cost`,p.cost,true)
		.addField(`Time Required`,`${p.time} Minutes`,true)
		.setFooter("Basic Stats are gained every level. Veteran Stats are gained every 100 levels. Bonus are acquired every 500 levels.");
	return embed;
}

const reqSplit = arr => {
	//['ABC','ABC'] --> [['AB','C'],['AB','C']], A = Class, B = ID, C = Level
	let str = [];
	for(let v of arr)
		str.push(`${fx.b32_to_dec(v.substring(2,5))} levels in ${idString(v.substring(0,2))} [ID: ${v.substring(0,2)}]`);
	return null || str.join('\n');
}

const idString = cid => {
	let sub = getDirectories(passive_path), pc;
	for(let i = 0; i < sub.length; i++) {
		pc = require('require-all')({
			dirname: sub[i]
		});
		for(const k in pc)
			for(let cls in pc[k])
				if(cls == cid.charAt(0).toUpperCase()) { //Correct class selection
					let id = fx.b32_to_dec(cid.substring(1,2));
					return pc[k][cls].name[id];
				}
	}
}

const buildEmbed_stat = p => {
	//Find all ID of player
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
		str.push(`${e}${k}`);
	});
	return str.length ? str.join('\n') : 'None';
}

const arrLayout = a => {
	let str = [],i = 0;
	const str_ = ["Basic Stat","Veteran Stat","Bonus"];
	a.forEach(e => {
		str.push(`${str_[i++]}: ${e[1]}${single_string(idStatString(e[0]))}`);
	});
	return str.join('\n');
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
						//First threshold is per 100 passive level
						if(level >= 100 && stat.length > 1)
							statMap.set(stat[1][0], stat[1][1] * Math.floor(level / 100) + (statMap.get(stat[1][0]) ? statMap.get(stat[1][0]) : 0));
						//Second threshold is per 500 passive level
						if(level >= 500 && stat.length > 2)
							statMap.set(stat[2][0], stat[2][1] * Math.floor(level / 500) + (statMap.get(stat[2][0]) ? statMap.get(stat[2][0]) : 0));
					});
		}
	}
	return statMap;
}

const idStatString = id => {
	//Continue with 47
	const m_def = new Map([[0," Health"],[1,"% Increased Health"],[2,"% More Health"],[3," Armor"],[4,"% Increased Armor"],[5,"% More Armor"],[15," Mana"],[16,"% Increased Mana"],[17,"% More Mana"],
	 	[24," Damage Reduction"],[25,"% Increased Damage Reduction"],[26,"% More Damage Reduction"],[27," Combat EXP"],[28,"% Increased Combat EXP"],[29,"% More Combat EXP"]]);

	const m_off = new Map([[6," Damage"],[7,"% Increased Damage"],[8,"% More Damage"],[9," Critical Damage"],[10,"% Increased Critical Damage"],[11,"% More Critical Damage"],[12,"% Increased Critical Rate"],
	 	[13,"% Greatly Increased Critical Rate"],[14,"% More Critical Rate"],[18," Magic"],[19,"% Increased Magic"],[20,"% More Magic"],[21," Penetration"],[22,"% Increased Penetration"],[23,"% More Penetration"],
	 	[30," Max DMG"],[31,"% Increased Max DMG"],[32,"% More Max DMG"],[33," Critical Damage Rate"],[34,"% Increased Critical Damage Rate"],[35,"% More Critical Damage Rate"],[36,"10% More Critical Damage and 20% Less Critical Rate per level"]]);
	
	const m_ls = new Map([[37," Fishing EXP"],[38," Fishing Value"],[39," Mining EXP"],[40,"% Increased Mining Damage"],[41," Woodcutting EXP"],[42,"% Increased Woodcutting Damage"],[43,"% Fish Quality Range"],
	 	[44," Fishing Power"],[45,"% Fishing Rarity Bonus"],[46,"% Fish Base Quality"]]);
	return [m_def.get(id), m_off.get(id), m_ls.get(id)];
}

const isString = arg => {
	return (Object.prototype.toString.call(arg) === "[object String]") || (typeof arg === 'string') || (arg instanceof String);
}

const single_string = arr => {
	for(let e of arr)
		if(isString(e)) return e;
	return null;
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