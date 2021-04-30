/* eslint-disable prefer-const */
import { BigInt, BigDecimal, store, Address } from '@graphprotocol/graph-ts'
import {
  Pair,
  Token,
  PangolinFactory,
  Transaction,
  Mint as MintEvent,
  Burn as BurnEvent,
  Swap as SwapEvent,
  Bundle,
  LiquidityPosition
} from '../types/schema'
import { Pair as PairContract, Mint, Burn, Swap, Transfer, Sync } from '../types/templates/Pair/Pair'
import { updatePairDayData, updateTokenDayData, updatePangolinDayData, updatePairHourData } from './dayUpdates'
import { getAvaxPriceInUSD, findAvaxPerToken, getTrackedVolumeUSD, getTrackedLiquidityUSD } from './pricing'
import {
  convertTokenToDecimal,
  ADDRESS_ZERO,
  FACTORY_ADDRESS,
  ROUTER_ADDRESS,
  ONE_BI,
  createUser,
  createLiquidityPosition,
  ZERO_BD,
  BI_18,
  createLiquiditySnapshot
} from './helpers'

let MINING_POOLS: string[] = [
  "0xa16381eae6285123c323a665d4d99a6bcfaac307", // avax-eth
  "0x4f019452f51bba0250ec8b69d64282b79fc8bd9f", // avax-usdt
  "0x01897e996eefff65ae9999c02d1d8d7e9e0c0352", // avax-wbtc
  "0x8fd2755c6ae7252753361991bdcd6ff55bdc01ce", // avax-png
  "0x7d7ecd4d370384b17dfc1b4155a8410e97841b65", // avax-link
  "0xb5b9ded9c193731f816ae1f8ffb7f8b0fae40c88", // avax-dai
  "0xe4d9ae03859dac6d65432d557f75b9b588a38ee1", // avax-uni
  "0x88f26b81c9cae4ea168e31bc6353f493fda29661", // avax-sushi
  "0xee0023108918884181e48902f7c797573f413ece", // avax-aave
  "0x797cbcf107519f4b279fc5db372e292cdf7e6956", // avax-yfi
  "0x4e550fefbf888cb43ead73d821f646f43b1f2309", // png-eth
  "0x7accc6f16bf8c0dce22371fbd914c6b5b402bf9f", // png-usdt
  "0x99b06b9673fea30ba55179b1433ce909fdc28723", // png-wbtc
  "0x4ad6e309805cb477010bea9ffc650cb27c1a9504", // png-link
  "0x8866077f08b076360c25f4fd7fbc959ef135474c", // png-dai
  "0x41188b4332fe68135d1524e43db98e81519d263b", // png-uni
  "0x6955cb85edea63f861c0be39c3d7f8921606c4dc", // png-sushi
  "0xb921a3ae9ceda66fa8a74dbb0946367fb14fae34", // png-aave
  "0x2061298c76cd76219b9b44439e96a75f19c61f7f", // png-yfi
  '0x417c02150b9a31bcacb201d1d60967653384e1c6', // v2
  '0x94c021845efe237163831dac39448cfd371279d6', // v2
  '0xe968e9753fd2c323c2fe94caff954a48afc18546', // v2
  '0x574d3245e36cf8c9dc86430eadb0fdb2f385f829', // v2
  '0xbda623cdd04d822616a263bf4edbbce0b7dc4ae7', // v2
  '0x701e03fad691799a8905043c0d18d2213bbcf2c7', // v2
  '0x1f6acc5f5fe6af91c1bb3bebd27f4807a243d935', // v2
  '0xda354352b03f87f84315eef20cdd83c49f7e812e', // v2
  '0x4df32f1f8469648e89e62789f4246f73fe768b8e', // v2
  '0x2c31822f35506c6444f458ed7470c79f9924ee86', // v2
  '0x7ac007afb5d61f48d1e3c8cc130d4cf6b765000e', // v2
  '0xe2510a1fcccde8d2d1c40b41e8f71fb1f47e5bba', // v2
  '0x681047473b6145ba5db90b074e32861549e85cc7', // v2
  '0x6356b24b36074abe2903f44fe4019bc5864fde36', // v2
  '0xe3103e565cf96a5709ae8e603b1efb7fed04613b', // v2
  '0x4f74bbf6859a994e7c309ea0f11e3cc112955110', // v2
  '0x633f4b4db7dd4fa066bd9949ab627a551e0ecd32', // v2
  '0xfd9acec0f413ca05d5ad5b962f3b4de40018ad87', // v2
  '0xc7d0e29b616b29ac6ff4fd5f37c8da826d16db0d', // v2
]

function isCompleteMint(mintId: string): boolean {
  return MintEvent.load(mintId).sender !== null // sufficient checks
}

export function handleTransfer(event: Transfer): void {
  // ignore initial transfers for first adds
  if (event.params.to.toHexString() == ADDRESS_ZERO && event.params.value.equals(BigInt.fromI32(1000))) {
    return
  }

  // skip if staking/unstaking
  if (MINING_POOLS.includes(event.params.from.toHexString()) || MINING_POOLS.includes(event.params.to.toHexString())) {
    return
  }

  let factory = PangolinFactory.load(FACTORY_ADDRESS)
  let transactionHash = event.transaction.hash.toHexString()

  // user stats
  let from = event.params.from
  createUser(from)
  let to = event.params.to
  createUser(to)

  // get pair and load contract
  let pair = Pair.load(event.address.toHexString())
  let pairContract = PairContract.bind(event.address)

  // liquidity token amount being transfered
  let value = convertTokenToDecimal(event.params.value, BI_18)

  // get or create transaction
  let transaction = Transaction.load(transactionHash)
  if (transaction === null) {
    transaction = new Transaction(transactionHash)
    transaction.blockNumber = event.block.number
    transaction.timestamp = event.block.timestamp
    transaction.mints = []
    transaction.burns = []
    transaction.swaps = []
  }

  // mints
  let mints = transaction.mints
  if (from.toHexString() == ADDRESS_ZERO) {
    // update total supply
    pair.totalSupply = pair.totalSupply.plus(value)
    pair.save()

    // create new mint if no mints so far or if last one is done already
    if (mints.length === 0 || isCompleteMint(mints[mints.length - 1])) {
      let mint = new MintEvent(
        event.transaction.hash
          .toHexString()
          .concat('-')
          .concat(BigInt.fromI32(mints.length).toString())
      )
      mint.transaction = transaction.id
      mint.pair = pair.id
      mint.to = to
      mint.liquidity = value
      mint.timestamp = transaction.timestamp
      mint.transaction = transaction.id
      mint.save()

      // update mints in transaction
      transaction.mints = mints.concat([mint.id])

      // save entities
      transaction.save()
      factory.save()
    }
  }

  // case where direct send first on AVAX withdrawls
  if (event.params.to.toHexString() == pair.id) {
    let burns = transaction.burns
    let burn = new BurnEvent(
      event.transaction.hash
        .toHexString()
        .concat('-')
        .concat(BigInt.fromI32(burns.length).toString())
    )
    burn.transaction = transaction.id
    burn.pair = pair.id
    burn.liquidity = value
    burn.timestamp = transaction.timestamp
    burn.to = event.params.to
    burn.sender = event.params.from
    burn.needsComplete = true
    burn.transaction = transaction.id
    burn.save()

    // TODO: Consider using .concat() for handling array updates to protect
    // against unintended side effects for other code paths.
    burns.push(burn.id)
    transaction.burns = burns
    transaction.save()
  }

  // burn
  if (event.params.to.toHexString() == ADDRESS_ZERO && event.params.from.toHexString() == pair.id) {
    pair.totalSupply = pair.totalSupply.minus(value)
    pair.save()

    // this is a new instance of a logical burn
    let burns = transaction.burns
    let burn: BurnEvent
    if (burns.length > 0) {
      let currentBurn = BurnEvent.load(burns[burns.length - 1])
      if (currentBurn.needsComplete) {
        burn = currentBurn as BurnEvent
      } else {
        burn = new BurnEvent(
          event.transaction.hash
            .toHexString()
            .concat('-')
            .concat(BigInt.fromI32(burns.length).toString())
        )
        burn.transaction = transaction.id
        burn.needsComplete = false
        burn.pair = pair.id
        burn.liquidity = value
        burn.transaction = transaction.id
        burn.timestamp = transaction.timestamp
      }
    } else {
      burn = new BurnEvent(
        event.transaction.hash
          .toHexString()
          .concat('-')
          .concat(BigInt.fromI32(burns.length).toString())
      )
      burn.transaction = transaction.id
      burn.needsComplete = false
      burn.pair = pair.id
      burn.liquidity = value
      burn.transaction = transaction.id
      burn.timestamp = transaction.timestamp
    }

    // if this logical burn included a fee mint, account for this
    if (mints.length !== 0 && !isCompleteMint(mints[mints.length - 1])) {
      let mint = MintEvent.load(mints[mints.length - 1])
      burn.feeTo = mint.to
      burn.feeLiquidity = mint.liquidity
      // remove the logical mint
      store.remove('Mint', mints[mints.length - 1])
      // update the transaction

      // TODO: Consider using .slice().pop() to protect against unintended
      // side effects for other code paths.
      mints.pop()
      transaction.mints = mints
      transaction.save()
    }
    burn.save()
    // if accessing last one, replace it
    if (burn.needsComplete) {
      // TODO: Consider using .slice(0, -1).concat() to protect against
      // unintended side effects for other code paths.
      burns[burns.length - 1] = burn.id
    }
    // else add new one
    else {
      // TODO: Consider using .concat() for handling array updates to protect
      // against unintended side effects for other code paths.
      burns.push(burn.id)
    }
    transaction.burns = burns
    transaction.save()
  }

  if (from.toHexString() != ADDRESS_ZERO && from.toHexString() != pair.id) {
    let fromUserLiquidityPosition = createLiquidityPosition(event.address, from)
    fromUserLiquidityPosition.liquidityTokenBalance = fromUserLiquidityPosition.liquidityTokenBalance.minus(convertTokenToDecimal(event.params.value, BI_18))
    fromUserLiquidityPosition.save()
    createLiquiditySnapshot(fromUserLiquidityPosition, event)
  }

  if (event.params.to.toHexString() != ADDRESS_ZERO && to.toHexString() != pair.id) {
    let toUserLiquidityPosition = createLiquidityPosition(event.address, to)
    toUserLiquidityPosition.liquidityTokenBalance = toUserLiquidityPosition.liquidityTokenBalance.plus(convertTokenToDecimal(event.params.value, BI_18))
    toUserLiquidityPosition.save()
    createLiquiditySnapshot(toUserLiquidityPosition, event)
  }

  transaction.save()
}

export function handleSync(event: Sync): void {
  let pair = Pair.load(event.address.toHex())
  let token0 = Token.load(pair.token0)
  let token1 = Token.load(pair.token1)
  let pangolin = PangolinFactory.load(FACTORY_ADDRESS)

  // reset factory liquidity by subtracting onluy tarcked liquidity
  pangolin.totalLiquidityAVAX = pangolin.totalLiquidityAVAX.minus(pair.trackedReserveAVAX as BigDecimal)

  // reset token total liquidity amounts
  token0.totalLiquidity = token0.totalLiquidity.minus(pair.reserve0)
  token1.totalLiquidity = token1.totalLiquidity.minus(pair.reserve1)

  pair.reserve0 = convertTokenToDecimal(event.params.reserve0, token0.decimals)
  pair.reserve1 = convertTokenToDecimal(event.params.reserve1, token1.decimals)

  if (pair.reserve1.notEqual(ZERO_BD)) pair.token0Price = pair.reserve0.div(pair.reserve1)
  else pair.token0Price = ZERO_BD
  if (pair.reserve0.notEqual(ZERO_BD)) pair.token1Price = pair.reserve1.div(pair.reserve0)
  else pair.token1Price = ZERO_BD

  pair.save()

  // update AVAX price now that reserves could have changed
  let bundle = Bundle.load('1')
  bundle.avaxPrice = getAvaxPriceInUSD()
  bundle.save()

  token0.derivedAVAX = findAvaxPerToken(token0 as Token)
  token1.derivedAVAX = findAvaxPerToken(token1 as Token)
  token0.save()
  token1.save()

  // get tracked liquidity - will be 0 if neither is in whitelist
  let trackedLiquidityAVAX: BigDecimal
  if (bundle.avaxPrice.notEqual(ZERO_BD)) {
    trackedLiquidityAVAX = getTrackedLiquidityUSD(pair.reserve0, token0 as Token, pair.reserve1, token1 as Token).div(
      bundle.avaxPrice
    )
  } else {
    trackedLiquidityAVAX = ZERO_BD
  }

  // use derived amounts within pair
  pair.trackedReserveAVAX = trackedLiquidityAVAX
  pair.reserveAVAX = pair.reserve0
    .times(token0.derivedAVAX as BigDecimal)
    .plus(pair.reserve1.times(token1.derivedAVAX as BigDecimal))
  pair.reserveUSD = pair.reserveAVAX.times(bundle.avaxPrice)

  // use tracked amounts globally
  pangolin.totalLiquidityAVAX = pangolin.totalLiquidityAVAX.plus(trackedLiquidityAVAX)
  pangolin.totalLiquidityUSD = pangolin.totalLiquidityAVAX.times(bundle.avaxPrice)

  // now correctly set liquidity amounts for each token
  token0.totalLiquidity = token0.totalLiquidity.plus(pair.reserve0)
  token1.totalLiquidity = token1.totalLiquidity.plus(pair.reserve1)

  // save entities
  pair.save()
  pangolin.save()
  token0.save()
  token1.save()
}

export function handleMint(event: Mint): void {
  let transaction = Transaction.load(event.transaction.hash.toHexString())
  let mints = transaction.mints
  let mint = MintEvent.load(mints[mints.length - 1])

  let pair = Pair.load(event.address.toHex())
  let pangolin = PangolinFactory.load(FACTORY_ADDRESS)

  let token0 = Token.load(pair.token0)
  let token1 = Token.load(pair.token1)

  // update exchange info (except balances, sync will cover that)
  let token0Amount = convertTokenToDecimal(event.params.amount0, token0.decimals)
  let token1Amount = convertTokenToDecimal(event.params.amount1, token1.decimals)

  // update txn counts
  token0.txCount = token0.txCount.plus(ONE_BI)
  token1.txCount = token1.txCount.plus(ONE_BI)

  // get new amounts of USD and AVAX for tracking
  let bundle = Bundle.load('1')
  let amountTotalUSD = token1.derivedAVAX
    .times(token1Amount)
    .plus(token0.derivedAVAX.times(token0Amount))
    .times(bundle.avaxPrice)

  // update txn counts
  pair.txCount = pair.txCount.plus(ONE_BI)
  pangolin.txCount = pangolin.txCount.plus(ONE_BI)

  // save entities
  token0.save()
  token1.save()
  pair.save()
  pangolin.save()

  mint.sender = event.params.sender
  mint.amount0 = token0Amount as BigDecimal
  mint.amount1 = token1Amount as BigDecimal
  mint.logIndex = event.logIndex
  mint.amountUSD = amountTotalUSD as BigDecimal
  mint.save()

  // update the LP position
  let liquidityPosition = createLiquidityPosition(event.address, mint.to as Address)
  createLiquiditySnapshot(liquidityPosition, event)

  // update day entities
  updatePairDayData(event)
  updatePairHourData(event)
  updatePangolinDayData(event)
  updateTokenDayData(token0 as Token, event)
  updateTokenDayData(token1 as Token, event)
}

export function handleBurn(event: Burn): void {
  let transaction = Transaction.load(event.transaction.hash.toHexString())

  // safety check
  if (transaction === null) {
    return
  }

  let burns = transaction.burns
  let burn = BurnEvent.load(burns[burns.length - 1])

  let pair = Pair.load(event.address.toHex())
  let pangolin = PangolinFactory.load(FACTORY_ADDRESS)

  //update token info
  let token0 = Token.load(pair.token0)
  let token1 = Token.load(pair.token1)
  let token0Amount = convertTokenToDecimal(event.params.amount0, token0.decimals)
  let token1Amount = convertTokenToDecimal(event.params.amount1, token1.decimals)

  // update txn counts
  token0.txCount = token0.txCount.plus(ONE_BI)
  token1.txCount = token1.txCount.plus(ONE_BI)

  // get new amounts of USD and AVAX for tracking
  let bundle = Bundle.load('1')
  let amountTotalUSD = token1.derivedAVAX
    .times(token1Amount)
    .plus(token0.derivedAVAX.times(token0Amount))
    .times(bundle.avaxPrice)

  // update txn counts
  pangolin.txCount = pangolin.txCount.plus(ONE_BI)
  pair.txCount = pair.txCount.plus(ONE_BI)

  // update global counter and save
  token0.save()
  token1.save()
  pair.save()
  pangolin.save()

  // update burn
  // burn.sender = event.params.sender
  burn.amount0 = token0Amount as BigDecimal
  burn.amount1 = token1Amount as BigDecimal
  // burn.to = event.params.to
  burn.logIndex = event.logIndex
  burn.amountUSD = amountTotalUSD as BigDecimal
  burn.save()

  // update the LP position
  let liquidityPosition = createLiquidityPosition(event.address, burn.sender as Address)
  createLiquiditySnapshot(liquidityPosition, event)

  // update day entities
  updatePairDayData(event)
  updatePairHourData(event)
  updatePangolinDayData(event)
  updateTokenDayData(token0 as Token, event)
  updateTokenDayData(token1 as Token, event)
}

export function handleSwap(event: Swap): void {
  // check if sender and dest are equal to the router
  // if so, change the to address to the tx issuer
  let dest: Address
  if (event.params.sender == Address.fromString(ROUTER_ADDRESS) && event.params.to == Address.fromString(ROUTER_ADDRESS)) {
    dest = event.transaction.from
  } else {
    dest = event.params.to
  }

  let pair = Pair.load(event.address.toHexString())
  let token0 = Token.load(pair.token0)
  let token1 = Token.load(pair.token1)
  let amount0In = convertTokenToDecimal(event.params.amount0In, token0.decimals)
  let amount1In = convertTokenToDecimal(event.params.amount1In, token1.decimals)
  let amount0Out = convertTokenToDecimal(event.params.amount0Out, token0.decimals)
  let amount1Out = convertTokenToDecimal(event.params.amount1Out, token1.decimals)

  // totals for volume updates
  let amount0Total = amount0Out.plus(amount0In)
  let amount1Total = amount1Out.plus(amount1In)

  // AVAX/USD prices
  let bundle = Bundle.load('1')

  // get total amounts of derived USD and AVAX for tracking
  let derivedAmountAVAX = token1.derivedAVAX
    .times(amount1Total)
    .plus(token0.derivedAVAX.times(amount0Total))
    .div(BigDecimal.fromString('2'))
  let derivedAmountUSD = derivedAmountAVAX.times(bundle.avaxPrice)

  // only accounts for volume through white listed tokens
  let trackedAmountUSD = getTrackedVolumeUSD(amount0Total, token0 as Token, amount1Total, token1 as Token, pair as Pair)

  let trackedAmountAVAX: BigDecimal
  if (bundle.avaxPrice.equals(ZERO_BD)) {
    trackedAmountAVAX = ZERO_BD
  } else {
    trackedAmountAVAX = trackedAmountUSD.div(bundle.avaxPrice)
  }

  // update token0 global volume and token liquidity stats
  token0.tradeVolume = token0.tradeVolume.plus(amount0In.plus(amount0Out))
  token0.tradeVolumeUSD = token0.tradeVolumeUSD.plus(trackedAmountUSD)
  token0.untrackedVolumeUSD = token0.untrackedVolumeUSD.plus(derivedAmountUSD)

  // update token1 global volume and token liquidity stats
  token1.tradeVolume = token1.tradeVolume.plus(amount1In.plus(amount1Out))
  token1.tradeVolumeUSD = token1.tradeVolumeUSD.plus(trackedAmountUSD)
  token1.untrackedVolumeUSD = token1.untrackedVolumeUSD.plus(derivedAmountUSD)

  // update txn counts
  token0.txCount = token0.txCount.plus(ONE_BI)
  token1.txCount = token1.txCount.plus(ONE_BI)

  // update pair volume data, use tracked amount if we have it as its probably more accurate
  pair.volumeUSD = pair.volumeUSD.plus(trackedAmountUSD)
  pair.volumeToken0 = pair.volumeToken0.plus(amount0Total)
  pair.volumeToken1 = pair.volumeToken1.plus(amount1Total)
  pair.untrackedVolumeUSD = pair.untrackedVolumeUSD.plus(derivedAmountUSD)
  pair.txCount = pair.txCount.plus(ONE_BI)
  pair.save()

  // update global values, only used tracked amounts for volume
  let pangolin = PangolinFactory.load(FACTORY_ADDRESS)
  pangolin.totalVolumeUSD = pangolin.totalVolumeUSD.plus(trackedAmountUSD)
  pangolin.totalVolumeAVAX = pangolin.totalVolumeAVAX.plus(trackedAmountAVAX)
  pangolin.untrackedVolumeUSD = pangolin.untrackedVolumeUSD.plus(derivedAmountUSD)
  pangolin.txCount = pangolin.txCount.plus(ONE_BI)

  // save entities
  pair.save()
  token0.save()
  token1.save()
  pangolin.save()

  let transaction = Transaction.load(event.transaction.hash.toHexString())
  if (transaction === null) {
    transaction = new Transaction(event.transaction.hash.toHexString())
    transaction.blockNumber = event.block.number
    transaction.timestamp = event.block.timestamp
    transaction.mints = []
    transaction.swaps = []
    transaction.burns = []
  }
  let swaps = transaction.swaps
  let swap = new SwapEvent(
    event.transaction.hash
      .toHexString()
      .concat('-')
      .concat(BigInt.fromI32(swaps.length).toString())
  )

  // update swap event
  swap.transaction = transaction.id
  swap.pair = pair.id
  swap.timestamp = transaction.timestamp
  swap.transaction = transaction.id
  swap.sender = event.params.sender
  swap.amount0In = amount0In
  swap.amount1In = amount1In
  swap.amount0Out = amount0Out
  swap.amount1Out = amount1Out
  swap.to = dest
  swap.from = event.transaction.from
  swap.logIndex = event.logIndex
  // use the tracked amount if we have it
  swap.amountUSD = trackedAmountUSD === ZERO_BD ? derivedAmountUSD : trackedAmountUSD
  swap.save()

  // update the transaction

  // TODO: Consider using .concat() for handling array updates to protect
  // against unintended side effects for other code paths.
  swaps.push(swap.id)
  transaction.swaps = swaps
  transaction.save()

  // update day entities
  let pairDayData = updatePairDayData(event)
  let pairHourData = updatePairHourData(event)
  let pangolinDayData = updatePangolinDayData(event)
  let token0DayData = updateTokenDayData(token0 as Token, event)
  let token1DayData = updateTokenDayData(token1 as Token, event)

  // swap specific updating
  pangolinDayData.dailyVolumeUSD = pangolinDayData.dailyVolumeUSD.plus(trackedAmountUSD)
  pangolinDayData.dailyVolumeAVAX = pangolinDayData.dailyVolumeAVAX.plus(trackedAmountAVAX)
  pangolinDayData.dailyVolumeUntracked = pangolinDayData.dailyVolumeUntracked.plus(derivedAmountUSD)
  pangolinDayData.save()

  // swap specific updating for pair
  pairDayData.dailyVolumeToken0 = pairDayData.dailyVolumeToken0.plus(amount0Total)
  pairDayData.dailyVolumeToken1 = pairDayData.dailyVolumeToken1.plus(amount1Total)
  pairDayData.dailyVolumeUSD = pairDayData.dailyVolumeUSD.plus(trackedAmountUSD)
  pairDayData.save()

  // update hourly pair data
  pairHourData.hourlyVolumeToken0 = pairHourData.hourlyVolumeToken0.plus(amount0Total)
  pairHourData.hourlyVolumeToken1 = pairHourData.hourlyVolumeToken1.plus(amount1Total)
  pairHourData.hourlyVolumeUSD = pairHourData.hourlyVolumeUSD.plus(trackedAmountUSD)
  pairHourData.save()

  // swap specific updating for token0
  token0DayData.dailyVolumeToken = token0DayData.dailyVolumeToken.plus(amount0Total)
  token0DayData.dailyVolumeAVAX = token0DayData.dailyVolumeAVAX.plus(amount0Total.times(token1.derivedAVAX as BigDecimal))
  token0DayData.dailyVolumeUSD = token0DayData.dailyVolumeUSD.plus(
    amount0Total.times(token0.derivedAVAX as BigDecimal).times(bundle.avaxPrice)
  )
  token0DayData.save()

  // swap specific updating
  token1DayData.dailyVolumeToken = token1DayData.dailyVolumeToken.plus(amount1Total)
  token1DayData.dailyVolumeAVAX = token1DayData.dailyVolumeAVAX.plus(amount1Total.times(token1.derivedAVAX as BigDecimal))
  token1DayData.dailyVolumeUSD = token1DayData.dailyVolumeUSD.plus(
    amount1Total.times(token1.derivedAVAX as BigDecimal).times(bundle.avaxPrice)
  )
  token1DayData.save()
}
