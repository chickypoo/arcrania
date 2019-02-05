let fx = require('./method/modules.js');
let sql = require('./method/connect.js');

module.exports.help = {
	"name" : "search"
}

module.exports.run = async (bot, msg, arg) => {
	let userID = msg.author.id, db,skip,pinfo,pp,ps,monster;	

	sql.database_connect().then(con => {
		db = con;
		return db.query(`SELECT * FROM player_info WHERE player_id = '${userID}'`);
	}).then(res => {
		if(!res[0]) {
			skip = true;
			return;
		}
		//Player cannot enter a fight when not free
		if(res[0].player_act !== 'free') {
			msg.reply(`You do not have the time to look for a fight right now. (You are currently ${res[0].player_act})`);
			skip = true;
			return;
		}
		pinfo = res[0];
		//Fetch player's passive skill
		return db.query(`SELECT passive_t1 AS t1, passive_t2 AS t2, passive_t3 AS t3, passive_t4 AS t4, lifeskill AS ls FROM player_passive WHERE player_id = '${userID}'`);
	}).then(res => {
		if(skip) return;
		pp = res[0];
		//Fetch player's stat
		return db.query(`SELECT * FROM player_stat WHERE player_id = '${userID}'`);
	}).then(res => {
		if(skip) return;
		ps = res[0];
		//Find monsters within player's location
		let mList = require('../config/entity/Monster.json')[`${pinfo.location}`];
		if(!mList) {
			msg.reply(`There are no field monster in this area.`);
			skip = true;
			return;
		}
		//Calculate the monster chosen by the appearance rate
		let chance = fx.random(0,100);
		for(let i = 0; i < mList.id.length; i++) {
			if(chance <= mList.appearance[i]) {
				monster = {"name":mList.name[i], "id":mList.id[i], "hp":mList.hp[i], "ar":mList.ar[i], "dr":mList.dr[i], "res":mList.res[i], "dmg":mList.dmg[i], "crate":mList.crate[i], "cdmg":mList.cdmg[i],
					"innate":[[]], "pen":mList.pen[i], "magic":mList.magic[i], "exp":mList.exp[i], "loot":mList.loot[i], "playstyle":mList.playstyle[i], "skill":mList.skill[i], "tag":mList.tag[i]}
			} else
				chance -= mList.appearance[i];
		}
		//Apply player's difficulty to the monster
		monster = difficultyBonus(monster, pinfo.difficulty);
		//Generate SQL for putting player into a fight area (Monster first)
		return db.query(`INSERT INTO battle_entity (id,name,tag,hp,ar,dr,res,dmg,crate,cdmg,pen,magic,exp,playstyle,loot,skill,innate) VALUES (` +
			`${monster.id},'${monster.name}','${monster.tag}',${monster.hp},${monster.ar},${monster.dr},'${monster.res}',${monster.dmg},${monster.crate},${monster.cdmg},${monster.pen},${monster.magic},${monster.exp},`+
			`${monster.playstyle},'${monster.loot}','${skillToString(monster.skill)}','${innateToString(monster.innate)}')`);
	}).then(() => {
		if(skip) return;
		//Find the monster that player has put
		return db.query(`SELECT battle_id FROM battle_entity WHERE id = ${monster.id} AND innate = '${innateToString(monster.innate)}' ORDER BY created DESC LIMIT 1`);
	}).then(res => {
		if(skip) return;
		//Put player into battle
		return db.query(`INSERT INTO battle VALUES ('${userID}',${res[0].battle_id})`);
	}).then(() => {
		if(skip) return;
		//Update player action to 'fighting'
		msg.reply(`You have encountered a ${monster.name}!`);
		return db.query(`UPDATE player_info SET player_act = 'fighting' WHERE player_id = '${userID}'`);
	}).then(() => {
		//Close database connection
		return db.end();
	}).catch(e => {
		if(db && db.end) db.end();
		console.log(e);
	});
}

const innateToString = i => {
	if(i.length === 0)
		return '';
	let a = new Array();
	for(let j = 0; j < i.length; j++)
		for(let k = 0; k < i[j].length; k++)
			a.push(String(i[j][k]));
	return a.join(',');
}

const skillToString = s => {
	return s.join('/');
}

const difficultyBonus = (mon, dif) => {
	const m = new Map();
	let affixes, affix;
	mon.innate = [];
	switch(dif) {
		case 'easy' :
			//Nothing is applied to easy
			break;
		case 'normal' :
			//Monster HP +50%, Monster AR +20%, Monster DMG/Magic/Pen +20%, Monster EXP +50%
			//Roll 1-2 Extra innate abilities
			//Loot are 20% better
			affixes = fx.random(1,2);
			mon.hp = Math.floor(mon.hp * 1.5);
			mon.ar = Math.floor(mon.ar * 1.2);
			mon.dmg = Math.floor(mon.dmg * 1.2);
			mon.magic = Math.floor(mon.magic * 1.2);
			mon.pen = Math.floor(mon.pen * 1.2);
			mon.exp = Math.floor(mon.exp * 1.5);
			mon.loot = treasureDifficulty(mon.loot, 1.2);
			break;
		case 'hard' :
			//Monster HP +100%, Monster AR +30%, Monster DMG/Magic/Pen +30%, Monster EXP +75%
			//Roll 2-4 Extra innate abilities
			//Loot are 50% better
			affixes = fx.random(2,4);
			mon.hp = Math.floor(mon.hp * 2.0);
			mon.ar = Math.floor(mon.ar * 1.3);
			mon.dmg = Math.floor(mon.dmg * 1.3);
			mon.magic = Math.floor(mon.magic * 1.3);
			mon.pen = Math.floor(mon.pen * 1.3);
			mon.exp = Math.floor(mon.exp * 1.75);
			mon.loot = treasureDifficulty(mon.loot, 1.5);
			break;
		case 'veteran' :
			//Monster HP +175%, Monster AR +40%, Monster DMG/Magic/Pen +40%, Monster EXP +100%
			//Roll 3-6 Extra innate abilities
			//Loot are 100% better
			affixes = fx.random(3,6);
			mon.hp = Math.floor(mon.hp * 2.75);
			mon.ar = Math.floor(mon.ar * 1.4);
			mon.dmg = Math.floor(mon.dmg * 1.4);
			mon.magic = Math.floor(mon.magic * 1.4);
			mon.pen = Math.floor(mon.pen * 1.4);
			mon.exp = Math.floor(mon.exp * 2.0);
			mon.loot = treasureDifficulty(mon.loot, 2.0);
			break;
		case 'lunatic' :
			//Monster HP +250%, Monster AR +50%, Monster DMG/Magic/Pen +50%, Monster EXP +125%
			//Roll 5-10 Extra innate abilities
			//Loot are 200% better
			affixes = fx.random(5,10);
			mon.hp = Math.floor(mon.hp * 3.5);
			mon.ar = Math.floor(mon.ar * 1.5);
			mon.dmg = Math.floor(mon.dmg * 1.5);
			mon.magic = Math.floor(mon.magic * 1.5);
			mon.pen = Math.floor(mon.pen * 1.5);
			mon.exp = Math.floor(mon.exp * 2.25);
			mon.loot = treasureDifficulty(mon.loot, 3.0);
			break;
		case 'hunter' :
			//Monster HP +350%, Monster AR +60%, Monster DMG/Magic/Pen +60%, Monster EXP +150%
			//Roll 8-12 Extra innate abilities
			//Loot are 350% better
			affixes = fx.random(8,12);
			mon.hp = Math.floor(mon.hp * 4.5);
			mon.ar = Math.floor(mon.ar * 1.6);
			mon.dmg = Math.floor(mon.dmg * 1.6);
			mon.magic = Math.floor(mon.magic * 1.6);
			mon.pen = Math.floor(mon.pen * 1.6);
			mon.exp = Math.floor(mon.exp * 2.5);
			mon.loot = treasureDifficulty(mon.loot, 4.5);
			break;
		case 'monster' :
			//Monster HP +500%, Monster AR +75%, Monster DMG/Magic/Pen +75%, Monster EXP +200%
			//Roll 11-14 Extra innate abilities
			//Loot are 650% better
			affixes = fx.random(11,14);
			mon.hp = Math.floor(mon.hp * 6);
			mon.ar = Math.floor(mon.ar * 1.75);
			mon.dmg = Math.floor(mon.dmg * 1.75);
			mon.magic = Math.floor(mon.magic * 1.75);
			mon.pen = Math.floor(mon.pen * 1.75);
			mon.exp = Math.floor(mon.exp * 3.0);
			mon.loot = treasureDifficulty(mon.loot, 7.5);
			break;
	}
	//Search and redo all innates that is higher than 5
	for(let i = 0; i < affixes; i++) {
		affix = rollInnate();
		while((m.get(affix[0]) || 0) === 5)
			affix = rollInnate;
		m.set(affix[0], (m.get(affix[0]) || 0) + 1);
	}
	m.forEach((v,k) => {
		mon.innate.push([k,v]);
	});
	//Update for Resistive
	if(m.get(2))
		mon.res = resAddAll(mon.res, resistive(m.get(2)));
	//Update for Powerful
	if(m.get(3))
		mon.dmg = powerfulAdd(mon.dmg, powerful(m.get(3)));
	//Update for Precise
	if(m.get(4))
		mon.crate += precise(m.get(4));
	//Update for Brutal
	if(m.get(5))
		mon.cdmg += brutal(m.get(5));
	//Update for Treasure
	if(m.get(6)) {
		let changed = treasureAdd(mon.loot, {"hp":mon.hp, "ar":mon.ar, "dmg":mon.dmg}, treasure(m.get(6)));
		mon.loot = changed[0];
		mon.hp = changed[1].hp;
		mon.ar = changed[1].ar;
		mon.dmg = changed[1].dmg;
	}
	//Update for Healthy
	if(m.get(12))
		mon.hp = healthyAdd(mon.hp, healthy(m.get(12)));
	//Update for Talented
	if(m.get(13))
		mon.skill = talentedAdd(mon.skill, talented(m.get(13)));
	return mon;
}

const healthyAdd = (init, multi) => {
	return Math.floor(init * multi);
}

const healthy = tier => {
	switch(tier) {
		case 1 : return 1.1;
		case 2 : return 1.2;
		case 3 : return 1.4;
		case 4 : return 1.7;
		case 5 : return 2.0;
	}
}

const talentedAdd = (skillset, multi) => {
	//Change the skill set
	let newSkill = new Array();
	for(let i = 0; i < skillset.length; i++) {
		let s = skillset[i].split('-');
		let lvl = fx.b32_to_dec(s[1].substring(2,s[1].length));
		lvl = Math.floor(lvl * multi);
		newSkill.push(`${s[0]}-${s[1].substring(0,2)}${fx.dec_to_b32(lvl)}`);
	}
	return newSkill;
}

const talented = tier => {
	return 1 + 0.2 * tier;
}

const treasureAdd = (preLoot, preStat, values) => {
	//Change the loot
	let loots = preLoot.split('/'),postLoot = new Array();
	for(let i = 0; i < loots.length; i++) {
		let l = loots[i].split('-');
		l = `${Math.floor(parseInt(l[0]) * values[0])}-${l[1]}-${l[2]}`;
		postLoot.push(l);
	}
	//Change the stat
	preStat.hp = Math.floor(preStat.hp * values[1]);
	preStat.ar = Math.floor(preStat.ar * values[1]);
	preStat.dmg = Math.floor(preStat.dmg * values[1]);
	return [postLoot.join('/'), preStat];
}

const treasureDifficulty = (preLoot, value) => {
	let loots = preLoot.split('/'), postLoot = new Array();
	for(let i = 0; i < loots.length; i++) {
		let l = loots[i].split('-');
		l = `${l[0]}-${l[1]}-${fx.dec_to_b32(Math.floor(fx.b32_to_dec(l[2]) * value))}`;
		postLoot.push(l);
	}
	return postLoot.join('/');
}

const treasure = tier => {
	let drop = 25 + 25 * tier;
	let multi = 0 + 25 * tier;
	if(tier >= 4)
		drop += 25 * (tier - 3);
	if(tier == 5)
		multi += 25;
	return [1+drop/100., 1+multi/100.];
}

const brutal = tier => {
	return 0.05 * tier;
}

const precise = tier => {
	return tier * 100;
}

const powerfulAdd = (init, value) => {
	return Math.floor(init * value);
}

const powerful = tier => {
	return 1 + (5 + tier * 5) / 10.;
}

const resAddAll = (res, value) => {
	return `${res}5${fx.dec_to_b32(value).padStart(2,'0')}`;
}

const resistive = tier => {
	switch(tier) {
		case 1 : return 10;
		case 2 : return 20;
		case 3 : return 30;
		case 4 : return 50;
		case 5 : return 75;
	}
}

const rollInnate = (id = null) => {
	/* 											I 											II 											III 										IV 											V
	 * Sturdy			Takes 10% less damage 	Takes 20% less damage 	Takes 30% less damage 	Takes 50% less damage 	Takes 75% less damage
	 * Thorn 			Reflect 25% damage 			Reflect 50% damage 			Reflect 75% damage 			Reflect 100%  damage 		Reflect 150% damage
	 * Resistive	10% all resistance 			20% all resistance 			30% all resistance 			50% all resistance 			75% all resistance
	 * Powerful 	10% damage							15% damage							20% damage 							25% damage 							30% damage
	 * Precise 		100% crit rate 					200% crit rate 					300% crit rate 					400% crit rate 					500% crit rate
	 * Brutal 		5% crit dmg 						10% crit dmg 						15% crit dmg 						20% crit dmg 						30% crit dmg
	 * Treasure 	50% drop, 25% stat 			75% drop, 50% stat 			100% drop, 75% stat 		150% drop, 100% stat 		200% drop, 150% stat
	 * Elemental 	20% damage extra 				40% damage extra 				60% damage extra 				80% damage extra 				100% damage extra
	 * Healthy 		10% more health 				20% more health 				40% more health 				70% more health 				100% more health 
	 * Talented 	20% skill level 				40% skill level 				60% skill level 				80% skill level 				100% skill level
	 */
	const innates = [[0,"Sturdy"], [1,"Thorn"], [2,"Resistive"], [3,"Powerful"], [4,"Precise"], [5,"Brutal"], [6,"Treasure"], [7,"Fiery"], [8,"Icy"], [9,"Shocking"],
		[10,"Windy"], [11,"Tera"], [12,"Healthy"],[13,"Talented"]];
	if(!id)
		return innates[fx.random(0,innates.length-1)];
	else
		return innates[id];
}