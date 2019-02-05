let sql = require('./method/connect.js');
let Discord = require('discord.js');
let fx = require('./method/modules.js');
const tier = ['basic'], sSet = require('../config/skill/active/skills.json');

module.exports.help = {
	"name" : "ability"
}

module.exports.run = async (bot, msg, arg) => {
	let userID = msg.author.id, db,skip,pinfo,pabil;

	sql.database_connect().then(con => {
		db = con;
		return db.query(`SELECT * FROM player_info WHERE player_id = '${userID}'`);
	}).then(res => {
		if(!res[0]) {
			skip = true;
			return;
		}
		pinfo = res[0];
		return db.query(`SElECT skill FROM player_active WHERE player_id = '${userID}'`);
	}).then(res => {
		if(skip) return;
		pabil = res[0].skill;

		if(!arg[0]) {
			msg.reply(sListEmbed(pabil,msg.author));
		} else if(arg[0] && haveSkill(pabil,arg[0].toUpperCase())) {
			msg.reply(detailEmbed(pabil,arg[0].toUpperCase()));
		}
		return;
	}).then(() => {
		return db.end();
	}).catch(e => {
		if(db && db.end) db.end();
		console.log(e);
	});
}

const detailEmbed = (p,s) => {
	//Grab data from lib about that skill s
	let sk = grabSingleAbility(s);
	//Grab the level from player if able
	let skills = p.split('/'), lvl = 0;
	for(let i = 0; i < skills.length; i++)
		if(skills[i].startsWith(s.padStart(2,'0'))) {
			let temp = skills[i].split(',');
			lvl = fx.b32_to_dec(temp[0].substring(2,temp[0].length)) - 1;
			break;
		}
	//Compile and generate an embed
	console.log(sk);
	const embed = new Discord.RichEmbed()
		.setTitle(`Detailed Ability Page`)
		.setColor([102,153,255])
		.addField('Ability Name',sk.name,true)
		.addField('Ability ID',s,true)
		.addField('Ability Tags',sk.tag,true)
		.addField('Power',`${Math.floor(sk.bdmg + lvl * sk.idmg)} (+${sk.idmg} PER level) x ${sk.hit}`,true)
		.addField('Critical%',`${sk.crit}%`,true)
		.addField('Critical Damage',`${Math.floor(sk.bcdmg + lvl * sk.icdmg)} (+${sk.icdmg} PER level)`,true)
		.addField('Penetration',`${Math.floor(sk.bpen + lvl * sk.ipen)} (+${sk.ipen} PER level)`,true)
		.addField('Attack Scale',`${sk.atk}%`,true)
		.addField('Magic Scale',`${sk.mag}%`,true)
		.addField('Mana Cost',`${Math.floor(sk.bmp + lvl * sk.imp)} (+${sk.imp} PER level)`)
		.addField('Buff #1',sk.peff?effectStr(sk.buff[0],'buff',lvl):'None',true)
		.addField('Buff #2',sk.peff>1?effectStr(sk.buff[1],'buff',lvl):'None',true)
		.addBlankField(true)
		.addField('Debuff #1',sk.neff?effectStr(sk.debuff[0],'debuff',lvl):'None',true)
		.addField('Debuff #2',sk.neff>1?effectStr(sk.debuff[1],'debuff',lvl):'None',true)
		.addBlankField(true)
		.addField('Augments Available', augmentStr(sk.augs),true);
	return embed;
}

const augmentStr = aa => {
	let augs = require('../config/skill/active/augments.json');
	let str = new Array();
	for(let i = 0; i < aa.length; i++)
		str.push(`ID: ${fx.dec_to_b32(aa[i])}, ${augs.name[aa[i]]}`);
	return str.join('\n');
}

const effectStr = (effect,type,lvl) => {
	let status = require(`../config/skill/effect/${type==='buff'?'positive':'negative'}.json`);
	let str = '';
	str += `${status.name[effect.id]}\n`;
	str += `Trigger Rate: ${effect.rate}%\n`;
	str += `Effect Duration: ${effect.info[2]}\n`;
	str += `Power: ${Math.floor(effect.info[3][0]+lvl*effect.info[3][1])} +${effect.info[0]} x ATK +${effect.info[1]} x MAGIC\n`;
	str += `Type: ${status.type[effect.id]}`;
	return str;
}

const grabSingleAbility = s => {
	for(let i = 0; i < tier.length;i++)
		if(fx.within(sSet[tier[i]].id[0],sSet[tier[i]].id[sSet[tier[i]].id.length-1],fx.b32_to_dec(s))) {
			let index = fx.b32_to_dec(s) - sSet[tier[i]].id[0];
			skill = {"id":sSet[tier[i]].id[index],
				"name":sSet[tier[i]].name[index],
				"tag":sSet[tier[i]].tag[index],
				"bdmg":sSet[tier[i]].bdmg[index],
				"idmg":sSet[tier[i]].idmg[index],
				"hit":sSet[tier[i]].hit[index],
				"crit":sSet[tier[i]].crit[index],
				"bcdmg":sSet[tier[i]].bcdmg[index],
				"icdmg":sSet[tier[i]].icdmg[index],
				"bpen":sSet[tier[i]].bpen[index],
				"ipen":sSet[tier[i]].ipen[index],
				"atk":sSet[tier[i]].atk[index]*100,
				"mag":sSet[tier[i]].mag[index]*100,
				"bmp":sSet[tier[i]].bmp[index],
				"imp":sSet[tier[i]].imp[index],
				"peff":sSet[tier[i]].pos_eff[index],
				"buff":[{"id":sSet[tier[i]].pos_ef1_id[index],
								 "rate":sSet[tier[i]].pos_ef1_rt[index],
								 "info":sSet[tier[i]].pos_ef1_if[index]},
								{"id":sSet[tier[i]].pos_ef2_id[index],
								 "rate":sSet[tier[i]].pos_ef2_rt[index],
								 "info":sSet[tier[i]].pos_ef2_if[index]}],
				"neff":sSet[tier[i]].neg_eff[index],
				"debuff":[{"id":sSet[tier[i]].neg_ef1_id[index],
									 "rate":sSet[tier[i]].neg_ef1_rt[index],
									 "info":sSet[tier[i]].neg_ef1_if[index]},
									{"id":sSet[tier[i]].neg_ef2_id[index],
									 "rate":sSet[tier[i]].neg_ef2_rt[index],
									 "info":sSet[tier[i]].neg_ef2_if[index]}],
				"augs":sSet[tier[i]].augs[index]
			}
			break;
		}
	return skill;
}

const sListEmbed = (s,a) => {
	let total = 0, ss = s.split('/'), augs = 0, totalAug, output = new Array(),sid = new Array();
	for(let i = 0; i < ss.length; i++) {
		let sgs = ss[i].split('-'),sst = sgs[0].split(',');
		let id = fx.dec_to_b32(fx.b32_to_dec(ss[i].substring(0,2)));
		let lvl = fx.b32_to_dec(sst[0].substring(2,sst[0].length));
		let exp = fx.b32_to_dec(sst[1]);
		total += lvl;
		totalAug = Math.floor(lvl / 20);
		if(sgs.length > 1) {
			//Augment section
			for(let j = 0; j > sgs[1].length; j += 3)
				augs += fx.b32_to_dec(sgs[1].substring(j+1,j+3));
		}
		sid.push(fx.b32_to_dec(id));
		output.push({"id":id, "lvl":lvl, "exp":exp, "augUsed":augs, "augSpare":totalAug-augs});
	}
	let m = idToNameA(sid);
	const embed = new Discord.RichEmbed()
		.setTitle(`${a.username}#${a.discriminator}'s active skills`)
		.setColor([102,153,255])
		.setFooter(`You can see a more detailed page about a single skill with >>ability [ID]`)
		.addField(`Total Ability Levels`,`${total}`,true)
		.addField(`Total Abilities`,`${ss.length}`,true)
		.addField(`Active Abilities`,outputA(output,m));
	return embed;
}

const expNext = (id, lvl) => {
	let data;
	for(let i = 0; i < tier.length; i++) {
		if(fx.within(sSet[tier[i]].id[0],sSet[tier[i]].id[sSet[tier[i]].id.length-1],fx.b32_to_dec(id)))
			data = sSet[`${tier}_level`];
	}
	//Get base exp
	let exp = data.bexp + (lvl-1) * data.iexp;
	//Apply multiplier
	exp = Math.floor(exp * (1 + data.mexp * Math.floor(lvl/data.miexp)));
	return exp;
}

const outputA = (list, map) => {
	let str = new Array();
	for(let i = 0; i < list.length; i++)
		str.push(`Lv. ${list[i].lvl} ${map.get(fx.b32_to_dec(list[i].id))} EXP: ${list[i].exp}/${expNext(list[i].id, list[i].lvl)} Augments: ${list[i].augUsed}/${list[i].augUsed+list[i].augSpare} (ID: ${list[i].id})`);
	return str.join('\n');
}

const idToNameA = a => {
	let skills = require('../config/skill/active/skills.json'), m = new Map();
	for(let i = 0; i < a.length; i++) {
		//Basic skills
		if(fx.within(skills.basic.id[0],skills.basic.id[skills.basic.id.length-1],a[i]))
			m.set(a[i], skills.basic.name[a[i]-skills.basic.id[0]]);
	}
	return m;
}

const haveSkill = (s, id) => {
	let ss = s.split('/');
	for(let i = 0; i < ss.length; i++)
		if(ss[i].startsWith(id.padStart(2,'0')))
			return ss[i];
	return false;	
}