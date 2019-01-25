const bot_setting = require("./config/bot.json");
let regular = require("./cmd/method/gather.js");

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
	});
});

bot.on("ready", () => {
	bot.generateInvite(["ADMINISTRATOR"]).then(link => console.log(link)).catch(err => console.log(err.stack));

	setInterval(regular.process_gathering, 1000);
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
	fs.writeFile(`/error_logs/${d.getMonth()+1}-${d.getDate()}-${d.getHours()}:${d.getMinutes()}`, e, err => {
		if(err)
			return console.log(err);
		console.log("Error Log Saved");
	});
});

bot.login(bot_setting.token);