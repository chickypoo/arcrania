class Player {
	constructor(base, exp = 0, power = 0, might = 0, focus = 0, stamina = 0, arcane = 0, balance = 0, lifeskill = null) {
		this.exp = exp;
		this.power = power;
		this.might = might;
		this.focus = focus;
		this.stamina = stamina;
		this.arcane = arcane;
		this.balance = balance;
		this.base = base;
		this.lifeskill = lifeskill
		this.t1 = null;
		this.t2 = null;
		this.t3 = null;
		this.t4 = null;
		this.ls = null;
	}

	map_player_to_map() {
		let map = new Map();
		map.set('power', this.power)
			.set('might', this.might)
			.set('focus', this.focus)
			.set('stamina', this.stamina)
			.set('arcane', this.arcane)
			.set('balance', this.balance);
		return map;
	}

	total_stat() {
		return this.power + this.might + this.focus + this.stamina + this.arcane + this.balance;
	}

	can_add(attribute, base, inc, multi) {
		let exp_req = this.exp_needed(attribute, base, inc, multi, 1);
		return [this.exp >= exp_req, exp_req - this.exp];
	}

	exp_needed(attribute, base, inc, multi, amount) {
		let original = this.get();
		let need, total_need = 0;
		for(let i = 0; i < amount; i++) {
			need = Math.floor((base + inc * this.getStat(attribute)) * (1 + multi * this.total_stat()));
			total_need += need;
			this.add(attribute, 1);
		}
		this.set(original);
		return total_need;
	}

	get() {
		return [this.power, this.might, this.focus, this.stamina, this.arcane, this.balance];
	}

	getStat(arg) {
		return (this.map_player_to_map()).get(arg);
	}

	set(a) {
		this.power = a[0];
		this.might = a[1];
		this.focus = a[2];
		this.stamina = a[3];
		this.arcane = a[4];
		this.balance = a[5];
	}

	setLife(arg) {
		this.lifeskill = arg;
	}

	add(attribute, amount) {
		switch(attribute) {
			case 'power' : this.power = this.power + amount; break;
			case 'might' : this.might = this.might + amount; break;
			case 'focus' : this.focus = this.focus + amount; break;
			case 'stamina': this.stamina = this.stamina + amount; break;
			case 'arcane': this.arcane = this.arcane + amount; break;
			case 'balance': this.balance = this.balance + amount; break;
		}
	}

	getHP() {
		//Health from standard value
		let t_hp = this.base.hp;
		//Health from Power
		t_hp += this.power * this.base.power.hp;
		//Health from Might
		t_hp += this.might * this.base.might.hp;
		//Health from Focus
		t_hp += this.focus * this.base.focus.hp;
		//Health from Stamina
		t_hp += this.stamina * this.base.stamina.hp;
		//Health from Arcane
		t_hp += this.arcane * this.base.arcane.hp;
		//Health from Balance
		t_hp += this.balance * this.base.balance.hp;
		//Health from Passive Skill Tree
		t_hp += this.totalP.get(0) || 0;
		//Health Increased from Passive Skill Tree
		t_hp *= (1 + 0.01 * (this.totalP.get(1) || 0.00));
		//Health Multiplied from Passive Skill Tree
		t_hp *= Math.pow(1.01,this.totalP.get(2) || 0);
		return Math.floor(t_hp);
	}

	getMP() {
		//Mana from standard value
		let t_mp = this.base.mp;
		//Mana from Power
		t_mp += this.power * this.base.power.mp;
		//Mana from Might
		t_mp += this.might * this.base.might.mp;
		//Mana from Focus
		t_mp += this.focus * this.base.focus.mp;
		//Mana from Stamina
		t_mp += this.stamina * this.base.stamina.mp;
		//Mana from Arcane
		t_mp += this.arcane * this.base.arcane.mp;
		//Mana from Balance
		t_mp += this.balance * this.base.balance.mp;
		//Mana from Passive Skill Tree
		t_mp += this.totalP.get(15) || 0;
		//Mana Increased from Passive Skill Tree
		t_mp *= (1 + 0.01 * (this.totalP.get(16) || 0.00));
		//Mana Multiplied from Passive Skill Tree
		t_mp *= Math.pow(1.01,this.totalP.get(17) || 0);
		return Math.floor(t_mp);
	}

	getAP() {
		//Armor from standard value
		let t_ap = this.base.ap;
		//Armor from Power
		t_ap += this.power * this.base.power.ap;
		//Armor from Might
		t_ap += this.might * this.base.might.ap;
		//Armor from Focus
		t_ap += this.focus * this.base.focus.ap;
		//Armor from Stamina
		t_ap += this.stamina * this.base.stamina.ap;
		//Armor from Arcane
		t_ap += this.arcane * this.base.arcane.ap;
		//Armor from Balance
		t_ap += this.balance * this.base.balance.ap;
		//Armor from Passive Skill Tree
		t_ap += this.totalP.get(3) || 0;
		//Armor Increased from Passive Skill Tree
		t_ap *= (1 + 0.01 * (this.totalP.get(4) || 0.00));
		//Armor Multiplied from Passive Skill Tree
		t_ap *= Math.pow(1.01,this.totalP.get(5) || 0);
		return Math.floor(t_ap);
	}

	getMaxAtk() {
		//Max from standard value
		let max = this.base.max;
		//Max from Power
		max += this.power * this.base.power.max;
		//Max from Might
		max += this.might * this.base.might.max;
		//Max from Focus
		max += this.focus * this.base.focus.max;
		//Max from Stamina
		max += this.stamina * this.base.stamina.max;
		//Max from Arcane
		max += this.arcane * this.base.arcane.max;
		//Max from Balance
		max += this.balance * this.base.balance.max;
		//Max from Passive Skill Tree
		max += (this.totalP.get(6) || 0) + (this.totalP.get(30) || 0);
		//Max Increased from Passive Skill Tree
		max *= (1 + 0.01 * ((this.totalP.get(7) || 0.00) + (this.totalP.get(31) || 0.00)));
		//Max Multiplied from Passive Skill Tree
		max *= Math.pow(1.01,(this.totalP.get(8) || 0) + (this.totalP.get(32) || 0));
		return Math.floor(max);
	}

	getMinAtk() {
		//Min from standard value
		let min = this.base.min;
		//Min from Power
		min += this.power * this.base.power.min;
		//Min from Might
		min += this.might * this.base.might.min;
		//Min from Focus
		min += this.focus * this.base.focus.min;
		//Min from Stamina
		min += this.stamina * this.base.stamina.min;
		//Min from Arcane
		min += this.arcane * this.base.arcane.min;
		//Min from Balance
		min += this.balance * this.base.balance.min;
		//Min from Passive Skill Tree
		min += (this.totalP.get(6) || 0) * 0.5;
		//Min Increased from Passive Skill Tree
		min *= (1 + 0.01 * (this.totalP.get(7) || 0.00));
		//Min Multiplied from Passive Skill Tree
		min *= Math.pow(1.01,this.totalP.get(8) || 0);
		return Math.floor(min);
	}

	getCritRate() {
		//Critical Rate from standard value
		let crate = this.base.crate;
		//Critical Rate from Power
		crate += this.power * this.base.power.crate;
		//Critical Rate from Might
		crate += this.might * this.base.might.crate;
		//Critical Rate from Focus
		crate += this.focus * this.base.focus.crate;
		//Critical Rate from Stamina
		crate += this.stamina * this.base.stamina.crate;
		//Critical Rate from Arcane
		crate += this.arcane * this.base.arcane.crate;
		//Critical Rate from Balance
		crate += this.balance * this.base.balance.crate;
		//Critical Rate from Passive Skill Tree
		crate += this.totalP.get(12) || 0;
		//Critical Rate Increased from Passive Skill Tree
		crate *= (1 + 0.01 * (this.totalP.get(13) || 0.00));
		//Critical Rate Multiplied from Passive Skill Tree
		crate *= Math.pow(1.01,this.totalP.get(14) || 0);
		crate *= Math.pow(0.80,this.totalP.get(36) || 0);
		return Math.floor(crate);
	}

	getCritDmg() {
		//Critical Damage (Percent and Flat) from standard value
		let cdmgp = this.base.cdmgp, cdmgf = this.base.cdmgf;
		//Critical Damage (Percent and Flat) from Power
		cdmgp += this.power * this.base.power.cdmgp;
		cdmgf += this.power * this.base.power.cdmgf;
		//Critical Damage (Percent and Flat) from Might
		cdmgp += this.might * this.base.might.cdmgp;
		cdmgf += this.might * this.base.might.cdmgf;
		//Critical Damage (Percent and Flat) from Focus
		cdmgp += this.focus * this.base.focus.cdmgp;
		cdmgf += this.focus * this.base.focus.cdmgf;
		//Critical Damage (Percent and Flat) from Stamina
		cdmgp += this.stamina * this.base.stamina.cdmgp;
		cdmgf += this.stamina * this.base.stamina.cdmgf;
		//Critical Damage (Percent and Flat) from Arcane
		cdmgp += this.arcane * this.base.arcane.cdmgp;
		cdmgf += this.arcane * this.base.arcane.cdmgf;
		//Critical Damage (Percent and Flat) from Balance
		cdmgp += this.balance * this.base.balance.cdmgp;
		cdmgf += this.balance * this.base.balance.cdmgf;
		//Critical Damage (Percent and Flat) from Passive Skill Tree
		cdmgp += this.totalP.get(33) || 0;
		cdmgf += this.totalP.get(9) || 0;
		//Critical Damage Increased (Percet and Flat) from Passive Skill Tree
		cdmgp *= (1 + 0.01 * (this.totalP.get(34) || 0));
		cdmgf *= (1 + 0.01 * (this.totalP.get(10) || 0));
		//Critical Damage Multiplied (Percent and Flat) from Passive Skill Tree
		cdmgp *= Math.pow(1.01,this.totalP.get(35) || 0);
		cdmgf *= Math.pow(1.01,this.totalP.get(11) || 0);
		cdmgf *= Math.pow(1.20,this.totalP.get(36) || 0);
		return [Math.floor(cdmgp * 100) / 100., Math.floor(cdmgf)];
	}

	getPenetration() {
		//Penetration from standard value
		let pen = this.base.pen;
		//Penetration from Power
		pen += this.power * this.base.power.pen;
		//Penetration from Might
		pen += this.might * this.base.might.pen;
		//Penetration from Focus
		pen += this.focus * this.base.focus.pen;
		//Penetration from Stamina
		pen += this.stamina * this.base.stamina.pen;
		//Penetration from Arcane
		pen += this.arcane * this.base.arcane.pen;
		//Penetration from Balance
		pen += this.balance * this.base.balance.pen;
		//Penetration from Passive Skill Tree
		pen += this.totalP.get(21) || 0;
		//Penetration Increased from Passive Skill Tree
		pen *= (1 + 0.01 * (this.totalP.get(22) || 0.00));
		//Penetration Multiplied from Passive Skill Tree
		pen *= Math.pow(1.01,this.totalP.get(23) || 0);
		return Math.floor(pen);
	}

	getMagic() {
		//Magic from standard value
		let magic = this.base.magic;
		//Magic from Power
		magic += this.power * this.base.power.magic;
		//Magic from Might
		magic += this.might * this.base.might.magic;
		//Magic from Focus
		magic += this.focus * this.base.focus.magic;
		//Magic from Stamina
		magic += this.stamina * this.base.stamina.magic;
		//Magic from Arcane
		magic += this.arcane * this.base.arcane.magic;
		//Magic from Balance
		magic += this.balance * this.base.balance.magic;
		//Magic from Passive Skill Tree
		magic += this.totalP.get(18) || 0;
		//Magic Increased from Passive Skill Tree
		magic *= (1 + 0.01 * (this.totalP.get(19) || 0));
		//Magic Multiplied from Passive Skill Tree
		magic *= Math.floor(1.01,this.totalP.get(20) || 0);
		return Math.floor(magic);
	}

	getDR() {
		//Damage Reduction from Passive Skill Tree
		let dr = this.totalP.get(24) || 0;
		//Damage Reduction Increased from Passive Skill Tree
		dr *= (1 + 0.01 * (this.totalP.get(25) || 0.00));
		//Damage Reduction Multiplied from Passive Skill Tree
		dr *= Math.pow(1.01,this.totalP.get(26) || 0);
		return dr;
	}

	getEXPBonus() {
		//EXP Extra | EXP Increased | EXP Multiplier
		return [this.totalP.get(27) || 0, (this.totalP.get(28) || 0) * 0.01, Math.pow(1.10,this.totalP.get(29) || 0)];
	}

	setPassive(p) {
		this.t1 = p.t1;
		this.t2 = p.t2;
		this.t3 = p.t3;
		this.t4 = p.t4;
		this.ls = p.ls;
	}

	decodePassives() {
		//Combine all passives into single line
		let pStr = `${this.t1?this.t1:''}${this.t2?this.t2:''}${this.t3?this.t3:''}${this.t4?this.t4:''}${this.ls?this.ls:''}`;
		const m = new Map();
		//Obtain the directory of passive library Prepare
		const path = '/home/arcrania/config/skill/passive/';
		const { lstatSync, readdirSync} = require('fs');
		const { join} = require('path');
		const isDirectory = source => lstatSync(source).isDirectory();
		const getDirectories = source => readdirSync(source).map(name => join(source, name)).filter(isDirectory);
		const fx = require('../../cmd/method/modules.js');
		//Initiate dir search
		let sub = getDirectories(path),pc;
		for(let i=0;i<sub.length;i++) {
			pc=require('require-all')({
				dirname: sub[i]
			});
			for(const k in pc) {
				for(let key in pc[k]) {
					//Keeplooping until  no more class of [key] in the passive [pStr]
					//Input into map of Key -> ValueID, Value -> Sum of LEVEL * Amount
					//Obtainable from stat of CID
					while(pStr.indexOf(key) !== -1) {
						let segIndex = pStr.indexOf(key);
						let level = fx.b32_to_dec(pStr.substring(segIndex+2,segIndex+5));
						let perks = pc[k][key].stat[fx.b32_to_dec(pStr.substring(segIndex+1,segIndex+2))];
						//Insert into the total Map
						//Basic perk
						m.set(perks[0][0],(m.get(perks[0][0])?m.get(perks[0][0]):0)+perks[0][1]*level);
						//Veteran perk
						if(level >= 100 && perks.length > 1)
							m.set(perks[1][0],(m.get(perks[1][0])?m.get(perks[1][0]):0)+perks[1][1]*Math.floor(level/100));
						//Bonus perk
						if(level >= 500 && perks.length > 2)
							m.set(perks[2][0],(m.get(perks[2][0])?m.get(perks[2][0]):0)+perks[2][1]*Math.floor(level/500));
						//Remove the segment from the string [pStr]
						pStr = pStr.substring(0,segIndex) + pStr.substring(segIndex+5,pStr.length);
					}
					if(!pStr.length)
						break;
				}
				if(!pStr.length)
					break;
			}
			if(!pStr.length)
				break;
		}
		this.totalP = m;
	}
}

module.exports = Player