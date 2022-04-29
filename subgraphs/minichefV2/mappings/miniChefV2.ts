/* eslint-disable prefer-const */
import { Address, log } from "@graphprotocol/graph-ts";
import { Farm, FarmRewarder, Minichef } from "../generated/schema";
import {
  convertTokenToDecimal,
  createUser,
  BI_18,
  createLiquidityPosition,
  createLiquiditySnapshot,
  createFarm,
  createUpdateFarmRewards,
  ZERO_BI,
} from "./helpers";
import {
  Deposit,
  PoolAdded,
  Withdraw,
  EmergencyWithdraw,
  PoolSet,
  LogRewardPerSecond,
  LogRewardsExpiration,
} from "../generated/MiniChefV2/MiniChefV2";

export function handlePoolAdded(event: PoolAdded): void {
  log.info("============== handlePoolAdded =======", []);
  createFarm(
    event.address,
    event.params.pid,
    event.params.lpToken,
    event.params.rewarder,
    event.params.allocPoint
  );
}

export function handleDeposit(event: Deposit): void {
  log.info("============== handleDeposit =======", []);

  let farmKey =
    event.address.toHexString() + "-" + event.params.pid.toHexString();

  log.info("===================farmKey:{}", [farmKey]);

  let farm = Farm.load(farmKey);

  log.info("===================  farm.tvl before plus :{}", [
    farm.tvl.toString(),
  ]);
  let convertedAmount = convertTokenToDecimal(event.params.amount, BI_18);

  farm.tvl = farm.tvl.plus(convertedAmount);

  log.info("===================  farm.tvl after plus :{}", [
    farm.tvl.toString(),
  ]);

  farm.save();

  // user stats
  createUser(event.params.to);

  if (event.params.user.notEqual(event.params.to)) {
    let fromUserLiquidityPosition = createLiquidityPosition(
      farm.pairAddress as Address,
      event.params.user
    );
    fromUserLiquidityPosition.liquidityTokenBalance = fromUserLiquidityPosition.liquidityTokenBalance.minus(
      convertedAmount
    );
    fromUserLiquidityPosition.save();

    createLiquiditySnapshot(fromUserLiquidityPosition, event);

    let toUserLiquidityPosition = createLiquidityPosition(
      farm.pairAddress as Address,
      event.params.to
    );
    toUserLiquidityPosition.liquidityTokenBalance = toUserLiquidityPosition.liquidityTokenBalance.plus(
      convertedAmount
    );
    toUserLiquidityPosition.save();
    createLiquiditySnapshot(toUserLiquidityPosition, event);
  }
}

export function handleWithdraw(event: Withdraw): void {
  log.info("============== handleWithdraw =======", []);

  let farmKey =
    event.address.toHexString() + "-" + event.params.pid.toHexString();

  log.info("===================farmKey:{}", [farmKey]);

  let farm = Farm.load(farmKey);

  log.info("===================  farm.tvl before minus :{}", [
    farm.tvl.toString(),
  ]);

  let convertedAmount = convertTokenToDecimal(event.params.amount, BI_18);

  farm.tvl = farm.tvl.minus(convertedAmount);

  log.info("===================  farm.tvl after minus :{}", [
    farm.tvl.toString(),
  ]);

  farm.save();

  // user stats
  createUser(event.params.to);

  if (event.params.user.notEqual(event.params.to)) {
    let fromUserLiquidityPosition = createLiquidityPosition(
      farm.pairAddress as Address,
      event.params.user
    );
    fromUserLiquidityPosition.liquidityTokenBalance = fromUserLiquidityPosition.liquidityTokenBalance.minus(
      convertedAmount
    );
    fromUserLiquidityPosition.save();

    createLiquiditySnapshot(fromUserLiquidityPosition, event);

    let toUserLiquidityPosition = createLiquidityPosition(
      farm.pairAddress as Address,
      event.params.to
    );
    toUserLiquidityPosition.liquidityTokenBalance = toUserLiquidityPosition.liquidityTokenBalance.plus(
      convertedAmount
    );
    toUserLiquidityPosition.save();
    createLiquiditySnapshot(toUserLiquidityPosition, event);
  }
}

export function handleEmergencyWithdraw(event: EmergencyWithdraw): void {
  // user stats
  createUser(event.params.to);

  if (event.params.user.notEqual(event.params.to)) {
    let farmKey =
      event.address.toHexString() + "-" + event.params.pid.toHexString();
    let farm = Farm.load(farmKey);

    let convertedAmount = convertTokenToDecimal(event.params.amount, BI_18);

    let fromUserLiquidityPosition = createLiquidityPosition(
      farm.pairAddress as Address,
      event.params.user
    );
    fromUserLiquidityPosition.liquidityTokenBalance = fromUserLiquidityPosition.liquidityTokenBalance.minus(
      convertedAmount
    );
    fromUserLiquidityPosition.save();

    farm.tvl = farm.tvl.minus(convertedAmount);
    farm.save();

    createLiquiditySnapshot(fromUserLiquidityPosition, event);

    let toUserLiquidityPosition = createLiquidityPosition(
      farm.pairAddress as Address,
      event.params.to
    );
    toUserLiquidityPosition.liquidityTokenBalance = toUserLiquidityPosition.liquidityTokenBalance.plus(
      convertedAmount
    );
    toUserLiquidityPosition.save();
    createLiquiditySnapshot(toUserLiquidityPosition, event);
  }
}

export function handlePoolSet(event: PoolSet): void {
  log.info("============== handlePoolSet =======", []);

  let allocPoint = event.params.allocPoint;
  let overwrite = event.params.overwrite;
  let pid = event.params.pid;
  let rewarder = event.params.rewarder;
  let minichefKey = event.address.toHexString();
  let farmKey = minichefKey + "-" + pid.toHexString();
  let rewarderId = rewarder.toHexString() + "-" + pid.toHexString();

  let farm = Farm.load(farmKey);

  if (farm !== null) {
    farm.allocPoint = allocPoint;

    // if we want to overwrite then update rewarder in farm
    if (overwrite) {
      let farmRewarder = FarmRewarder.load(rewarderId);
      if (farmRewarder === null) {
        farmRewarder = new FarmRewarder(rewarderId);
        farmRewarder.farm = farmKey;
      }
      farm.rewarder = rewarderId;
      farmRewarder.save();
    }

    farm.save();

    let minichef = Minichef.load(minichefKey);

    if (minichef !== null && farm.allocPoint !== null) {
      minichef.totalAllocPoint = minichef.totalAllocPoint.plus(
        allocPoint.minus(farm.allocPoint)
      );
      minichef.save();
    } else {
      let minichef = new Minichef(minichefKey);
      if (farm.allocPoint !== null) {
        minichef.totalAllocPoint = minichef.totalAllocPoint.plus(
          allocPoint.minus(farm.allocPoint)
        );
        minichef.rewardsExpiration = ZERO_BI;
        minichef.rewardPerSecond = ZERO_BI;
        minichef.save();
      }
    }
  }

  createUpdateFarmRewards(rewarder, pid, rewarderId);
}

export function handleLogRewardPerSecond(event: LogRewardPerSecond): void {
  log.info(
    "============== handleLogRewardPerSecond =======" +
      event.params.rewardPerSecond.toString(),
    []
  );

  let minichefKey = event.address.toHexString();

  let minichef = Minichef.load(minichefKey);

  if (minichef !== null) {
    minichef.rewardPerSecond = event.params.rewardPerSecond;
    minichef.save();
  } else {
    let minichef = new Minichef(minichefKey);
    minichef.rewardPerSecond = event.params.rewardPerSecond;
    minichef.totalAllocPoint = ZERO_BI;
    minichef.rewardsExpiration = ZERO_BI;
    minichef.save();
  }
}

export function handleLogRewardsExpiration(event: LogRewardsExpiration): void {
  log.info(
    "============== handleLogRewardsExpiration =======" +
      event.params.rewardsExpiration.toString(),
    []
  );

  let minichefKey = event.address.toHexString();

  let minichef = Minichef.load(minichefKey);

  if (minichef !== null) {
    minichef.rewardsExpiration = event.params.rewardsExpiration;
    minichef.save();
  } else {
    let minichef = new Minichef(minichefKey);
    minichef.rewardsExpiration = event.params.rewardsExpiration;
    minichef.totalAllocPoint = ZERO_BI;
    minichef.rewardPerSecond = ZERO_BI;
    minichef.save();
  }
}
