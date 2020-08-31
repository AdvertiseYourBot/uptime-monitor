import { Client, MessageEmbed } from "discord.js";
import Cron from "node-cron";
import Model, { Ping, ModelInterface } from "./Model";
import Mongoose from "mongoose";
import Plotly from "plotly";
import { config } from "dotenv";

const interval = 20;
config();

const plot = Plotly(process.env.PLOTLY_USER, process.env.PLOTLY_KEY);
const client = new Client();
const prefix = "up!";

client.on("ready", () => console.log(`${client.user.tag} is online`));

client.on("message", async (msg) => {
  if (
    !msg.guild ||
    msg.webhookID ||
    msg.author.bot ||
    !msg.content.toLowerCase().startsWith(prefix)
  )
    return;

  const [command, ...args] = msg.content
    .slice(prefix.length)
    .trim()
    .split(/ +/gi);
  const cmd = command.toLowerCase();

  if (cmd === "uptime") {
    if (!args[0])
      return await msg.reply("Please supply a valid bot mention or ID");
    const bot = msg.mentions.users.first() || client.users.cache.get(args[0]);
    if (!bot || !bot.bot)
      return await msg.reply("Please supply a valid bot mention or ID");

    const data = await Model.findOne({ id: bot.id });
    if (!data)
      return await msg.reply(
        `That bot is not in our database. If you think it should be, please wait ${interval} minutes and try again`
      );

    const onlinePings = data.pings.filter((p) => p.online);
    const uptimePercent = round((onlinePings.length / data.pings.length) * 100);
    const colour =
      uptimePercent >= 90
        ? "GREEN"
        : uptimePercent < 90 && uptimePercent >= 50
        ? "GOLD"
        : uptimePercent < 50
        ? "RED"
        : "BLUE";

    const embed = new MessageEmbed()
      .setAuthor(bot.tag, bot.displayAvatarURL())
      .setColor(colour)
      .setTitle(`Last checked: ${data.lastCheck}`)
      .setDescription(
        `Please note this bot only updates every **${interval} minutes**. Results may not display an accurate reading of the bot's current status`
      )
      .addFields([
        {
          name: "Current Status",
          value: data.online ? "Online" : "Offline",
          inline: true,
        },
        {
          name: "Average Uptime",
          value: `${uptimePercent}%`,
          inline: true,
        },
        {
          name: "Total Pings",
          value: data.pings.length,
          inline: true,
        },
      ]);

    await getGraph(data, async (err, res) => {
      embed.setImage(`${res.url}.png`);
      await msg.channel.send(embed);
    });
  } else if (cmd === "help") {
    const embed = new MessageEmbed()
      .setColor("BLUE")
      .setDescription(
        `This bot monitors and logs the uptime of all bots in the Advertise Your Bot discord server. Every **${interval} minutes** the bot checks the statuses of the bots. Please note this does not abuse the Discord API because the checking of bot statuses doesn't send any extra requests. If your bot is appearing invisible it will log as offline.\n\nUse \`${prefix}uptime {bot}\` to check a bot's information`
      );
    await msg.channel.send(embed);
  }
});

function round(num: number) {
  return Math.round(num * 10) / 10;
}

async function getGraph(data: ModelInterface, cb: Function) {
  const pingsPerDay = (24 * 60) / interval;
  const uniqueDates = [...new Set(data.pings.map((p) => p.date))];
  const dayStats = {};
  for (const date of uniqueDates) {
    const pingsOnDate = data.pings.filter((p) => p.date === date && p.online).length;
    const percentOnDate = round((pingsOnDate / pingsPerDay) * 100);
    dayStats[date] = percentOnDate;
  }

  const graphData = [
    {
      x: Object.keys(dayStats),
      y: Object.values(dayStats),
      type: "line",
    },
  ];
  const layout = {
    fileopt: "overwrite",
    filename: `ayb_uptime`,
    format: "png",
  };
  await plot.plot(graphData, layout, cb);
}

Mongoose.connect(process.env.URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => client.login(process.env.TOKEN));

// 20 min: */20 * * * *
// 1 min: * * * * *
Cron.schedule("*/20 * * * *", () => require("./check").default(client));
