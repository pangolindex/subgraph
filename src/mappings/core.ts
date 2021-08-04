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
} from '../types/schema'
import { Pair as PairContract, Mint, Burn, Swap, Transfer, Sync } from '../types/templates/Pair/Pair'
import { updatePairDayData, updateTokenDayData, updatePangolinDayData, updatePairHourData } from './dayUpdates'
import { getEthPriceInUSD, findEthPerToken, getTrackedVolumeUSD, getTrackedLiquidityUSD } from './pricing'
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
  "0xa16381eae6285123c323A665D4D99a6bCfaAC307", // v1 WAVAX-ETH (aeb)
  "0x4f019452f51bbA0250Ec8B69D64282B79fC8BD9f", // v1 WAVAX-USDT (aeb)
  "0x01897e996EEfFf65AE9999C02D1d8D7E9e0C0352", // v1 WAVAX-WBTC (aeb)
  "0x8FD2755c6ae7252753361991bDcd6fF55bDc01CE", // v1 WAVAX-PNG
  "0x7d7eCd4d370384B17DFC1b4155a8410e97841B65", // v1 WAVAX-LINK (aeb)
  "0xb5b9DEd9C193731f816AE1f8FfB7f8B0FaE40c88", // v1 WAVAX-DAI (aeb)
  "0xe4d9aE03859DaC6d65432d557F75b9b588a38eE1", // v1 WAVAX-UNI (aeb)
  "0x88f26b81c9cae4ea168e31BC6353f493fdA29661", // v1 WAVAX-SUSHI (aeb)
  "0xEe0023108918884181E48902f7C797573F413EcE", // v1 WAVAX-AAVE (aeb)
  "0x797CBcf107519f4b279Fc5Db372e292cdF7e6956", // v1 WAVAX-YFI (aeb)
  "0x4e550fEfBf888cB43eaD73d821f646F43b1F2309", // v1 PNG-ETH (aeb)
  "0x7accC6f16Bf8c0Dce22371fbD914c6B5b402BF9f", // v1 PNG-USDT (aeb)
  "0x99B06B9673fea30Ba55179b1433ce909Fdc28723", // v1 PNG-WBTC (aeb)
  "0x4Ad6e309805cb477010beA9fFC650cB27C1A9504", // v1 PNG-LINK (aeb)
  "0x8866077F08b076360C25F4Fd7fbC959ef135474C", // v1 PNG-DAI (aeb)
  "0x41188B4332fe68135d1524E43db98e81519d263B", // v1 PNG-UNI (aeb)
  "0x6955Cb85edEa63F861c0Be39C3d7F8921606c4Dc", // v1 PNG-SUSHI (aeb)
  "0xb921a3aE9CeDa66fa8A74DBb0946367FB14faE34", // v1 PNG-AAVE (aeb)
  "0x2061298C76cD76219b9b44439e96A75F19C61f7f", // v1 PNG-YFI (aeb)

  '0x417C02150b9a31BcaCb201d1D60967653384E1C6', // v2 WAVAX-ETH (aeb)
  '0x830A966B9B447c9B15aB24c0369c4018E75F31C9', // v2 WAVAX-WETH.e
  '0x94C021845EfE237163831DAC39448cFD371279d6', // v2 WAVAX-USDT (aeb)
  '0x006cC053bdb84C2d6380B3C4a573d84636378A47', // v2 WAVAX-USDT.e
  '0xe968E9753fd2c323C2Fe94caFF954a48aFc18546', // v2 WAVAX-WBTC (aeb)
  '0x30CbF11f6fcc9FC1bF6E55A6941b1A47A56eAEC5', // v2 WAVAX-WBTC.e
  '0x574d3245e36Cf8C9dc86430EaDb0fDB2F385F829', // v2 WAVAX-PNG
  '0xBDa623cDD04d822616A263BF4EdbBCe0B7DC4AE7', // v2 WAVAX-LINK (aeb)
  '0x2e10D9d08f76807eFdB6903025DE8e006b1185F5', // v2 WAVAX-LINK.e
  '0x701e03fAD691799a8905043C0d18d2213BbCf2c7', // v2 WAVAX-DAI (aeb)
  '0x63A84F66b8c90841Cb930F2dC3D28799F0c6657B', // v2 WAVAX-DAI.e
  '0x1F6aCc5F5fE6Af91C1BB3bEbd27f4807a243D935', // v2 WAVAX-UNI (aeb)
  '0x6E36A71c1A211f01Ff848C1319D4e34BB5483224', // v2 WAVAX-UNI.e
  '0xDA354352b03f87F84315eEF20cdD83c49f7E812e', // v2 WAVAX-SUSHI (aeb)
  '0x2D55341f2abbb5472020e2d556a4f6B951C8Fa22', // v2 WAVAX-SUSHI.e
  '0x4dF32F1F8469648e89E62789F4246f73fe768b8E', // v2 WAVAX-AAVE (aeb)
  '0xa04fCcE7955312709c838982ad0E297375002C32', // v2 WAVAX-AAVE.e
  '0x2C31822F35506C6444F458Ed7470c79f9924Ee86', // v2 WAVAX-YFI (aeb)
  '0x642c5B7AC22f56A0eF87930a89f0980FcA904B03', // v2 WAVAX-YFI.e
  '0x640D754113A3CBDd80BcCc1b5c0387148EEbf2fE', // v2 WAVAX-SNOB
  '0xf2b788085592380bfCAc40Ac5E0d10D9d0b54eEe', // v2 WAVAX-VSO
  '0xd3e5538A049FcFcb8dF559B85B352302fEfB8d7C', // v2 WAVAX-SPORE
  '0x4E258f7ec60234bb6f3Ea7eCFf5931901182Bd6E', // v2 WAVAX-BIFI
  '0x21CCa1672E95996413046077B8cf1E52F080A165', // v2 WAVAX-BNB
  '0x4219330Af5368378D5ffd869a55f5F2a26aB898c', // v2 WAVAX-XAVA
  '0xd7EDBb1005ec65721a3976Dba996AdC6e02dc9bA', // v2 WAVAX-PEFI
  '0x079a479e270E72A1899239570912358C6BC22d94', // v2 WAVAX-TRYB
  '0x99918c92655D6f8537588210cD3Ddd52312CB36d', // v2 WAVAX-SHERPA
  '0x7ac007afb5d61f48d1e3c8cc130d4cf6b765000e', // v2 PNG-ETH (aeb)
  '0x03a9091620CACeE4968c915232B175C16a584733', // v2 PNG-WETH.e
  '0xe2510a1fcccde8d2d1c40b41e8f71fb1f47e5bba', // v2 PNG-USDT (aeb)
  '0x7216d1e173c1f1Ed990239d5c77d74714a837Cd5', // v2 PNG-USDT.e
  '0x681047473b6145ba5db90b074e32861549e85cc7', // v2 PNG-WBTC (aeb)
  '0xEeEA1e815f12d344b5035a33da4bc383365F5Fee', // v2 PNG-WBTC.e
  '0x6356b24b36074abe2903f44fe4019bc5864fde36', // v2 PNG-LINK (aeb)
  '0x4B283e4211B3fAa525846d21869925e78f93f189', // v2 PNG-LINK.e
  '0xe3103e565cf96a5709ae8e603b1efb7fed04613b', // v2 PNG-DAI (aeb)
  '0xF344611DD94099708e508C2Deb16628578940d77', // v2 PNG-DAI.e
  '0x4f74bbf6859a994e7c309ea0f11e3cc112955110', // v2 PNG-UNI (aeb)
  '0xD4E49A8Ec23daB51ACa459D233e9447DE03AFd29', // v2 PNG-UNI.e
  '0x633f4b4db7dd4fa066bd9949ab627a551e0ecd32', // v2 PNG-SUSHI (aeb)
  '0x923E69322Bea5e22799a29Dcfc9c616F3B5cF95b', // v2 PNG-SUSHI.e
  '0xfd9acec0f413ca05d5ad5b962f3b4de40018ad87', // v2 PNG-AAVE (aeb)
  '0x3F91756D773A1455A7a1A70f5d9239F1B1d1f095', // v2 PNG-AAVE.e
  '0xc7d0e29b616b29ac6ff4fd5f37c8da826d16db0d', // v2 PNG-YFI (aeb)
  '0x269Ed6B2040f965D9600D0859F36951cB9F01460', // v2 PNG-YFI.e
  '0x08B9A023e34Bad6Db868B699fa642Bf5f12Ebe76', // v2 PNG-SNOB
  '0x759ee0072901f409e4959E00b00a16FD729397eC', // v2 PNG-VSO
  '0x12A33F6B0dd0D35279D402aB61587fE7eB23f7b0', // v2 PNG-SPORE
  '0x518B07E2d9e08A8c2e3cB7704336520827a4d399', // v2 PNG-BIFI
  '0x68a90C38bF4f90AC2a870d6FcA5b0A5A218763AD', // v2 PNG-BNB
  '0x5b3Ed7f47D1d4FA22b559D043a09d78bc55A94E9', // v2 PNG-XAVA
  '0x76e404Ab7357fD97d4f1e8Dd52f298A035fd408c', // v2 PNG-PEFI
  '0x0A9773AEbc1429d860A492d70c8EA335fAa9F19f', // v2 PNG-TRYB
  '0x80E919784e7c5AD3Dd59cAfCDC0e9C079B65f262', // v2 PNG-SHERPA
]

function isCompleteMint(mintId: string): boolean {
  return MintEvent.load(mintId).sender !== null // sufficient checks
}

export function handleTransfer(event: Transfer): void {
  const eventToAsHexString = event.params.to.toHexString()
  const eventFromAsHexString = event.params.from.toHexString()
  const eventHashAsHexString = event.transaction.hash.toHexString()

  // ignore initial transfers for first adds
  if (eventToAsHexString == ADDRESS_ZERO && event.params.value.equals(BigInt.fromI32(1000))) {
    return
  }

  // skip if staking/unstaking
  if (MINING_POOLS.includes(eventFromAsHexString) || MINING_POOLS.includes(eventToAsHexString)) {
    return
  }

  let factory = PangolinFactory.load(FACTORY_ADDRESS)

  // user stats
  let from = event.params.from
  createUser(from)
  let to = event.params.to
  createUser(to)

  // get pair and load contract
  let pair = Pair.load(event.address.toHexString())
  let pairContract = PairContract.bind(event.address)

  // liquidity token amount being transferred
  let value = convertTokenToDecimal(event.params.value, BI_18)

  // get or create transaction
  let transaction = Transaction.load(eventHashAsHexString)
  if (transaction === null) {
    transaction = new Transaction(eventHashAsHexString)
    transaction.blockNumber = event.block.number
    transaction.timestamp = event.block.timestamp
    transaction.mints = []
    transaction.burns = []
    transaction.swaps = []
  }

  // mints
  let mints = transaction.mints
  if (eventFromAsHexString == ADDRESS_ZERO) {
    // update total supply
    pair.totalSupply = pair.totalSupply.plus(value)
    pair.save()

    // create new mint if no mints so far or if last one is done already
    if (mints.length === 0 || isCompleteMint(mints[mints.length - 1])) {
      let mint = new MintEvent(
        eventHashAsHexString
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

  // case where direct send first on ETH withdrawals
  if (eventToAsHexString == pair.id) {
    let burns = transaction.burns
    let burn = new BurnEvent(
      eventHashAsHexString
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
  if (eventToAsHexString == ADDRESS_ZERO && eventFromAsHexString == pair.id) {
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
          eventHashAsHexString
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
        eventHashAsHexString
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

  if (eventFromAsHexString != ADDRESS_ZERO && eventFromAsHexString != pair.id) {
    let fromUserLiquidityPosition = createLiquidityPosition(event.address, from)
    fromUserLiquidityPosition.liquidityTokenBalance = fromUserLiquidityPosition.liquidityTokenBalance.minus(convertTokenToDecimal(event.params.value, BI_18))
    fromUserLiquidityPosition.save()
    createLiquiditySnapshot(fromUserLiquidityPosition, event)
  }

  if (eventToAsHexString != ADDRESS_ZERO && eventToAsHexString != pair.id) {
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
  pangolin.totalLiquidityETH = pangolin.totalLiquidityETH.minus(pair.trackedReserveETH as BigDecimal)

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

  // update ETH price now that reserves could have changed
  let bundle = Bundle.load('1')
  bundle.ethPrice = getEthPriceInUSD()
  bundle.save()

  token0.derivedETH = findEthPerToken(token0 as Token)
  token1.derivedETH = findEthPerToken(token1 as Token)
  token0.save()
  token1.save()

  // get tracked liquidity - will be 0 if neither is in whitelist
  let trackedLiquidityETH: BigDecimal
  if (bundle.ethPrice.notEqual(ZERO_BD)) {
    trackedLiquidityETH = getTrackedLiquidityUSD(pair.reserve0, token0 as Token, pair.reserve1, token1 as Token).div(
      bundle.ethPrice
    )
  } else {
    trackedLiquidityETH = ZERO_BD
  }

  // use derived amounts within pair
  pair.trackedReserveETH = trackedLiquidityETH
  pair.reserveETH = pair.reserve0
    .times(token0.derivedETH as BigDecimal)
    .plus(pair.reserve1.times(token1.derivedETH as BigDecimal))
  pair.reserveUSD = pair.reserveETH.times(bundle.ethPrice)

  // use tracked amounts globally
  pangolin.totalLiquidityETH = pangolin.totalLiquidityETH.plus(trackedLiquidityETH)
  pangolin.totalLiquidityUSD = pangolin.totalLiquidityETH.times(bundle.ethPrice)

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

  // get new amounts of USD and ETH for tracking
  let bundle = Bundle.load('1')
  let amountTotalUSD = token1.derivedETH
    .times(token1Amount)
    .plus(token0.derivedETH.times(token0Amount))
    .times(bundle.ethPrice)

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

  // get new amounts of USD and ETH for tracking
  let bundle = Bundle.load('1')
  let amountTotalUSD = token1.derivedETH
    .times(token1Amount)
    .plus(token0.derivedETH.times(token0Amount))
    .times(bundle.ethPrice)

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

  // ETH/USD prices
  let bundle = Bundle.load('1')

  // get total amounts of derived USD and ETH for tracking
  let derivedAmountETH = token1.derivedETH
    .times(amount1Total)
    .plus(token0.derivedETH.times(amount0Total))
    .div(BigDecimal.fromString('2'))
  let derivedAmountUSD = derivedAmountETH.times(bundle.ethPrice)

  // only accounts for volume through white listed tokens
  let trackedAmountUSD = getTrackedVolumeUSD(amount0Total, token0 as Token, amount1Total, token1 as Token, pair as Pair)

  let trackedAmountETH: BigDecimal
  if (bundle.ethPrice.equals(ZERO_BD)) {
    trackedAmountETH = ZERO_BD
  } else {
    trackedAmountETH = trackedAmountUSD.div(bundle.ethPrice)
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
  pangolin.totalVolumeETH = pangolin.totalVolumeETH.plus(trackedAmountETH)
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
  pangolinDayData.dailyVolumeETH = pangolinDayData.dailyVolumeETH.plus(trackedAmountETH)
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
  token0DayData.dailyVolumeETH = token0DayData.dailyVolumeETH.plus(amount0Total.times(token1.derivedETH as BigDecimal))
  token0DayData.dailyVolumeUSD = token0DayData.dailyVolumeUSD.plus(
    amount0Total.times(token0.derivedETH as BigDecimal).times(bundle.ethPrice)
  )
  token0DayData.save()

  // swap specific updating
  token1DayData.dailyVolumeToken = token1DayData.dailyVolumeToken.plus(amount1Total)
  token1DayData.dailyVolumeETH = token1DayData.dailyVolumeETH.plus(amount1Total.times(token1.derivedETH as BigDecimal))
  token1DayData.dailyVolumeUSD = token1DayData.dailyVolumeUSD.plus(
    amount1Total.times(token1.derivedETH as BigDecimal).times(bundle.ethPrice)
  )
  token1DayData.save()
}
