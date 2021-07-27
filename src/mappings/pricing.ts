/* eslint-disable prefer-const */
import { Pair, Token, Bundle } from '../types/schema'
import { BigDecimal, Address, BigInt } from '@graphprotocol/graph-ts/index'
import { ZERO_BD, factoryContract, ADDRESS_ZERO, ONE_BD } from './helpers'

const WAVAX_ADDRESS = '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7'
const AEB_USDT_WAVAX_PAIR = '0x9ee0a4e21bd333a6bb2ab298194320b8daa26516'  // created block 60,337
const AEB_DAI_WAVAX_PAIR = '0x17a2e8275792b4616befb02eb9ae699aa0dcb94b'   // created block 60,355
const AB_DAI_WAVAX_PAIR = '0xbA09679Ab223C6bdaf44D45Ba2d7279959289AB0' // created block 2,781,964
const AB_USDT_WAVAX_PAIR = '0xe28984e1EE8D431346D32BeC9Ec800Efb643eef4' // created block 2,781,997

export function getEthPriceInUSD(): BigDecimal {
  // fetch eth prices for each stablecoin

  const aebUsdtPair = Pair.load(AEB_USDT_WAVAX_PAIR) // USDT is token1
  const aebDaiPair = Pair.load(AEB_DAI_WAVAX_PAIR) // DAI is token1
  const abDaiPair = Pair.load(AB_DAI_WAVAX_PAIR) // DAI.e is token1
  const abUsdtPair = Pair.load(AB_USDT_WAVAX_PAIR) // USDT.e is token1

  if (aebUsdtPair !== null && aebDaiPair !== null && abDaiPair !== null && abUsdtPair !== null) {
    // USDT (aeb), DAI (aeb), DAI.e, and USDT.e have been created
    const totalLiquidityWAVAX = aebUsdtPair.reserve0
        .plus(aebDaiPair.reserve0)
        .plus(abDaiPair.reserve0)
        .plus(abUsdtPair.reserve0)
    const aebUsdtWeight = aebUsdtPair.reserve0.div(totalLiquidityWAVAX)
    const aebDaiWeight = aebDaiPair.reserve0.div(totalLiquidityWAVAX)
    const abDaiWeight = abDaiPair.reserve0.div(totalLiquidityWAVAX)
    const abUsdtWeight = abUsdtPair.reserve0.div(totalLiquidityWAVAX)
    return aebUsdtPair.token1Price.times(aebUsdtWeight)
        .plus(aebDaiPair.token1Price.times(aebDaiWeight))
        .plus(abDaiPair.token1Price.times(abDaiWeight))
        .plus(abUsdtPair.token1Price.times(abUsdtWeight))
  } else if (aebUsdtPair !== null && aebDaiPair !== null && abDaiPair !== null) {
    // USDT (aeb), DAI (aeb), and DAI.e have been created
    const totalLiquidityWAVAX = aebUsdtPair.reserve0
        .plus(aebDaiPair.reserve0)
        .plus(abDaiPair.reserve0)
    const aebUsdtWeight = aebUsdtPair.reserve0.div(totalLiquidityWAVAX)
    const aebDaiWeight = aebDaiPair.reserve0.div(totalLiquidityWAVAX)
    const abDaiWeight = abDaiPair.reserve0.div(totalLiquidityWAVAX)
    return aebUsdtPair.token1Price.times(aebUsdtWeight)
        .plus(aebDaiPair.token1Price.times(aebDaiWeight))
        .plus(abDaiPair.token1Price.times(abDaiWeight))
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
  '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB', // WETH.e
  '0xde3a24028580884448a5397872046a019649b084', // USDT (aeb)
  '0xc7198437980c041c805A1EDcbA50c1Ce5db95118', // USDT.e
  '0xb3fe5374f67d7a22886a0ee082b2e2f9d2651651', // LINK (aeb)
  '0x5947BB275c521040051D82396192181b413227A3', // LINK.e
  '0x8ce2dee54bb9921a2ae0a63dbb2df8ed88b91dd9', // AAVE (aeb)
  '0x63a72806098Bd3D9520cC43356dD78afe5D386D9', // AAVE.e
  '0xf39f9671906d8630812f9d9863bbef5d523c84ab', // UNI (aeb)
  '0x8eBAf22B6F053dFFeaf46f4Dd9eFA95D89ba8580', // UNI.e
  '0x408d4cd0adb7cebd1f1a1c33a0ba2098e1295bab', // WBTC (aeb)
  '0x50b7545627a5162F82A992c33b87aDc75187B218', // WBTC.e
  '0x39cf1bd5f15fb22ec3d9ff86b0727afc203427cc', // SUSHI (aeb)
  '0x37B608519F91f70F2EeB0e5Ed9AF4061722e4F76', // SUSHI.e
  '0xba7deebbfc5fa1100fb055a87773e1e99cd3507a', // DAI (aeb)
  '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70', // DAI.e
  '0x99519acb025a0e0d44c3875a4bbf03af65933627', // YFI (aeb)
  '0x9eAaC1B23d935365bD7b542Fe22cEEe2922f52dc', // YFI.e
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
