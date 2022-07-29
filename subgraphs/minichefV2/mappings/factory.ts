/* eslint-disable prefer-const */
import { log, Address } from "@graphprotocol/graph-ts";
import {
  PangolinFactory,
  Pair,
  PairCache,
  Token,
  Bundle,
} from "../generated/schema";
import { Pair as PairTemplate } from '../generated/templates'
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
  let token0 = loadToken(event.params.token0);
  let token1 = loadToken(event.params.token1);

  let pair = new Pair(event.params.pair.toHexString()) as Pair;
  pair.token0 = token0.id;
  pair.token1 = token1.id;
  pair.liquidityProviderCount = ZERO_BI;
  pair.createdAtTimestamp = event.block.timestamp;
  pair.createdAtBlockNumber = event.block.number;
  // pair.txCount = ZERO_BI;
  pair.reserve0 = ZERO_BD;
  pair.reserve1 = ZERO_BD;
  pair.trackedReserveETH = ZERO_BD;
  pair.trackedReserveUSD = ZERO_BD;
  pair.reserveETH = ZERO_BD;
  pair.reserveUSD = ZERO_BD;
  pair.totalSupply = ZERO_BD;
  // pair.volumeToken0 = ZERO_BD;
  // pair.volumeToken1 = ZERO_BD;
  // pair.volumeUSD = ZERO_BD;
  // pair.untrackedVolumeUSD = ZERO_BD;
  pair.token0Price = ZERO_BD;
  pair.token1Price = ZERO_BD;

  // create the tracked contract based on the template
  PairTemplate.create(event.params.pair);

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

export function loadToken(tokenAddress: Address): Token {
  let token = Token.load(tokenAddress.toHexString());

  if (token == null) {
    token = new Token(tokenAddress.toHexString());
    token.symbol = fetchTokenSymbol(tokenAddress);
    token.name = fetchTokenName(tokenAddress);
    token.totalSupply = fetchTokenTotalSupply(tokenAddress);
    let decimals = fetchTokenDecimals(tokenAddress);

    if (decimals === null) {
      log.warning("Assuming 0 decimals for token with missing `decimal` property ({})", [tokenAddress.toHexString()]);
      decimals = ZERO_BI;
    }

    token.decimals = decimals;
    token.derivedETH = ZERO_BD;
    token.derivedUSD = ZERO_BD;
    // token.tradeVolume = ZERO_BD;
    // token.tradeVolumeUSD = ZERO_BD;
    // token.untrackedVolumeUSD = ZERO_BD;
    token.totalLiquidity = ZERO_BD;
    // token.allPairs = []
    // token.txCount = ZERO_BI;

    token.save();
  }

  return token as Token;
}