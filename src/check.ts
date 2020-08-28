import Model, { Ping } from "./Model";
import { Client } from "discord.js";
import moment from "moment";

const aybID = "450594207787384832";

export default async function (client: Client) {
  const ayb = client.guilds.cache.get(aybID);
  if (!ayb) throw new Error("AYB guild not found");

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
  }

  console.log(`[${moment().format("DD/MM/YYYY hh:mm:ss a")}] Checked ${bots.length} bots`);
}
