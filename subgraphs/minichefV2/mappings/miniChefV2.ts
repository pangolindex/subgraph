/* eslint-disable prefer-const */
import { Address } from "@graphprotocol/graph-ts";
import { Farm, Minichef } from "../generated/schema";
import {
  convertTokenToDecimal,
  createUser,
  BI_18,
  createLiquidityPosition,
  createFarm,
  createUpdateFarmRewards,
  ZERO_BI,
  createUpdateReWarder,
  createUpdateMiniChef,
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
  // log.info("============== handlePoolAdded =======", []);
  createFarm(
    event.address,
    event.params.pid,
    event.params.lpToken,
    event.params.rewarder,
    event.params.allocPoint
  );
}

export function handleDeposit(event: Deposit): void {
  // log.info("============== handleDeposit =======", []);

  let farmKey =
    event.address.toHexString() + "-" + event.params.pid.toHexString();

  // log.info("===================farmKey:{}", [farmKey]);

  let farm = Farm.load(farmKey);

  // log.info("===================  farm.tvl before plus :{}", [
  //   farm.tvl.toString(),
  // ]);
  let convertedAmount = convertTokenToDecimal(event.params.amount, BI_18);

  farm.tvl = farm.tvl.plus(convertedAmount);

  // log.info("===================  farm.tvl after plus :{}", [
  //   farm.tvl.toString(),
  // ]);

  farm.save();

  // user stats
  createUser(event.params.to);

  if (event.params.user.notEqual(event.params.to)) {
    let fromUserLiquidityPosition = createLiquidityPosition(
      farm.pairAddress as Address,
      event.params.user,
      farmKey
    );
    fromUserLiquidityPosition.liquidityTokenBalance = fromUserLiquidityPosition.liquidityTokenBalance.minus(
      convertedAmount
    );
    fromUserLiquidityPosition.save();

    let toUserLiquidityPosition = createLiquidityPosition(
      farm.pairAddress as Address,
      event.params.to,
      farmKey
    );
    toUserLiquidityPosition.liquidityTokenBalance = toUserLiquidityPosition.liquidityTokenBalance.plus(
      convertedAmount
    );
    toUserLiquidityPosition.save();
  } else {
    let toUserLP = createLiquidityPosition(
      farm.pairAddress as Address,
      event.params.to,
      farmKey
    );
    toUserLP.liquidityTokenBalance = toUserLP.liquidityTokenBalance.plus(
      convertedAmount
    );
    toUserLP.save();
  }
}

export function handleWithdraw(event: Withdraw): void {
  // log.info("============== handleWithdraw =======", []);

  let farmKey =
    event.address.toHexString() + "-" + event.params.pid.toHexString();

  // log.info("===================farmKey:{}", [farmKey]);

  let farm = Farm.load(farmKey);

  // log.info("===================  farm.tvl before minus :{}", [
  //   farm.tvl.toString(),
  // ]);

  let convertedAmount = convertTokenToDecimal(event.params.amount, BI_18);

  farm.tvl = farm.tvl.minus(convertedAmount);

  // log.info("===================  farm.tvl after minus :{}", [
  //   farm.tvl.toString(),
  // ]);

  farm.save();

  // user stats
  createUser(event.params.to);

  if (event.params.user.notEqual(event.params.to)) {
    let fromUserLiquidityPosition = createLiquidityPosition(
      farm.pairAddress as Address,
      event.params.user,
      farmKey
    );
    fromUserLiquidityPosition.liquidityTokenBalance = fromUserLiquidityPosition.liquidityTokenBalance.minus(
      convertedAmount
    );
    fromUserLiquidityPosition.save();

    let toUserLiquidityPosition = createLiquidityPosition(
      farm.pairAddress as Address,
      event.params.to,
      farmKey
    );
    toUserLiquidityPosition.liquidityTokenBalance = toUserLiquidityPosition.liquidityTokenBalance.plus(
      convertedAmount
    );
    toUserLiquidityPosition.save();
  } else {
    let toUserLP = createLiquidityPosition(
      farm.pairAddress as Address,
      event.params.to,
      farmKey
    );
    toUserLP.liquidityTokenBalance = toUserLP.liquidityTokenBalance.minus(
      convertedAmount
    );
    toUserLP.save();
  }
}

export function handleEmergencyWithdraw(event: EmergencyWithdraw): void {
  let farmKey =
    event.address.toHexString() + "-" + event.params.pid.toHexString();
  let farm = Farm.load(farmKey);

  let convertedAmount = convertTokenToDecimal(event.params.amount, BI_18);

  // user stats
  createUser(event.params.to);

  if (event.params.user.notEqual(event.params.to)) {
    let fromUserLiquidityPosition = createLiquidityPosition(
      farm.pairAddress as Address,
      event.params.user,
      farmKey
    );
    fromUserLiquidityPosition.liquidityTokenBalance = fromUserLiquidityPosition.liquidityTokenBalance.minus(
      convertedAmount
    );
    fromUserLiquidityPosition.save();

    farm.tvl = farm.tvl.minus(convertedAmount);
    farm.save();

    let toUserLiquidityPosition = createLiquidityPosition(
      farm.pairAddress as Address,
      event.params.to,
      farmKey
    );
    toUserLiquidityPosition.liquidityTokenBalance = toUserLiquidityPosition.liquidityTokenBalance.plus(
      convertedAmount
    );
    toUserLiquidityPosition.save();
  } else {
    let toUserLP = createLiquidityPosition(
      farm.pairAddress as Address,
      event.params.to,
      farmKey
    );
    toUserLP.liquidityTokenBalance = toUserLP.liquidityTokenBalance.minus(
      convertedAmount
    );
    toUserLP.save();
  }
}

export function handlePoolSet(event: PoolSet): void {
  // log.info("============== handlePoolSet =======", []);

  let allocPoint = event.params.allocPoint;
  let overwrite = event.params.overwrite;
  let pid = event.params.pid;
  let rewarder = event.params.rewarder;
  let minichefKey = event.address.toHexString();
  let farmKey = minichefKey + "-" + pid.toHexString();
  let rewarderId = rewarder.toHexString() + "-" + pid.toHexString();

  let farm = Farm.load(farmKey);

  if (farm !== null) {
    // if we want to overwrite then update rewarder in farm
    if (overwrite) {
      createUpdateReWarder(rewarderId, farmKey);
      farm.rewarder = rewarderId;
    }

    let minichef = Minichef.load(minichefKey);
    let totalAllocPoint = ZERO_BI;

    if (minichef !== null) {
      totalAllocPoint = minichef.totalAllocPoint.plus(
        allocPoint.minus(farm.allocPoint)
      );
    }

    farm.allocPoint = allocPoint;
    createUpdateMiniChef(minichefKey, ZERO_BI, totalAllocPoint, ZERO_BI);
    farm.save();
  }

  createUpdateFarmRewards(rewarder, pid, rewarderId);
}

export function handleLogRewardPerSecond(event: LogRewardPerSecond): void {
  // log.info(
  //   "============== handleLogRewardPerSecond =======" +
  //     event.params.rewardPerSecond.toString(),
  //   []
  // );

  createUpdateMiniChef(
    event.address.toHexString(),
    ZERO_BI,
    ZERO_BI,
    event.params.rewardPerSecond
  );
}

export function handleLogRewardsExpiration(event: LogRewardsExpiration): void {
  // log.info(
  //   "============== handleLogRewardsExpiration =======" +
  //     event.params.rewardsExpiration.toString(),
  //   []
  // );

  createUpdateMiniChef(
    event.address.toHexString(),
    event.params.rewardsExpiration,
    ZERO_BI,
    ZERO_BI
  );
}
