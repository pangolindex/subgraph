/* eslint-disable prefer-const */
import { Pair, Token, Bundle } from '../types/schema'
import { BigDecimal, Address, BigInt } from '@graphprotocol/graph-ts/index'
import { ZERO_BD, factoryContract, ADDRESS_ZERO, ONE_BD } from './helpers'
import { log } from '@graphprotocol/graph-ts'

const WAVAX_ADDRESS = '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7'
const DAI_WAVAX_PAIR = '0x17a2E8275792b4616bEFb02EB9AE699aa0DCb94b' // created block 60355
const USDT_WAVAX_PAIR = '0x9EE0a4E21bd333a6bb2ab298194320b8DaA26516' // created block 60337

export function getAvaxPriceInUSD(): BigDecimal {
  // fetch avax prices for each stablecoin
  let daiPair = Pair.load(DAI_WAVAX_PAIR) // dai is token1
  let usdtPair = Pair.load(USDT_WAVAX_PAIR) // usdt is token1

  // dai and usdt pairs have been created
  if (daiPair !== null && usdtPair !== null) {
    let totalLiquidityAVAX = daiPair.reserve0.plus(usdtPair.reserve0)
    let daiWeight = daiPair.reserve0.div(totalLiquidityAVAX)
    let usdtWeight = usdtPair.reserve0.div(totalLiquidityAVAX)
    return daiPair.token1Price
      .times(daiWeight)
      .plus(usdtPair.token1Price.times(usdtWeight))
    // USDT is the only pair so far
  } else if (usdtPair !== null) {
    return usdtPair.token1Price
  } else {
    return ZERO_BD
  }
}

// token where amounts should contribute to tracked volume and liquidity
let WHITELIST: string[] = [
  WAVAX_ADDRESS, // WAVAX
  '0x60781c2586d68229fde47564546784ab3faca982', // PNG
  '0xf20d962a6c8f70c731bd838a3a388d7d48fa6e15', // eth
  '0xde3a24028580884448a5397872046a019649b084', // usdt
  '0xb3fe5374f67d7a22886a0ee082b2e2f9d2651651', // link
  '0x8ce2dee54bb9921a2ae0a63dbb2df8ed88b91dd9', // aave
  '0xf39f9671906d8630812f9d9863bbef5d523c84ab', // uni
  '0x408d4cd0adb7cebd1f1a1c33a0ba2098e1295bab', // wbtc
  '0x39cf1bd5f15fb22ec3d9ff86b0727afc203427cc', // sushi
  '0xba7deebbfc5fa1100fb055a87773e1e99cd3507a', // dai
  '0x99519acb025a0e0d44c3875a4bbf03af65933627' // yfi
]

// minimum liquidity required to count towards tracked volume for pairs with small # of Lps
let MINIMUM_USD_THRESHOLD_NEW_PAIRS = BigDecimal.fromString('10')

// minimum liquidity for price to get tracked
let MINIMUM_LIQUIDITY_THRESHOLD_AVAX = BigDecimal.fromString('1')

/**
 * Search through graph to find derived Avax per token.
 * @todo update to be derived AVAX (add stablecoin estimates)
 **/
export function findAvaxPerToken(token: Token): BigDecimal {
  if (token.id == WAVAX_ADDRESS) {
    return ONE_BD
  }
  // loop through whitelist and check if paired with any
  for (let i = 0; i < WHITELIST.length; ++i) {
    let pairAddress = factoryContract.getPair(Address.fromString(token.id), Address.fromString(WHITELIST[i]))
    if (pairAddress.toHexString() != ADDRESS_ZERO) {
      let pair = Pair.load(pairAddress.toHexString())
      if (pair.token0 == token.id && pair.reserveAVAX.gt(MINIMUM_LIQUIDITY_THRESHOLD_AVAX)) {
        let token1 = Token.load(pair.token1)
        return pair.token1Price.times(token1.derivedAVAX as BigDecimal) // return token1 per our token * AVAX per token 1
      }
      if (pair.token1 == token.id && pair.reserveAVAX.gt(MINIMUM_LIQUIDITY_THRESHOLD_AVAX)) {
        let token0 = Token.load(pair.token0)
        return pair.token0Price.times(token0.derivedAVAX as BigDecimal) // return token0 per our token * AVAX per token 0
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
  let price0 = token0.derivedAVAX.times(bundle.avaxPrice)
  let price1 = token1.derivedAVAX.times(bundle.avaxPrice)

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
  let price0 = token0.derivedAVAX.times(bundle.avaxPrice)
  let price1 = token1.derivedAVAX.times(bundle.avaxPrice)

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
