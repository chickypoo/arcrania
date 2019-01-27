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

		//Health Increased from Passive Skill Tree

		//Health Multiplied from Passive Skill Tree

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

		//Mana Increased from Passive Skill Tree

		//Mana Multiplied from Passive Skill Tree

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

		//Armor Increased from Passive Skill Tree

		//Armor Multiplied from Passive Skill Tree

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

		//Max Increased from Passive Skill Tree

		//Max Multiplied from Passive Skill Tree

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

		//Min Increased from Passive Skill Tree

		//Min Multiplied from Passive Skill Tree

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

		//Critical Rate Increased from Passive Skill Tree

		//Critical Rate Multiplied from Passive Skill Tree

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

		//Critical Damage Increased (Percet and Flat) from Passive Skill Tree

		//Critical Damage Multiplied (Percent and Flat) from Passive Skill Tree

		return [Math.floor(cdmgp), Math.floor(cdmgf)];
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

		//Penetration Increased from Passive Skill Tree

		//Penetration Multiplied from Passive Skill Tree

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

		//Magic Increased from Passive Skill Tree

		//Magic Multiplied from Passive Skill Tree

		return Math.floor(magic);
	}
}

module.exports = Player