/* eslint-disable prefer-const */
import { BigDecimal, BigInt, log } from "@graphprotocol/graph-ts";
import { Pair, Token, PangolinFactory, Bundle } from "../generated/schema";
import { Sync, Transfer } from "../generated/templates/Pair/Pair";

import {
  getAVAXPriceInUSD,
  findEthPerToken,
  getTrackedLiquidityUSD,
} from "./pricing";
import {
  ADDRESS_ZERO,
  BI_18,
  convertTokenToDecimal,
  FACTORY_ADDRESS,
  ZERO_BD,
} from "./helpers";

let MINING_POOLS: string[] = [
  "0x1f806f7c8ded893fd3cae279191ad7aa3798e928", // MiniChefV2

  "0xa16381eae6285123c323a665d4d99a6bcfaac307", // v1 WAVAX-ETH (aeb)
  "0x4f019452f51bba0250ec8b69d64282b79fc8bd9f", // v1 WAVAX-USDT (aeb)
  "0x01897e996eefff65ae9999c02d1d8d7e9e0c0352", // v1 WAVAX-WBTC (aeb)
  "0x8fd2755c6ae7252753361991bdcd6ff55bdc01ce", // v1 WAVAX-PNG
  "0x7d7ecd4d370384b17dfc1b4155a8410e97841b65", // v1 WAVAX-LINK (aeb)
  "0xb5b9ded9c193731f816ae1f8ffb7f8b0fae40c88", // v1 WAVAX-DAI (aeb)
  "0xe4d9ae03859dac6d65432d557f75b9b588a38ee1", // v1 WAVAX-UNI (aeb)
  "0x88f26b81c9cae4ea168e31bc6353f493fda29661", // v1 WAVAX-SUSHI (aeb)
  "0xee0023108918884181e48902f7c797573f413ece", // v1 WAVAX-AAVE (aeb)
  "0x797cbcf107519f4b279fc5db372e292cdf7e6956", // v1 WAVAX-YFI (aeb)
  "0x4e550fefbf888cb43ead73d821f646f43b1f2309", // v1 PNG-ETH (aeb)
  "0x7accc6f16bf8c0dce22371fbd914c6b5b402bf9f", // v1 PNG-USDT (aeb)
  "0x99b06b9673fea30ba55179b1433ce909fdc28723", // v1 PNG-WBTC (aeb)
  "0x4ad6e309805cb477010bea9ffc650cb27c1a9504", // v1 PNG-LINK (aeb)
  "0x8866077f08b076360c25f4fd7fbc959ef135474c", // v1 PNG-DAI (aeb)
  "0x41188b4332fe68135d1524e43db98e81519d263b", // v1 PNG-UNI (aeb)
  "0x6955cb85edea63f861c0be39c3d7f8921606c4dc", // v1 PNG-SUSHI (aeb)
  "0xb921a3ae9ceda66fa8a74dbb0946367fb14fae34", // v1 PNG-AAVE (aeb)
  "0x2061298c76cd76219b9b44439e96a75f19c61f7f", // v1 PNG-YFI (aeb)

  "0x417c02150b9a31bcacb201d1d60967653384e1c6", // v2 WAVAX-ETH (aeb)
  "0x830a966b9b447c9b15ab24c0369c4018e75f31c9", // v2 WAVAX-WETH.e
  "0x94c021845efe237163831dac39448cfd371279d6", // v2 WAVAX-USDT (aeb)
  "0x006cc053bdb84c2d6380b3c4a573d84636378a47", // v2 WAVAX-USDT.e
  "0xe968e9753fd2c323c2fe94caff954a48afc18546", // v2 WAVAX-WBTC (aeb)
  "0x30cbf11f6fcc9fc1bf6e55a6941b1a47a56eaec5", // v2 WAVAX-WBTC.e
  "0x574d3245e36cf8c9dc86430eadb0fdb2f385f829", // v2 WAVAX-PNG
  "0xbda623cdd04d822616a263bf4edbbce0b7dc4ae7", // v2 WAVAX-LINK (aeb)
  "0x2e10d9d08f76807efdb6903025de8e006b1185f5", // v2 WAVAX-LINK.e
  "0x701e03fad691799a8905043c0d18d2213bbcf2c7", // v2 WAVAX-DAI (aeb)
  "0x63a84f66b8c90841cb930f2dc3d28799f0c6657b", // v2 WAVAX-DAI.e
  "0x1f6acc5f5fe6af91c1bb3bebd27f4807a243d935", // v2 WAVAX-UNI (aeb)
  "0x6e36a71c1a211f01ff848c1319d4e34bb5483224", // v2 WAVAX-UNI.e
  "0xda354352b03f87f84315eef20cdd83c49f7e812e", // v2 WAVAX-SUSHI (aeb)
  "0x2d55341f2abbb5472020e2d556a4f6b951c8fa22", // v2 WAVAX-SUSHI.e
  "0x4df32f1f8469648e89e62789f4246f73fe768b8e", // v2 WAVAX-AAVE (aeb)
  "0xa04fcce7955312709c838982ad0e297375002c32", // v2 WAVAX-AAVE.e
  "0x2c31822f35506c6444f458ed7470c79f9924ee86", // v2 WAVAX-YFI (aeb)
  "0x642c5b7ac22f56a0ef87930a89f0980fca904b03", // v2 WAVAX-YFI.e
  "0x640d754113a3cbdd80bccc1b5c0387148eebf2fe", // v2 WAVAX-SNOB
  "0xf2b788085592380bfcac40ac5e0d10d9d0b54eee", // v2 WAVAX-VSO
  "0xd3e5538a049fcfcb8df559b85b352302fefb8d7c", // v2 WAVAX-SPORE
  "0x4e258f7ec60234bb6f3ea7ecff5931901182bd6e", // v2 WAVAX-BIFI
  "0x21cca1672e95996413046077b8cf1e52f080a165", // v2 WAVAX-BNB
  "0x4219330af5368378d5ffd869a55f5f2a26ab898c", // v2 WAVAX-XAVA
  "0xd7edbb1005ec65721a3976dba996adc6e02dc9ba", // v2 WAVAX-PEFI
  "0x079a479e270e72a1899239570912358c6bc22d94", // v2 WAVAX-TRYB
  "0x99918c92655d6f8537588210cd3ddd52312cb36d", // v2 WAVAX-SHERPA
  "0xb600429ccd364f1727f91fc0e75d67d65d0ee4c5", // v2 WAVAX-YAK
  "0x29a7f3d1f27637eda531dc69d989c86ab95225d8", // v2 WAVAX-DYP
  "0xed472431e02ea9ef8cc99b9812c335ac0873bba2", // v2 WAVAX-QI
  "0xa296f9474e77ae21f90afb50713f44cc6916fbb2", // v2 WAVAX-WALBT
  "0x2e60ab79bbcdfea164874700d5d98969a386eb2a", // v2 WAVAX-HUSKY
  "0x84b536da1a2d9b0609f9da73139674cc2d75af2d", // v2 WAVAX-USDC.e
  "0xe6de666a80a357497a2cab3a91f1c28dcaa1eca4", // v2 WAVAX-LYD
  "0xf2dd964acf53ad8959540cceefd9fea13d4d0eb1", // v2 WAVAX-TUSD
  "0xd31ffd05a41645631a22a64c1f870a6248a4ddcf", // v2 WAVAX-GAJ
  "0xa6f2408e3cd34084c37a0d88fed8c6b6490f7529", // v2 WAVAX-GDL
  "0xd64370aedbebbae04cfcae27e8e0c5ecbd343336", // v2 WAVAX-MFI
  "0x0029381eff48e9ea963f8095ea204098ac8e44b5", // v2 WAVAX-SHIBX
  "0x94183dd08ffaa595e43b104804d55ee95492c8cb", // v2 WAVAX-AVE
  "0x10e5d5f598abb970f85456ea59f0611d77e00168", // v2 WAVAX-ELE
  "0xfd0824df1e598d34c3495e1c2a339e2fa23af40d", // v2 WAVAX-FRAX
  "0x76ad5c64fe6b26b6ad9aaaa19eba00e9eca31fe1", // v2 WAVAX-FXS
  "0x5105d9de003fb7d22979cd0ce167ab919e60900a", // v2 WAVAX-START
  "0x255e7a0eb5aa1616781702203b042821c35394ef", // v2 WAVAX-SWAP.e (aeb)
  "0x6f571ba11447136fc11ba9ac98f0f0233dac1bff", // v2 WAVAX-YTS
  "0xed617a06c6c727827ca3b6fb3e565c68342c4c2b", // v2 WAVAX-TUNDRA
  "0xbd56b964fcdd208a7a83c291864eeb8271bab773", // v2 WAVAX-XUSD
  "0x5d479aebfc49b9e08860bbfcfb3bb4d768aa1fc3", // v2 WAVAX-XDO
  "0xc0b2d45b8617997bcdad0f33aee03e4df4c4f81e", // v2 WAVAX-JOE
  "0x184949e5a7e8740da20231b90fd38e7725fa657a", // v2 WAVAX-ZABU
  "0x2dae4d6cccd824917ca783774c1e8854ff86951f", // v2 WAVAX-YAY
  "0x62da43b98a9338221cc36dda40605b0f5ea0ac2d", // v2 WAVAX-STORM
  "0xda959f3464fe2375f0b1f8a872404181931978b2", // v2 WAVAX-VEE
  "0x05930052a9a1e2f14b0e6ccc726b60e06792fb67", // v2 WAVAX-AVXT
  "0x01bc14c7063212c8cac269960ba875e58568e4fd", // v2 WAVAX-OLIVE
  "0xac102f66a1670508dfa5753fcbbba80e0648a0c7", // v2 WAVAX-APE-IN
  "0x6cfdb5ce2a26a5b07041618fdad81273815c8bb4", // v2 WAVAX-GB
  "0xd43035f5ef932e1335a664c707d85c54c924667e", // v2 WAVAX-CNR
  "0x45cd033361e9fef750aaea96dbc360b342f4b4a2", // v2 WAVAX-CYCLE
  "0x12b493a6e4f185ef1feef45565654f71156c25ba", // v2 WAVAX-ICE
  "0x716c19807f46f97ddac0745878675ff5b3a75004", // v2 WAVAX-mYAK
  "0x437352a8e2394379521bc84f0874c66c94f32fbb", // v2 WAVAX-WOW
  "0x676247d8729b728beea83d1c1314acdd937327b6", // v2 WAVAX-TEDDY
  "0x30914dbb452bef7ad226af0aeb130658a4ac1cb0", // v2 WAVAX-TSD
  "0xfc04c452035a1e4d4fd4d5bf6b083cb563a20ca4", // v2 WAVAX-EVRT
  "0xa69057977211c7bae847c72df6338d1b71e838af", // v2 WAVAX-RAI
  "0xaa01f80375528f36291677c683905b4a113a6470", // v2 WAVAX-aAVAXb
  "0x41d731926e5b8d3ba70bb62b9f067a163be706ab", // v2 WAVAX-INSUR
  "0xe4fed988974c0b7dfeb162287ded67c6b197af63", // v2 WAVAX-AVME
  "0x0875e51e54fbb7e63b1819acb069dc8d684563eb", // v2 WAVAX-TIME
  "0x6528dcc443b2e014185946d1dc1efd6e9abe4cd8", // v2 WAVAX-HCT
  "0x55152e05202ae58fdab26b20c6fd762f5bca797c", // v2 WAVAX-FRAX2
  "0x23855f21d158efae410e3568fb623c35bc1952e0", // v2 WAVAX-ROCO
  "0xd6887808cfcd5cbff867379e41fac912f167b084", // v2 WAVAX-IMX
  "0xfe6338bebef1989afa225494a63f235d8e8f46fd", // v2 WAVAX-AMPL
  "0xc2ecb35624ad941474371e696ac8dad0dda5e4d5", // v2 WAVAX-ORBS

  "0x7ac007afb5d61f48d1e3c8cc130d4cf6b765000e", // v2 PNG-ETH (aeb)
  "0x03a9091620cacee4968c915232b175c16a584733", // v2 PNG-WETH.e
  "0xe2510a1fcccde8d2d1c40b41e8f71fb1f47e5bba", // v2 PNG-USDT (aeb)
  "0x7216d1e173c1f1ed990239d5c77d74714a837cd5", // v2 PNG-USDT.e
  "0x681047473b6145ba5db90b074e32861549e85cc7", // v2 PNG-WBTC (aeb)
  "0xeeea1e815f12d344b5035a33da4bc383365f5fee", // v2 PNG-WBTC.e
  "0x6356b24b36074abe2903f44fe4019bc5864fde36", // v2 PNG-LINK (aeb)
  "0x4b283e4211b3faa525846d21869925e78f93f189", // v2 PNG-LINK.e
  "0xe3103e565cf96a5709ae8e603b1efb7fed04613b", // v2 PNG-DAI (aeb)
  "0xf344611dd94099708e508c2deb16628578940d77", // v2 PNG-DAI.e
  "0x4f74bbf6859a994e7c309ea0f11e3cc112955110", // v2 PNG-UNI (aeb)
  "0xd4e49a8ec23dab51aca459d233e9447de03afd29", // v2 PNG-UNI.e
  "0x633f4b4db7dd4fa066bd9949ab627a551e0ecd32", // v2 PNG-SUSHI (aeb)
  "0x923e69322bea5e22799a29dcfc9c616f3b5cf95b", // v2 PNG-SUSHI.e
  "0xfd9acec0f413ca05d5ad5b962f3b4de40018ad87", // v2 PNG-AAVE (aeb)
  "0x3f91756d773a1455a7a1a70f5d9239f1b1d1f095", // v2 PNG-AAVE.e
  "0xc7d0e29b616b29ac6ff4fd5f37c8da826d16db0d", // v2 PNG-YFI (aeb)
  "0x269ed6b2040f965d9600d0859f36951cb9f01460", // v2 PNG-YFI.e
  "0x08b9a023e34bad6db868b699fa642bf5f12ebe76", // v2 PNG-SNOB
  "0x759ee0072901f409e4959e00b00a16fd729397ec", // v2 PNG-VSO
  "0x12a33f6b0dd0d35279d402ab61587fe7eb23f7b0", // v2 PNG-SPORE
  "0x518b07e2d9e08a8c2e3cb7704336520827a4d399", // v2 PNG-BIFI
  "0x68a90c38bf4f90ac2a870d6fca5b0a5a218763ad", // v2 PNG-BNB
  "0x5b3ed7f47d1d4fa22b559d043a09d78bc55a94e9", // v2 PNG-XAVA
  "0x76e404ab7357fd97d4f1e8dd52f298a035fd408c", // v2 PNG-PEFI
  "0x0a9773aebc1429d860a492d70c8ea335faa9f19f", // v2 PNG-TRYB
  "0x80e919784e7c5ad3dd59cafcdc0e9c079b65f262", // v2 PNG-SHERPA
  "0x42ff9473a5aea00de39355e0288c7a151eb00b6e", // v2 PNG-YAK
  "0x3a0ef6a586d9c15de30edf5d34ae00e26b0125ce", // v2 PNG-DYP
  "0x2bd42c357a3e13f18849c67e8dc108cc8462ae33", // v2 PNG-QI
  "0x393fe4bc29afbb3786d99f043933c49097449fa1", // v2 PNG-WALBT
  "0x07b34daabcb75c9cbd0c8aefbc0ed5e30845ef12", // v2 PNG-HUSKY
  "0x73d1cc4b8da555005e949b3ecee490a7206c14df", // v2 PNG-USDC.e
  "0xe1314e6d436877850bb955ac074226fcb0b8a86d", // v2 PNG-LYD
  "0x6fa49bd916e392dc9264636b0b5cf2beee652da3", // v2 PNG-TUSD
  "0x95bd8fdb58692d343c89bc7bc435773779cc0e47", // v2 PNG-GAJ
  "0xb008e7ad32c710b07fb8d4453abc79214cd34891", // v2 PNG-GDL
  "0x4c0650668a63ef468c7bdcd910a62287e9fc4d52", // v2 PNG-MFI
  "0xecf9b9ae88150f11cbf2263c69823e2ecb84f07b", // v2 PNG-SHIBX
  "0x7c960e55c8119457528490c3a34c1438faf6b039", // v2 PNG-AVE
  "0xfcb0c53fc5c71005d11c6838922e254323b7ca06", // v2 PNG-ELE
];

export function handleTransfer(event: Transfer): void {
  let eventToAsHexString = event.params.to.toHexString();
  let eventFromAsHexString = event.params.from.toHexString();

  // ignore initial transfers for first adds
  if (
    eventToAsHexString == ADDRESS_ZERO &&
    event.params.value.equals(BigInt.fromI32(1000))
  ) {
    return;
  }

  // skip if staking/unstaking
  if (
    MINING_POOLS.includes(eventFromAsHexString) ||
    MINING_POOLS.includes(eventToAsHexString)
  ) {
    return;
  }

  // get pair and load contract
  let pair = Pair.load(event.address.toHexString());

  // liquidity token amount being transferred
  let value = convertTokenToDecimal(event.params.value, BI_18);

  if (eventFromAsHexString == ADDRESS_ZERO) {
    // update total supply
    pair.totalSupply = pair.totalSupply.plus(value);
    pair.save();
  }

  // burn
  if (eventToAsHexString == ADDRESS_ZERO && eventFromAsHexString == pair.id) {
    pair.totalSupply = pair.totalSupply.minus(value);
    pair.save();
  }
}

export function handleSync(event: Sync): void {
  let pair = Pair.load(event.address.toHex());
  let token0 = Token.load(pair.token0);
  let token1 = Token.load(pair.token1);
  let pangolin = PangolinFactory.load(FACTORY_ADDRESS);

  // reset factory liquidity by subtracting only tracked liquidity
  pangolin.totalLiquidityETH = pangolin.totalLiquidityETH.minus(
    pair.trackedReserveETH
  );

  // reset token total liquidity amounts
  token0.totalLiquidity = token0.totalLiquidity.minus(pair.reserve0);
  token1.totalLiquidity = token1.totalLiquidity.minus(pair.reserve1);

  pair.reserve0 = convertTokenToDecimal(event.params.reserve0, token0.decimals);
  pair.reserve1 = convertTokenToDecimal(event.params.reserve1, token1.decimals);

  if (pair.reserve1.notEqual(ZERO_BD))
    pair.token0Price = pair.reserve0.div(pair.reserve1);
  else pair.token0Price = ZERO_BD;
  if (pair.reserve0.notEqual(ZERO_BD))
    pair.token1Price = pair.reserve1.div(pair.reserve0);
  else pair.token1Price = ZERO_BD;

  pair.save();

  // update ETH price now that reserves could have changed
  let bundle = Bundle.load("1");
  bundle.ethPrice = getAVAXPriceInUSD(event.block.number);
  bundle.save();

  token0.derivedETH = findEthPerToken(token0 as Token);
  token0.derivedUSD = token0.derivedETH.times(bundle.ethPrice);
  token1.derivedETH = findEthPerToken(token1 as Token);
  token1.derivedUSD = token1.derivedETH.times(bundle.ethPrice);
  // token0.save() // Not required to save since nothing loads token0 before save() at end of this method
  // token1.save() // Not required to save since nothing loads token1 before save() at end of this method

  // get tracked liquidity - will be 0 if neither is in whitelist
  if (bundle.ethPrice.notEqual(ZERO_BD)) {
    pair.trackedReserveUSD = getTrackedLiquidityUSD(
      pair.reserve0,
      token0 as Token,
      pair.reserve1,
      token1 as Token,
      bundle.ethPrice
    );
    pair.trackedReserveETH = pair.trackedReserveUSD.div(bundle.ethPrice);
  }

  // use derived amounts within pair
  pair.reserveETH = pair.reserve0
    .times(token0.derivedETH as BigDecimal)
    .plus(pair.reserve1.times(token1.derivedETH as BigDecimal));
  pair.reserveUSD = pair.reserveETH.times(bundle.ethPrice);

  // use tracked amounts globally
  pangolin.totalLiquidityETH = pangolin.totalLiquidityETH.plus(
    pair.trackedReserveETH
  );
  pangolin.totalLiquidityUSD = pangolin.totalLiquidityETH.times(
    bundle.ethPrice
  );

  // now correctly set liquidity amounts for each token
  token0.totalLiquidity = token0.totalLiquidity.plus(pair.reserve0);
  token1.totalLiquidity = token1.totalLiquidity.plus(pair.reserve1);

  // save entities
  pair.save();
  pangolin.save();
  token0.save();
  token1.save();
}
