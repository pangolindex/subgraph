/* eslint-disable prefer-const */
import { log, Address } from "@graphprotocol/graph-ts";
import {
  PangolinFactory,
  Pair,
  PairCache,
  Token,
  Bundle,
} from "../generated/schema";
import { PairCreated } from "../generated/Factory/Factory";
import {
  FACTORY_ADDRESS,
  ZERO_BD,
  ZERO_BI,
  fetchTokenSymbol,
  fetchTokenName,
  fetchTokenDecimals,
  fetchTokenTotalSupply,
} from "./helpers";

export function handleNewPair(event: PairCreated): void {
  // load factory (create if first exchange)

  log.info('===============handleNewPair', [])

  let factory = PangolinFactory.load(FACTORY_ADDRESS);
  if (factory === null) {
    factory = new PangolinFactory(FACTORY_ADDRESS);
    factory.pairCount = 0;
    factory.totalVolumeETH = ZERO_BD;
    factory.totalLiquidityETH = ZERO_BD;
    factory.totalVolumeUSD = ZERO_BD;
    factory.untrackedVolumeUSD = ZERO_BD;
    factory.totalLiquidityUSD = ZERO_BD;
    factory.txCount = ZERO_BI;

    // create new bundle
    let bundle = new Bundle("1");
    bundle.ethPrice = ZERO_BD;
    bundle.save();
  }
  factory.pairCount = factory.pairCount + 1;
  factory.save();

  // create the tokens
  let token0 = Token.load(event.params.token0.toHexString());
  let token1 = Token.load(event.params.token1.toHexString());

  // fetch info if null
  if (token0 === null) {
    token0 = new Token(event.params.token0.toHexString());
    token0.symbol = fetchTokenSymbol(event.params.token0);
    token0.name = fetchTokenName(event.params.token0);
    token0.totalSupply = fetchTokenTotalSupply(event.params.token0);
    let decimals = fetchTokenDecimals(event.params.token0);
    // bail if we couldn't figure out the decimals
    if (decimals === null) {
      log.debug("mybug the decimal on token 0 was null", []);
      return;
    }

    token0.decimals = decimals;
    token0.derivedETH = ZERO_BD;
    token0.derivedUSD = ZERO_BD;
    token0.tradeVolume = ZERO_BD;
    token0.tradeVolumeUSD = ZERO_BD;
    token0.untrackedVolumeUSD = ZERO_BD;
    token0.totalLiquidity = ZERO_BD;
    // token0.allPairs = []
    token0.txCount = ZERO_BI;
  }

  // fetch info if null
  if (token1 === null) {
    token1 = new Token(event.params.token1.toHexString());
    token1.symbol = fetchTokenSymbol(event.params.token1);
    token1.name = fetchTokenName(event.params.token1);
    token1.totalSupply = fetchTokenTotalSupply(event.params.token1);
    let decimals = fetchTokenDecimals(event.params.token1);

    // bail if we couldn't figure out the decimals
    if (decimals === null) {
      return;
    }
    token1.decimals = decimals;
    token1.derivedETH = ZERO_BD;
    token1.derivedUSD = ZERO_BD;
    token1.tradeVolume = ZERO_BD;
    token1.tradeVolumeUSD = ZERO_BD;
    token1.untrackedVolumeUSD = ZERO_BD;
    token1.totalLiquidity = ZERO_BD;
    // token1.allPairs = []
    token1.txCount = ZERO_BI;
  }

  let pair = new Pair(event.params.pair.toHexString()) as Pair;
  pair.token0 = token0.id;
  pair.token1 = token1.id;
  pair.liquidityProviderCount = ZERO_BI;
  pair.createdAtTimestamp = event.block.timestamp;
  pair.createdAtBlockNumber = event.block.number;
  pair.txCount = ZERO_BI;
  pair.reserve0 = ZERO_BD;
  pair.reserve1 = ZERO_BD;
  pair.trackedReserveETH = ZERO_BD;
  pair.trackedReserveUSD = ZERO_BD;
  pair.reserveETH = ZERO_BD;
  pair.reserveUSD = ZERO_BD;
  pair.totalSupply = ZERO_BD;
  pair.volumeToken0 = ZERO_BD;
  pair.volumeToken1 = ZERO_BD;
  pair.volumeUSD = ZERO_BD;
  pair.untrackedVolumeUSD = ZERO_BD;
  pair.token0Price = ZERO_BD;
  pair.token1Price = ZERO_BD;

  // create the tracked contract based on the template
  // PairTemplate.create(event.params.pair);

  // "cache" pair for quick off-chain lookups via tokens
  let pairCacheAB = new PairCache(token0.id + token1.id);
  pairCacheAB.pair = pair.id;
  let pairCacheBA = new PairCache(token1.id + token0.id);
  pairCacheBA.pair = pair.id;

  // save updated values
  token0.save();
  token1.save();
  pair.save();
  factory.save();
  pairCacheAB.save();
  pairCacheBA.save();
}