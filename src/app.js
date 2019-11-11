import { createClient } from "async-redis";
import { GraphQLClient } from "graphql-request";
import dotenv from "dotenv";
dotenv.config();

const graphql = new GraphQLClient(process.env.G_ENDPOINT, {
  headers: {}
});

const redis = createClient({
  host: process.env.REDIS_HOST,
  db: process.env.REDIS_DATABASE,
  retry_strategy: function(options) {
    if (options.error && options.error.code === "ECONNREFUSED") {
      return new Error("The server refused the connection");
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      return new Error("Retry time exhausted");
    }
    if (options.attempt > 10) {
      return undefined;
    }
    return Math.min(options.attempt * 100, 3000);
  }
});

async function init() {
  await redis.send_command("config", ["set", "notify-keyspace-events", "Ex"]);

  const expired_subKey =
    "__keyevent@" + process.env.REDIS_DATABASE + "__:expired";

  redis
    .subscribe(expired_subKey)
    .then(() => console.log("[i] Subscribed to " + expired_subKey));

  redis.on("message", async (channel, message) => {
    if (channel !== expired_subKey) return;
    console.log(`[e] [${message}] Expired.`);

    let aInfo = await getAuctionById(message);

    if (aInfo.b_club_id == 0) {
      console.log(`[r] [${message}] No buyer was found.`);
      return resetTransferPlayer(message);
    }

    console.log(`[t] [${message}] Buyer(${aInfo.b_club_id}) has been found.`);
  });
}

init();

async function getAuctionById(id) {
  let query = `{ getAuctionById(id: "${id}") { id player_id b_club_id s_club_id current_bid buy_now } }`;
  let res = await graphql.request(query);

  return res.getAuctionById;
}

async function resetTransferPlayer(aId) {
  let query = `mutation { resetTransferPlayer(auction_id: "${aId}") { id } }`;
  let res = await graphql.request(query);

  return true;
}
