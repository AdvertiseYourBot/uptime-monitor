import Model, { Ping } from "./Model";
import { Client, MessageEmbed } from "discord.js";
import moment from "moment";
import Axios from "axios";

const aybID = "450594207787384832";

export default async function (client: Client) {
  const ayb = client.guilds.cache.get(aybID);
  if (!ayb) throw new Error("AYB guild not found");

  const botsOfflineOverHour = [];

  const bots = client.users.cache
    .filter((u) => u.bot && ayb.members.cache.has(u.id))
    .array();
  for (const bot of bots) {
    const data =
      (await Model.findOne({ id: bot.id })) || new Model({ id: bot.id });
    const online = bot.presence.status !== "offline";

    data.pings.push(new Ping(online));
    data.online = online;
    data.lastCheck = new Date().toDateString();
    await data.save();

    const last3: Ping[] = last(data.pings, 3);
    if (
      last3[0]?.online === true &&
      last3[1]?.online === false &&
      last3[2]?.online === false &&
      !online
    ) {
      botsOfflineOverHour.push(bot);
    }
  }

  console.log(
    `[${moment().format("DD/MM/YYYY hh:mm:ss a")}] Checked ${bots.length} bots`
  );

  if (botsOfflineOverHour.length > 0) {
    const wh = await client
      .fetchWebhook(process.env.WH_ID, process.env.WH_TOKEN)
      .catch(() => {});
    const embed = new MessageEmbed()
      .setColor("RED")
      .setAuthor(
        `${botsOfflineOverHour.length} bot(s) went offline 60 minutes ago and have not recovered`
      )
      .setDescription(
        `${botsOfflineOverHour
          .map((b, i) => `**${i + 1}.** <@${b}> (${b.tag})`)
          .join("\n")}\n*There are a total of ${
          bots.filter((b) => b.presence.status !== "offline").length
        } bots offline`
      );
    if (wh) await wh.send(embed);
    else console.log(`[ERROR] Webhook not found`);
  }
}

function last(array: any[], n: number) {
  if (n == null) return array[array.length - 1];
  return array.slice(Math.max(array.length - n, 0));
}
