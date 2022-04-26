/* eslint-disable prefer-const */
import {
  BigInt,
  BigDecimal,
  Address,
  EthereumEvent,
  log,
} from "@graphprotocol/graph-ts";
import { ERC20 } from "../generated/Factory/ERC20";
import { ERC20SymbolBytes } from "../generated/Factory/ERC20SymbolBytes";
import { ERC20NameBytes } from "../generated/Factory/ERC20NameBytes";
import { RewarderViaMultiplier } from "../generated/MiniChefV2/RewarderViaMultiplier";
import {
  User,
  Bundle,
  Farm,
  Token,
  LiquidityPosition,
  LiquidityPositionSnapshot,
  Pair,
  FarmReward,
  Minichef,
} from "../generated/schema";

export const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";
export const FACTORY_ADDRESS = "0xefa94DE7a4656D787667C749f7E1223D71E9FD88";
export const ROUTER_ADDRESS = "0xe54ca86531e17ef3616d22ca28b0d458b6c89106";
export const PNG_ADDRESS = "0x60781c2586d68229fde47564546784ab3faca982";

export let ZERO_BI = BigInt.fromI32(0);
export let ONE_BI = BigInt.fromI32(1);
export let ZERO_BD = BigDecimal.fromString("0");
export let ONE_BD = BigDecimal.fromString("1");
export let TWO_BD = BigDecimal.fromString("2");
export let TEN_BD = BigDecimal.fromString("10");
export let BI_18 = BigInt.fromI32(18);

export function exponentToBigDecimal(decimals: BigInt): BigDecimal {
  let bd = ONE_BD;
  for (let i = ZERO_BI; i.lt(decimals as BigInt); i = i.plus(ONE_BI)) {
    bd = bd.times(TEN_BD);
  }
  return bd;
}

export function convertTokenToDecimal(
  tokenAmount: BigInt,
  exchangeDecimals: BigInt
): BigDecimal {
  if (exchangeDecimals == ZERO_BI) {
    return tokenAmount.toBigDecimal();
  }
  return tokenAmount.toBigDecimal().div(exponentToBigDecimal(exchangeDecimals));
}

export function isNullEthValue(value: string): boolean {
  return (
    value ==
    "0x0000000000000000000000000000000000000000000000000000000000000001"
  );
}

export function fetchTokenSymbol(tokenAddress: Address): string {
  // hard coded overrides
  // ...

  let contract = ERC20.bind(tokenAddress);
  let contractSymbolBytes = ERC20SymbolBytes.bind(tokenAddress);

  // try types string and bytes32 for symbol
  let symbolValue = "unknown";
  let symbolResult = contract.try_symbol();
  if (symbolResult.reverted) {
    let symbolResultBytes = contractSymbolBytes.try_symbol();
    if (!symbolResultBytes.reverted) {
      // for broken pairs that have no symbol function exposed
      if (!isNullEthValue(symbolResultBytes.value.toHexString())) {
        symbolValue = symbolResultBytes.value.toString();
      }
    }
  } else {
    symbolValue = symbolResult.value;
  }

  return symbolValue;
}

export function fetchTokenName(tokenAddress: Address): string {
  // hard coded overrides
  // ...

  let contract = ERC20.bind(tokenAddress);
  let contractNameBytes = ERC20NameBytes.bind(tokenAddress);

  // try types string and bytes32 for name
  let nameValue = "unknown";
  let nameResult = contract.try_name();
  if (nameResult.reverted) {
    let nameResultBytes = contractNameBytes.try_name();
    if (!nameResultBytes.reverted) {
      // for broken exchanges that have no name function exposed
      if (!isNullEthValue(nameResultBytes.value.toHexString())) {
        nameValue = nameResultBytes.value.toString();
      }
    }
  } else {
    nameValue = nameResult.value;
  }

  return nameValue;
}

export function fetchTokenTotalSupply(tokenAddress: Address): BigInt {
  let contract = ERC20.bind(tokenAddress);
  let totalSupplyValue = null;
  let totalSupplyResult = contract.try_totalSupply();
  if (!totalSupplyResult.reverted) {
    totalSupplyValue = totalSupplyResult as i32;
  }
  return BigInt.fromI32(totalSupplyValue as i32);
}

export function fetchTokenDecimals(tokenAddress: Address): BigInt {
  // hardcode overrides
  // ...

  let contract = ERC20.bind(tokenAddress);
  // try types uint8 for decimals
  let decimalValue = null;
  let decimalResult = contract.try_decimals();
  if (!decimalResult.reverted) {
    decimalValue = decimalResult.value;
  }
  return BigInt.fromI32(decimalValue as i32);
}

export function fetchRewardTokens(rewarderAddress: Address): Array<Address> {
  let contract = RewarderViaMultiplier.bind(rewarderAddress);
  let totalRewardTokenValue = [] as Array<Address>;
  let totalRewardTokenResult = contract.try_getRewardTokens();
  if (!totalRewardTokenResult.reverted) {
    totalRewardTokenValue = totalRewardTokenResult.value as Array<Address>;
  }
  return totalRewardTokenValue;
}

export function fetchRewardMultipliers(
  rewarderAddress: Address
): Array<BigInt> {
  let contract = RewarderViaMultiplier.bind(rewarderAddress);
  let totalRewardMultiplierValue = [] as Array<BigInt>;
  let totalRewardMultiplierResult = contract.try_getRewardMultipliers();
  if (!totalRewardMultiplierResult.reverted) {
    totalRewardMultiplierValue = totalRewardMultiplierResult.value;
  }
  return totalRewardMultiplierValue as Array<BigInt>;
}

export function createLiquidityPosition(
  exchange: Address,
  user: Address
): LiquidityPosition {
  let id = exchange
    .toHexString()
    .concat("-")
    .concat(user.toHexString());
  let liquidityTokenBalance = LiquidityPosition.load(id);
  if (liquidityTokenBalance === null) {
    let pair = Pair.load(exchange.toHexString());
    pair.liquidityProviderCount = pair.liquidityProviderCount.plus(ONE_BI);
    liquidityTokenBalance = new LiquidityPosition(id);
    liquidityTokenBalance.liquidityTokenBalance = ZERO_BD;
    liquidityTokenBalance.pair = exchange.toHexString();
    liquidityTokenBalance.user = user.toHexString();
    liquidityTokenBalance.save();
    pair.save();
  }
  return liquidityTokenBalance as LiquidityPosition;
}

export function createUser(address: Address): void {
  let user = User.load(address.toHexString());
  if (user === null) {
    user = new User(address.toHexString());
    user.usdSwapped = ZERO_BD;
    user.save();
  }
}

export function createFarm(
  chef: Address,
  pid: BigInt,
  pair: Address,
  rewarderAddress: Address,
  allocPoint: BigInt
): void {
  log.info(
    "===================FarmCreate: address : {}, pid: {},  pair: {}, rewarderAddress:{}",
    [
      chef.toHexString(),
      pid.toHexString(),
      pair.toHexString(),
      rewarderAddress.toHexString(),
    ]
  );

  let minichefKey = chef.toHexString();

  let minichef = Minichef.load(minichefKey);

  if (minichef !== null) {
    minichef.totalAllocPoint = minichef.totalAllocPoint.plus(allocPoint);
    minichef.save();
  } else {
    let minichef = new Minichef(minichefKey);
    minichef.totalAllocPoint = ZERO_BI.plus(allocPoint);
    minichef.rewardsExpiration = ZERO_BI;
    minichef.rewardPerSecond = ZERO_BI;
    minichef.save();
  }

  let farmKey = chef.toHexString() + "-" + pid.toHexString();
  let farm = Farm.load(farmKey);
  if (farm === null) {
    farm = new Farm(farmKey);
    farm.chefAddress = chef;
    farm.pid = pid;
    farm.pairAddress = pair;
    farm.rewarderAddress = rewarderAddress;
    farm.tvl = ZERO_BD;
    farm.allocPoint = allocPoint;

    let pairData = Pair.load(pair.toHexString());

    if (!!pairData) {
      farm.pair = pairData.id;
    }

    farm.save();

    // fetch info if null
    if (rewarderAddress !== null) {
      createUpdateFarmRewards(rewarderAddress, farmKey);
    }
  }
}

export function createUpdateFarmRewards(
  rewarderAddress: Address,
  farmKey: string,
  overwrite: boolean = false
): void {
  log.info(
    "===================createReward====" + rewarderAddress.toHexString(),
    []
  );

  log.info("===================createReward=== farmKey====" + farmKey, []);

  let farm = Farm.load(farmKey);

  log.info("===================createReward=== fard id====" + farm.id, []);

  if (!!farm) {
    log.info("XXXXXXXXXXXXXXXXXXXfarmloaded====", []);

    let defaultRewardKey =rewarderAddress.toHexString() +"-" +PNG_ADDRESS +"-" +ZERO_BI.toString();

    log.info("===================defaultRewardKey====" + defaultRewardKey, []);

    let reward = new FarmReward(defaultRewardKey);

    reward.token = PNG_ADDRESS;
    reward.multiplier = ONE_BI;
    reward.farm = farm.id;

    log.info("===================farm saved====", []);

    reward.save();

    if (rewarderAddress.toHexString() != ADDRESS_ZERO) {
      let rewardTokens = fetchRewardTokens(rewarderAddress);
      let multipliers = fetchRewardMultipliers(rewarderAddress);

      log.info("===================farm rewards==== {}", farm.rewards || []);

      if (farm.rewards !== null && overwrite) {
        log.info("===================overwrite", []);

        for (let index = 0; index < farm.rewards.length + 1; index++) {
          let rewardData = farm.rewards;
          let rewardId = rewardData[index];

          let farmReward = FarmReward.load(rewardId.toString());
          farmReward.unset(rewardId.toString());
        }
      }

      let defaultRewardKey =rewarderAddress.toHexString() +"-" +PNG_ADDRESS +"-" +ZERO_BI.toString();
      let reward = new FarmReward(defaultRewardKey);

      reward.token = PNG_ADDRESS;
      reward.multiplier = ONE_BI;
      reward.farm = farm.id;
      reward.save();

      for (let i = 0; i < rewardTokens.length; ++i) {
        let rewarderAddrKey = rewarderAddress.toHexString();
        let rewardTokensKey = rewardTokens[i].toHexString();

        log.info("===================rewardTokensKey:{}", [
          rewardTokens[i].toHexString(),
        ]);

        let index = i + 1;
        let rewardKey =rewarderAddrKey + "-" +rewardTokensKey + "-" +BigInt.fromI32(index).toString();

        log.info("===================rewardKey:{}", [rewardKey]);

        let reward = new FarmReward(rewardKey);

        let multiplier = multipliers[i];

        reward.token = rewardTokens[i].toHexString();
        reward.multiplier = multiplier;
        reward.farm = farm.id;
        reward.save();
      }
    }
  } else {
    return;
  }
}

export function createLiquiditySnapshot(
  position: LiquidityPosition,
  event: EthereumEvent
): void {
  let timestamp = event.block.timestamp.toI32();
  let bundle = Bundle.load("1");
  let pair = Pair.load(position.pair);
  let token0 = Token.load(pair.token0);
  let token1 = Token.load(pair.token1);

  // create new snapshot
  let snapshot = new LiquidityPositionSnapshot(
    position.id.concat(timestamp.toString())
  );
  snapshot.liquidityPosition = position.id;
  snapshot.timestamp = timestamp;
  snapshot.block = event.block.number.toI32();
  snapshot.user = position.user;
  snapshot.pair = position.pair;
  snapshot.token0PriceUSD = token0.derivedETH.times(bundle.ethPrice);
  snapshot.token1PriceUSD = token1.derivedETH.times(bundle.ethPrice);
  snapshot.reserve0 = pair.reserve0;
  snapshot.reserve1 = pair.reserve1;
  snapshot.reserveUSD = pair.reserveUSD;
  snapshot.liquidityTokenTotalSupply = pair.totalSupply;
  snapshot.liquidityTokenBalance = position.liquidityTokenBalance;
  snapshot.liquidityPosition = position.id;
  snapshot.save();
  position.save();
}
