const sql = require('./method/connect.js');
const fx = require('./method/modules.js');

module.exports.help = {
	"name" : "cook"
}

module.exports.run = async (bot, msg, arg) => {
	let userID = msg.author.id, db,skip,r,pinfo,inv,au = new Array(),ad = new Array(),ul=new Array(),product;

	sql.database_connect().then(con => {
		db = con;
		return db.query(`SELECT * FROM player_info WHERE player_id = '${userID}'`);
	}).then(res => {
		if(!res[0]) {
			skip = true;
			return ;
		}
		//Check if item listed is player's
		if(arg[0] && arg[0].toLowerCase() !== 'recipe') {
			let str = new Array();
			for(let i = 0; i < arg.length; i++) {
				str.push(fx.b32_to_dec(arg[i]));
			}
			return db.query(`SELECT * FROM player_inventory WHERE player_id = '${userID}' AND inventory_id IN (${str.join(',')})`);
		} else if(arg[0] === '?') {
			//OUTPUT HOW THIS CMD WORK
			msg.reply(`To cook an item, input it as argument. Example: \`>>cook [Code from bag]\`. Recipes must include all of main ingredients to cook and some have optional ingredient to boost up the product.`);
		} else if(arg[0] && arg[0].toLowerCase() === 'recipe') {
			//OUTPUT LIST OF RECIPES HERE
			msg.reply(recipeBookEmbed());
		}
		skip = true;
		return;
	}).then(res => {
		if(skip) return;
		if(!res[0] || (res[0] && (res.length !== arg.filter((v,i,s) => s.indexOf(v) === i).length))) {
			msg.reply(`You either do not have those ingredients or the ingredient code is incorrect.`);
			skip = true;
			return;
		}
		//Fetch the recipe book and check for valid recipe
		r = findRecipe(bagToIid(arg,res));
		if(!r) {
			msg.reply(`There is no recipe for those ingredient combination`);
			skip = true;
			return;
		}
		inv = res;
		//Grab player's cooking level
		return db.query(`SELECT cooking_level, cooking_exp FROM player_life_skill WHERE player_id = '${userID}'`);
	}).then(res => {
		if(skip) return;
		pinfo = res[0];
		product = cook(inv,arg,r,pinfo.cooking_level);
		if(pinfo.cooking_exp + product.exp >= fx.cookLvlNext(pinfo.cooking_level)) {
			pinfo.cooking_exp = pinfo.cooking_exp + product.exp - fx.cookLvlNext(pinfo.cooking_level);
			pinfo.cooking_level += 1;
		} else
			pinfo.cooking_exp += product.exp;
		//Update player's cooking status
		return db.query(`UPDATE player_life_skill SET cooking_level = ${pinfo.cooking_level}, cooking_exp = ${pinfo.cooking_exp} WHERE player_id = '${userID}'`);
	}).then(() => {
		if(skip) return;
		//Combine argument and delete them from player inventory
		let m = new Map();
		for(let i = 0; i < arg.length; i++)
			m.set(fx.b32_to_dec(arg[i]), (m.get(fx.b32_to_dec(arg[i])) || 0) + 1);
		let b = bagToAmount(inv);
		m.forEach((v,k) => {
			if(b.get(k) > v) {
				au.push(`WHEN ${k} THEN ${b.get(k) - v}`);
				ul.push(k);
			}
			else
				ad.push(k);
		});
		if(au.length)
			return db.query(`UPDATE player_inventory SET amount = CASE inventory_id ${au.join(' ')} ELSE amount END WHERE player_id = '${userID}' AND inventory_id IN (${ul.join(',')})`);
		else
			return ;
	}).then(() => {
		if(skip) return;
		if(ad.length)
			return db.query(`DELETE FROM player_inventory WHERE player_id = '${userID}' AND inventory_id IN (${ad.join(',')})`);
		else
			return;
	}).then(() => {
		if(skip) return;
		//Put the new item into player's inventory
		msg.reply(`You cooked up a(n) ${product.name}! (Value: ${product.value})`);
		return db.query(`INSERT INTO player_inventory (player_id,item_id,amount,arg_1,cost) VALUES ('${userID}',${product.id},1,${product.value},${product.cost})`);
	}).then(() => {
		return db.end();
	}).catch(e => {
		if(db && db.end) db.end();
		console.log(e);
	})
}

const recipeBookEmbed = () => {
	const Discord = require('discord.js');
	let recipes = require('../config/recipe/recipe.json').cooking, prods = new Array();
	let foods = require('../config/item/consumable/food.json');
	for(let i = 0; i < recipes.ingredient.length; i++)
		prods.push({"name":foods.item_name[recipes.prod[i]-foods.item_id[0]], "ing":recipes.iName[i], "optw":recipes.opt_type[i], "optn":recipes.opt_num[i]});
	const embed = new Discord.RichEmbed()
		.setTitle('Recipe Book')
		.setColor([102,153,255]);
	for(let i = 0; i < prods.length; i++)
		embed.addField(prods[i].name, `Main Ingredients: ${prods[i].ing}\nOptional Ingredients: ${prods[i].optw}\nOptional Limits: ${prods[i].optn}`);
	return embed;
}

const bagToAmount = bag => {
	const m = new Map();
	for(let i = 0; i < bag.length; i++)
		m.set(bag[i].inventory_id, bag[i].amount);
	return m;
}

const cook = (bag, ing, prod, lvl) => {
	//Cooking product value:
	//Sum(ingredients.value) + 5% per optional + product.value + cooking level bonus
	//Cost:
	//Sum(ingredient.cost) + product.cost
	//Grab production item
	let food = require('../config/item/consumable/food.json');
	let index = prod.id - food.item_id[0];
	let ingv = bagToValue(ing,bag).reduce((a,b) => a+b);
	let totalv = ingv + food.value[index] + cookingBonus(lvl);
	let ingc = bagToCost(ing,bag).reduce((a,b) => a+b);
	let totalc = ingc + food.cost[index];
	return {"id":prod.id,"exp":prod.exp,"value":totalv,"cost":totalc,"name":food.item_name[index]}
}

const cookingBonus = lvl => {
	let chef = require('../config/recipe/recipe.json').cooking_level;
	return Math.floor(chef.add * lvl * (1 + chef.mult * Math.floor(lvl/chef.multp)));
}

const bagToValue = (code,inv) => {
	const m = new Map(), a = new Array();
	for(let i = 0; i < inv.length; i++)
		m.set(inv[i].inventory_id, inv[i].arg_1);
	for(let i = 0; i < code.length; i++)
		a.push(m.get(fx.b32_to_dec(code[i])));
	return a;
}

const bagToCost = (code,inv) => {
	const m = new Map(), a = new Array();
	for(let i = 0; i < inv.length; i++)
		m.set(inv[i].inventory_id, inv[i].cost);
	for(let i = 0; i < code.length; i++)
		a.push(m.get(fx.b32_to_dec(code[i])));
	return a;
}

const bagToIid = (code,inv) => {
	const m = new Map(), a = new Array();
	for(let i = 0; i < inv.length; i++) 
		m.set(inv[i].inventory_id, inv[i].item_id);
	for(let i = 0; i < code.length; i++)
		a.push(m.get(fx.b32_to_dec(code[i])));
	return a;
}

const findRecipe = ing => {
	let recipes = require('../config/recipe/recipe.json').cooking;
	//Check for Main Ingredient
	let mainIndex = new Array(), filledMain = new Set(), r;
	for(let i = 0; i < recipes.ingredient.length; i++) {
		let mains = recipes.ingredient[i].split('+');
		for(let j = 0; j < mains.length; j++) {
			for(let k = 0; k < ing.length; k++) {
				if(isGoodIngredient(fx.b32_to_dec(ing[k]),mains[j])) {
					mainIndex.push(k);
					filledMain.add(j);
				}
			}
		}
		if(!(mainIndex.length === mains.length && filledMain.size === mains.length)) {
			mainIndex = new Array();
			filledMain.clear();
		} else {
			r = {"id":recipes.prod[i], "exp": recipes.exp[i]};
			break;
		}
	}
	if(filledMain.size && mainIndex.length)
		return r;
	else
		return false;
}

const isGoodIngredient = (id, sel) => {
	let ranges = sel.split(',');
	for(let i = 0; i < ranges.length; i++) {
		let hilo = ranges[i].split('-');
		if(fx.within(parseInt(hilo[0]),parseInt(hilo[1]),id))
			return true;
	}
	return false;
}