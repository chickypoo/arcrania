let bag_max = require('../../config/status.json').basic.bag_limit;
let sql = require('./connect.js');
let fx = require('./modules.js');

let mining_stat = require('../../config/status.json').mining;

const { lstatSync, readdirSync} = require('fs');
const { join} = require('path');
const isDirectory = source => lstatSync(source).isDirectory();
const getDirectories = source => readdirSync(source).map(name => join(source, name)).filter(isDirectory);
const passive_path = '/home/arcrania/config/skill/passive/';

module.exports = {
	process_fisher : () => {
		let db, skip, fisher_list = [], item_db_fish, bonus, field, item, if_con= [], b_con = [], temp_con;

		sql.database_connect().then(con => {
			db = con;
			//Retrieve list of players who is gathering [fishing/mining/woodcutting]
			return db.query(`SELECT location as place, what, l.*, lifeskill FROM player_life_skill l JOIN timer t ON l.player_id = t.player_id JOIN player_info i ON i.player_id = t.player_id JOIN player_passive p ON p.player_id = t.player_id WHERE expiry <= CURRENT_TIMESTAMP() AND what IN ('fishing', 'woodcutting')`);
		}).then(result => {		
			if(!result[0]){
				skip = true;
				return;
			}
			console.log("Processing fisher");
			//Push all gatherer here
			result.forEach(e => {
				if(e.what == 'fishing')
					fisher_list.push(e);
			});
			//Process fishing list here
			item_db_fish = require('../../config/item/raw/fish.json');
			fisher_list.forEach(e => {
				let m = extractTotalBonus(passiveSplit(e.lifeskill));
				//Calculate the fishing bonus
				field = require(`../../config/field/${e.place}.json`);
				bonus = Math.floor(level_bonus('fishing', e.fishing_level, m) * field.fishing_bonus);
				//Calculate the fish rolled with the bonus
				item = roll_fish(bonus, item_db_fish, m);
				//Calculate experience and level change  [37]
				let level = e.fishing_level, exp = e.fishing_exp + item[3] + (m.get(37) || 0);
				if(exp >= gather_exp_next(level)) {
					//Levels up
					exp -= gather_exp_next(level++);
				}
				//Player ID | Level | EXP
				if_con.push([e.player_id, level, exp]);
				//Player ID | Item ID | Item Value | NPC Sale | Action Type
				b_con.push([e.player_id, item[0], item[1], item[2], e.what]);
			});
			//Update player's experience and level for fishing
			//extract index give me arrays
			let sql_set_case_level = `fishing_level = CASE player_id `;
			let sql_set_case_exp = `fishing_exp = CASE player_id `;
			let sql_where_player_id = `player_id IN (`, temp_str_arr = [];
			for(let i = 0; i < if_con.length; i++) {
				sql_set_case_level += `WHEN ${if_con[i][0]} THEN ${if_con[i][1]} `;
				sql_set_case_exp += `WHEN ${if_con[i][0]} THEN ${if_con[i][2]} `;
				temp_str_arr.push(`'${if_con[i][0]}'`);
			}
			sql_set_case_level += `ELSE fishing_level END`;
			sql_set_case_exp += `ELSE fishing_exp END`;
			sql_where_player_id += `${temp_str_arr.join(', ')})`;
			//Return the total SQL Query
			return db.query(`UPDATE player_life_skill SET ${sql_set_case_level}, ${sql_set_case_exp} WHERE ${sql_where_player_id}`);
		}).then(() => {
			if(skip)
				return;
			//Grab player's inventory bag count
			return db.query(`SELECT SUM(amount) AS inbag, player_id FROM player_inventory WHERE player_id IN (${spread_out_with(extract_index_list(b_con, 0), ',', true)}) GROUP BY player_id`);
		}).then(results => {
			if(skip)
				return;
			//Insert item into player's inventory
			//Checks whos bag is full from query
			let unfilter = results.length || 0;
			temp_con = JSON.parse(JSON.stringify(b_con));
			for(let i = 0; i < results.length; i++) {
				if(results[i].inbag >= bag_max) {
					//Remove the player from this container
					for(let j = 0; j < b_con.length; j++) {
						if(b_con[j][0] == results[i].player_id) {
							b_con.splice(j, 1);
							break;
						}
					}
				}
			}
			//B_CON should now be item able to be place into inventories
			let insert_data = [];
			for(let i = 0; i < b_con.length; i++) {
				insert_data.push(`('${b_con[i][0]}', ${b_con[i][1]}, 1, ${b_con[i][3]}, ${b_con[i][2]})`);
			}
			if(!insert_data.length)
				return;
			return db.query(`INSERT INTO player_inventory (player_id, item_id, amount, cost, arg_1) VALUES ${insert_data.join(', ')}`);
		}).then(() => {
			if(skip)
				return;
			//Drop the timer from the table
			return db.query(`DELETE FROM timer WHERE player_id IN (${spread_out_with(extract_index_list(temp_con, 0), ',', true)}) AND expiry <= CURRENT_TIMESTAMP() AND what IN (${spread_out_with(extract_index_list(temp_con, 4), ',', true)})`);
		}).then(() => {
			if(skip)
				return;
			//Change the action back to free/idle
			return db.query(`UPDATE player_info SET player_act = 'free' WHERE player_id IN (${spread_out_with(extract_index_list(temp_con, 0), ',', true)})`);
		}).then(() => {
			//Close the connection
			return db.end();
		}).catch(err => {
			if(db && db.end) db.end();
			console.log(err);
		});
	},

	process_miner : () => {
		let db, skip, miners, field = new Map(), miner_exp = new Map(), sql_id = [], insert_loot = [], can_give = new Map(), id = [];

		sql.database_connect().then(con => {
			db = con;
			//Fetch all miners who has done their time quota and their location
			//ATTACH PLAYER PASSIVE SKILL TREE HERE
			let sql_select = `SELECT t.player_id, p.location, l.mining_level, l.mining_exp`;
			let sql_from = `FROM timer t JOIN player_info p ON t.player_id = p.player_id JOIN player_life_skill l ON t.player_id = l.player_id`;
			let sql_where = `WHERE t.what = 'mining' AND t.expiry <= CURRENT_TIMESTAMP()`;
			return db.query(`${sql_select} ${sql_from} ${sql_where}`);
		}).then(res => {
			//RES contains player_id, location, mining_level and mining_exp
			if(!res[0]) {
				//There is no miners to process
				skip = true;
				return;
			}
			miners = res;
			//Find all field mining bonus and their rock rate
			miners.forEach(e => {
				//Fetch the field of current miner
				let cur_field = require(`../../config/field/${e.location}.json`);
				field.set(e.location, {"threshold" : cur_field.mining_threshold, "loot" : cur_field.mining_rock_drop});
			});
			//Calculate the loot drop
			//Open up rock datas
			let rock = require('../../config/item/raw/rock.json');
			miners.forEach(e => {
				//Threshold check
				if(mining_stat.base + mining_stat.inc * e.mining_level >= field.get(e.location).threshold) {
					//Roll what is mined
					let roll = fx.random(0, 1000);
					let lootables = field.get(e.location).loot;
					for(let i = 0; i < lootables.length; i++) {
						if(roll <= parseInt(lootables[i].split('-')[1])) {
							//This loot is rolled
							//Value of the rock is adjusted here
							let value = rock.value[(parseInt(lootables[i].split('-')[0]) - rock.item_id[0])] + e.mining_level;
							//Build the SQL for insert
							insert_loot.push(`('${e.player_id}', ${lootables[i].split('-')[0]}, 1, ${rock.cost[(parseInt(lootables[i].split('-')[0]) - rock.item_id[0])]}, ${value})`);
							//Insert the experience for the miner
							miner_exp.set(String(e.player_id), rock.exp[(parseInt(lootables[i].split('-')[0]) - rock.item_id[0])]);
							//Build SQL for player_id
							sql_id.push(`'${String(e.player_id)}'`);
							//Push those that can give item to a save
							can_give.set(`'${String(e.player_id)}'`, true);
							break;
						} else {
							roll -= parseInt(lootables[i].split('-')[1]);
							continue;
						}
					}
				}
			});
			//Checks players thats has spare inventory slot
			return db.query(`SELECT player_id, SUM(amount) AS amount FROM player_inventory WHERE player_id IN (${sql_id.join(',')}) GROUP BY player_id`);
		}).then(res => {
			if(skip) return;
			if(!res[0])
				return db.query(`INSERT INTO player_inventory (player_id, item_id, amount, cost, arg_1) VALUES ${insert_loot.join(',')}`);
			//There are some miner with inventories
			for(let i = 0; i < res.length; i++)
				if(res[i].amount >= bag_max)
					can_give.set(`'${String(res[i].player_id)}'`, false);
			//Compile those who can get loot
			let insert_sql = [];
			for(let i = 0; i < insert_loot.length; i++)
				if(can_give.get(`${insert_loot[i].split(',')[0].slice(1)}`))
					insert_sql.push(insert_loot[i]);
			if(!insert_sql.length)
				return;
			return db.query(`INSERT INTO player_inventory (player_id, item_id, amount, cost, arg_1) VALUES ${insert_sql.join(',')}`);
		}).then(() => {
			if(skip) return;
			//Update player's experience and level in mining
			let sql_set_level = 'mining_level = CASE player_id ';
			let sql_set_exp = 'mining_exp = CASE player_id ';
			let sql_where = `WHERE player_id IN (`, miners_id = [];
			miners.forEach(e => {
				let exp_add = miner_exp.get(String(e.player_id));
				let exp_next = gather_exp_next(e.mining_level);
				let updated = {
					"level" : ((exp_next <= (e.mining_exp + exp_add)) ? e.mining_level + 1 : e.mining_level),
					"exp" : ((exp_next <= (e.mining_exp + exp_add)) ? e.mining_exp + exp_add - exp_next : e.mining_exp + exp_add)
				};
				sql_set_level += `WHEN ${e.player_id} THEN ${updated.level} `;
				sql_set_exp += `WHEN ${e.player_id} THEN ${updated.exp} `;
				miners_id.push(`'${e.player_id}'`);
			});
			sql_set_level += `ELSE mining_level END`;
			sql_set_exp += `ELSE mining_exp END`;
			sql_where += `${miners_id.join(',')})`;
			return db.query(`UPDATE player_life_skill SET ${sql_set_level}, ${sql_set_exp} ${sql_where}`);
		}).then(() => {
			if(skip) return;
			//Drop all player from the timer list that is mining
			miners.forEach(e => {
				id.push(`'${e.player_id}'`);
			});
			return db.query(`DELETE FROM timer WHERE what = 'mining' AND player_id IN (${id.join(',')})`);
		}).then(() => {
			if(skip) return;
			//Return all state of player to free
			return db.query(`UPDATE player_info SET player_act = 'free' WHERE player_id IN (${id.join(',')})`);
		}).then(() => {
			//Close database connection
			return db.end();
		}).catch(e => {
			if(db && db.end) db.end();
			console.log(e);
		});
	}
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
						if(level >= 100)
							statMap.set(stat[1][0], stat[1][1] * Math.floor(level / 100) + (statMap.get(stat[1][0]) ? statMap.get(stat[1][0]) : 0));
						//Second threshold is per 500 passive level
						if(level >= 500)
							statMap.set(stat[2][0], stat[2][1] * Math.floor(level / 500) + (statMap.get(stat[2][0]) ? statMap.get(stat[2][0]) : 0));
					});
		}
	}
	return statMap;
}

const extract_index_list = (list, index) => {
	let new_list = [];
	for(let i = 0; i < list.length; i++) {
		new_list.push(list[i][index]);
	}
	return new_list;
}

const spread_out_with = (list, str, contained = false) => {
	let output = `${contained ? `'` : ``}${list[0]}${contained ? `'` : ``}`;
	for(let i = 1; i < list.length; i++)
		output += `${str} ${contained ? `'` : ``}${list[i]}${contained ? `'` : ``}`;
	return output;
}

const gather_exp_next = level => {
	let base = 10;
	for(let i = 1; i <= level / 10; i++)
		base += i;
	return base;
}

const level_bonus = (type, value, p) => {
	/* [38] Fishing Value = initial starting points
	 * [43] Fishing Range = Variance value range up
	 * [44] Fishing Power = More chance to increase
	 * [46] Fishing Base = More base variance
	 */
	switch(type) {
		case 'fishing' : 
			let increment = 0.5, total = p.get(38) || 0;
			//Level Bonus
			for(let i = 0; i < value + (p.get(44) || 0); i++) {
				total += increment;
				increment += (i / 5) * 0.05;
			}
			//Variance (-20% ~ 20% + passive)
			total = Math.floor(total * rand(
				(100 + (p.get(46) || 0)) * (80 + (p.get(43) || 0)) / 100., 
				(100 + (p.get(46) || 0)) * (120 + (p.get(43) || 0)) / 100.)/100.) ;
			return total;
	}
}

const roll_fish = (value, fishes, m) => {
	//Player has up to 75% chance to roll a next higher tier fish
	//Each successful roll decreases the pool by 50%
	//[45] Fishing Rarity is applied here for tier multi
	let chance_rolled, tier = 0, tier_max = fishes.item_id.length - 1, tierMulti = 1.00;
	for(let i = 0; i < fishes.item_id.length; i++) {
		chance_rolled = rand(0, 100);
		if(Math.min(value, 75) >= chance_rolled) {
			tier++;
			value *= 0.20;
			tierMulti *= (110 + (m.get(45) || 0)) / 100.;
		} else
			break;
	}
	tier = Math.min(tier, tier_max);
	return [fishes.item_id[tier], Math.floor(tierMulti * (fishes.value[tier] + Math.sqrt(value))), fishes.cost[tier], fishes.exp[tier]];
}

const rand = (min, max) => {
	return Math.random() * (max - min) + min;
}