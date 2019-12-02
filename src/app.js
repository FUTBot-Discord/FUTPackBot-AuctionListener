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
    console.log(`[a] [${message}] Expired.`);

    let aInfo = await getAuctionById(message);

    if (aInfo == null) return;

    if (aInfo.b_club_id == 0) {
      console.log(`[a] [${message}] No buyer was found.`);
      return resetTransferPlayer(message);
    }

    console.log(`[a] [${message}] Buyer(${aInfo.b_club_id}) has been found.`);

    await addCoinsToClub(aInfo.s_club_id, aInfo.current_bid);
    await auctionBuyNow(aInfo.id, aInfo.b_club_id);

    const pInfo = await getPlayerVersionById(aInfo.player_id);
    const pName = pInfo.meta_info.common_name
      ? pInfo.meta_info.common_name
      : `${pInfo.meta_info.first_name} ${pInfo.meta_info.last_name}`;

    redis.publish("auctionEnd", JSON.stringify(aInfo));
  });
}

init();

async function getAuctionById(auction_id) {
  let query = `{ getAuctionById(id: "${auction_id}") { id player_id b_club_id s_club_id current_bid start_price buy_now end_timestamp } }`;
  let res = await graphql.request(query);

  return res.getAuctionById;
}

async function resetTransferPlayer(aId) {
  let query = `mutation { resetTransferPlayer(auction_id: "${aId}") { id } }`;

  try {
    await graphql.request(query);
  } catch (e) {}

  return true;
}

async function addCoinsToClub(club_id, coins) {
  let query = `mutation { addCoinsToClub(club_id: "${club_id}", coins: "${coins}") { id } }`;

  try {
    await graphql.request(query);
  } catch (e) {
    console.log(e);
    return false;
  }

  return true;
}

async function auctionBuyNow(auction_id, club_id) {
  let query = `mutation { changeTransferPlayer(club_id: "${club_id}", auction_id: "${auction_id}") { id } }`;

  try {
    await graphql.request(query);
  } catch (e) {
    console.log(e);
    return false;
  }

  return true;
}

async function getPlayerVersionById(id) {
  let query = `{ getPlayerVersionById(id: ${id}) { def dri id nation_info{ img } pac pas phy meta_info{ common_name last_name first_name img } preferred_position rareflag rating sho min_price club_info{ img } } }`;
  let res = await graphql.request(query);

  return res.getPlayerVersionById;
}
