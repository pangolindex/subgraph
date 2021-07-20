/* eslint-disable prefer-const */
import { Pair, Token, Bundle } from '../types/schema'
import { BigDecimal, Address, BigInt } from '@graphprotocol/graph-ts/index'
import { ZERO_BD, factoryContract, ADDRESS_ZERO, ONE_BD } from './helpers'

const WAVAX_ADDRESS = '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7'
const AEB_USDT_WAVAX_PAIR = '0x9ee0a4e21bd333a6bb2ab298194320b8daa26516'  // created block 60,337
const AEB_DAI_WAVAX_PAIR = '0x17a2e8275792b4616befb02eb9ae699aa0dcb94b'   // created block 60,355
const XUSDT_WAVAX_PAIR = '' // created block X,XXX,XXX
const XDAI_WAVAX_PAIR = '' // created block X,XXX,XXX

export function getEthPriceInUSD(): BigDecimal {
  // fetch eth prices for each stablecoin

  const aebUsdtPair = Pair.load(AEB_USDT_WAVAX_PAIR) // USDT is token1
  const aebDaiPair = Pair.load(AEB_DAI_WAVAX_PAIR) // DAI is token1
  const xusdtPair = Pair.load(XUSDT_WAVAX_PAIR) // assuming xUSDT is token1
  const xdaiPair = Pair.load(XDAI_WAVAX_PAIR) // assuming xDAI is token1

  if (aebUsdtPair !== null && aebDaiPair !== null && xusdtPair !== null && xdaiPair !== null) {
    // USDT (aeb), DAI (aeb), xUSDT, and xDAI have been created
    const totalLiquidityWAVAX = aebUsdtPair.reserve0
        .plus(aebDaiPair.reserve0)
        .plus(xusdtPair.reserve0)
        .plus(xdaiPair.reserve0)
    const aebUsdtWeight = aebUsdtPair.reserve0.div(totalLiquidityWAVAX)
    const aebDaiWeight = aebDaiPair.reserve0.div(totalLiquidityWAVAX)
    const xusdtWeight = xusdtPair.reserve0.div(totalLiquidityWAVAX)
    const xdaiWeight = xdaiPair.reserve0.div(totalLiquidityWAVAX)
    return aebUsdtPair.token1Price.times(aebUsdtWeight)
        .plus(aebDaiPair.token1Price.times(aebDaiWeight))
        .plus(xusdtPair.token1Price.times(xusdtWeight))
        .plus(xdaiPair.token1Price.times(xdaiWeight))
  } else if (aebUsdtPair !== null && aebDaiPair !== null && xusdtPair !== null) {
    // USDT (aeb), DAI (aeb), and xUSDT have been created
    const totalLiquidityWAVAX = aebUsdtPair.reserve0
        .plus(aebDaiPair.reserve0)
        .plus(xusdtPair.reserve0)
    const aebUsdtWeight = aebUsdtPair.reserve0.div(totalLiquidityWAVAX)
    const aebDaiWeight = aebDaiPair.reserve0.div(totalLiquidityWAVAX)
    const xusdtWeight = xusdtPair.reserve0.div(totalLiquidityWAVAX)
    return aebUsdtPair.token1Price.times(aebUsdtWeight)
        .plus(aebDaiPair.token1Price.times(aebDaiWeight))
        .plus(xusdtPair.token1Price.times(xusdtWeight))
  } else if (aebUsdtPair !== null && aebDaiPair !== null) {
    // USDT (aeb) and DAI (aeb) have been created
    const totalLiquidityWAVAX = aebUsdtPair.reserve0
        .plus(aebDaiPair.reserve0)
    const aebUsdtWeight = aebUsdtPair.reserve0.div(totalLiquidityWAVAX)
    const aebDaiWeight = aebDaiPair.reserve0.div(totalLiquidityWAVAX)
    return aebUsdtPair.token1Price.times(aebUsdtWeight)
        .plus(aebDaiPair.token1Price.times(aebDaiWeight))
  } else if (aebUsdtPair !== null) {
    // only USDT (aeb) has been created
    return aebUsdtPair.token1Price
  } else {
    // none have been created
    return ONE_BD // hack, REMOVE!
  }
}

// token where amounts should contribute to tracked volume and liquidity
let WHITELIST: string[] = [
  WAVAX_ADDRESS, // WAVAX
  '0x60781c2586d68229fde47564546784ab3faca982', // PNG
  '0xf20d962a6c8f70c731bd838a3a388d7d48fa6e15', // ETH (aeb)
  '0x________________________________________', // xETH
  '0xde3a24028580884448a5397872046a019649b084', // USDT (aeb)
  '0x________________________________________', // xUSDT
  '0xb3fe5374f67d7a22886a0ee082b2e2f9d2651651', // LINK (aeb)
  '0x________________________________________', // xLINK
  '0x8ce2dee54bb9921a2ae0a63dbb2df8ed88b91dd9', // AAVE (aeb)
  '0x________________________________________', // xAAVE
  '0xf39f9671906d8630812f9d9863bbef5d523c84ab', // UNI (aeb)
  '0x________________________________________', // xUNI
  '0x408d4cd0adb7cebd1f1a1c33a0ba2098e1295bab', // WBTC (aeb)
  '0x________________________________________', // xBTC
  '0x39cf1bd5f15fb22ec3d9ff86b0727afc203427cc', // SUSHI (aeb)
  '0x________________________________________', // xSUSHI
  '0xba7deebbfc5fa1100fb055a87773e1e99cd3507a', // DAI (aeb)
  '0x________________________________________', // xDAI
  '0x99519acb025a0e0d44c3875a4bbf03af65933627', // YFI (aeb)
  '0x________________________________________', // xYFI
  '0xe896cdeaac9615145c0ca09c8cd5c25bced6384c', // PEFI
  '0xd1c3f94de7e5b45fa4edbba472491a9f4b166fc4', // XAVA
  '0xc38f41a296a4493ff429f1238e030924a1542e50', // SNOB
  '0x846d50248baf8b7ceaa9d9b53bfd12d7d7fbb25a', // VSO
  '0x6e7f5c0b9f4432716bdd0a77a3601291b9d9e985', // SPORE
]

// minimum liquidity required to count towards tracked volume for pairs with small # of Lps
let MINIMUM_USD_THRESHOLD_NEW_PAIRS = BigDecimal.fromString('10')

// minimum liquidity for price to get tracked
let MINIMUM_LIQUIDITY_THRESHOLD_ETH = BigDecimal.fromString('1')

/**
 * Search through graph to find derived Eth per token.
 * @todo update to be derived ETH (add stablecoin estimates)
 **/
export function findEthPerToken(token: Token): BigDecimal {
  if (token.id == WAVAX_ADDRESS) {
    return ONE_BD
  }
  // loop through whitelist and check if paired with any
  for (let i = 0; i < WHITELIST.length; ++i) {
    let pairAddress = factoryContract.getPair(Address.fromString(token.id), Address.fromString(WHITELIST[i]))
    if (pairAddress.toHexString() != ADDRESS_ZERO) {
      let pair = Pair.load(pairAddress.toHexString())
      if (pair.token0 == token.id && pair.reserveETH.gt(MINIMUM_LIQUIDITY_THRESHOLD_ETH)) {
        let token1 = Token.load(pair.token1)
        return pair.token1Price.times(token1.derivedETH as BigDecimal) // return token1 per our token * Eth per token 1
      }
      if (pair.token1 == token.id && pair.reserveETH.gt(MINIMUM_LIQUIDITY_THRESHOLD_ETH)) {
        let token0 = Token.load(pair.token0)
        return pair.token0Price.times(token0.derivedETH as BigDecimal) // return token0 per our token * ETH per token 0
      }
    }
  }
  return ZERO_BD // nothing was found return 0
}

/**
 * Accepts tokens and amounts, return tracked amount based on token whitelist
 * If one token on whitelist, return amount in that token converted to USD.
 * If both are, return average of two amounts
 * If neither is, return 0
 */
export function getTrackedVolumeUSD(
  tokenAmount0: BigDecimal,
  token0: Token,
  tokenAmount1: BigDecimal,
  token1: Token,
  pair: Pair
): BigDecimal {
  let bundle = Bundle.load('1')
  let price0 = token0.derivedETH.times(bundle.ethPrice)
  let price1 = token1.derivedETH.times(bundle.ethPrice)

  // if less than 5 LPs, require high minimum reserve amount amount or return 0
  if (pair.liquidityProviderCount.lt(BigInt.fromI32(5))) {
    let reserve0USD = pair.reserve0.times(price0)
    let reserve1USD = pair.reserve1.times(price1)
    if (WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
      if (reserve0USD.plus(reserve1USD).lt(MINIMUM_USD_THRESHOLD_NEW_PAIRS)) {
        return ZERO_BD
      }
    }
    if (WHITELIST.includes(token0.id) && !WHITELIST.includes(token1.id)) {
      if (reserve0USD.times(BigDecimal.fromString('2')).lt(MINIMUM_USD_THRESHOLD_NEW_PAIRS)) {
        return ZERO_BD
      }
    }
    if (!WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
      if (reserve1USD.times(BigDecimal.fromString('2')).lt(MINIMUM_USD_THRESHOLD_NEW_PAIRS)) {
        return ZERO_BD
      }
    }
  }

  // both are whitelist tokens, take average of both amounts
  if (WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount0
      .times(price0)
      .plus(tokenAmount1.times(price1))
      .div(BigDecimal.fromString('2'))
  }

  // take full value of the whitelisted token amount
  if (WHITELIST.includes(token0.id) && !WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0)
  }

  // take full value of the whitelisted token amount
  if (!WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount1.times(price1)
  }

  // neither token is on white list, tracked volume is 0
  return ZERO_BD
}

/**
 * Accepts tokens and amounts, return tracked amount based on token whitelist
 * If one token on whitelist, return amount in that token converted to USD * 2.
 * If both are, return sum of two amounts
 * If neither is, return 0
 */
export function getTrackedLiquidityUSD(
  tokenAmount0: BigDecimal,
  token0: Token,
  tokenAmount1: BigDecimal,
  token1: Token
): BigDecimal {
  let bundle = Bundle.load('1')
  let price0 = token0.derivedETH.times(bundle.ethPrice)
  let price1 = token1.derivedETH.times(bundle.ethPrice)

  // both are whitelist tokens, take average of both amounts
  if (WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0).plus(tokenAmount1.times(price1))
  }

  // take double value of the whitelisted token amount
  if (WHITELIST.includes(token0.id) && !WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0).times(BigDecimal.fromString('2'))
  }

  // take double value of the whitelisted token amount
  if (!WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount1.times(price1).times(BigDecimal.fromString('2'))
  }

  // neither token is on white list, tracked volume is 0
  return ZERO_BD
}
