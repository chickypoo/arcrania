const bot_setting = require("./config/bot.json");
const gatherer = require("./cmd/method/gather.js").process_gathering;
const merger = require("./cmd/method/merge.js").merge_inventory;

const Discord = require("discord.js");
const bot = new Discord.Client();
const fs = require("fs");

bot.commands = new Discord.Collection();

fs.readdir("./cmd/", (err, files) => {
	if(err) console.error(err);
	let jsfiles = files.filter(f => f.split(".").pop() === "js");
	if(jsfiles.length <= 0){
		console.log("No cmd available.");
		return;
	}
	console.log(`There are total ${jsfiles.length} cmd to be loaded.`);
	jsfiles.forEach((f, i) => {
		let props = require(`./cmd/${f}`);
		bot.commands.set(props.help.name, props);
		console.log(`Loaded ${props.help.name}.js!`);
	});
});

bot.on("ready", () => {
	bot.generateInvite(["ADMINISTRATOR"]).then(link => console.log(link)).catch(err => console.log(err.stack));
	bot.user.setPresence({ game: { name: `${bot_setting.prefix}join to register!`, type: 0 } });

	//Process all fishing / mining / woodcutting for those that has passed the time.
	//setInterval(gatherer, 1000);
	//Merge inventory of same player
	setInterval(merger, 10000);
});

bot.on("message", async message => {
	if(message.author.bot) return;

	let messages = message.content.split(" ");
	let command = messages[0].toLowerCase();
	let args = messages.slice(1);

	if(!command.startsWith(bot_setting.prefix)) return;

	let cmd = bot.commands.get(command.slice(bot_setting.prefix.length));
	if(cmd) {
		cmd.run(bot, message, args);
	}
});

bot.on("error", e => {
	let d = new Date();
	fs.writeFile(`./error_logs/${d.getMonth()+1}-${d.getDate()}-${d.getHours()}:${d.getMinutes()}`, e, err => {
		if(err)
			return console.log(err);
		console.log("Error Log Saved");
	});
});

bot.login(bot_setting.token);