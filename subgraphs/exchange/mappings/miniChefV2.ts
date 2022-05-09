/* eslint-disable prefer-const */
import { Address } from '@graphprotocol/graph-ts'
import { Farm } from '../generated/schema'
import {
  convertTokenToDecimal,
  createUser,
  BI_18,
  createLiquidityPosition,
  createLiquiditySnapshot,
  createFarm,
} from './helpers'
import { Deposit, PoolAdded, Withdraw, EmergencyWithdraw } from '../generated/MiniChefV2/MiniChefV2'

export function handlePoolAdded(event: PoolAdded): void {
  createFarm(event.address, event.params.pid, event.params.lpToken)
}

export function handleDeposit(event: Deposit): void {
  // user stats
  createUser(event.params.to)

  if (event.params.user.notEqual(event.params.to)) {
    let farmKey = event.address.toHexString() + '-' + event.params.pid.toHexString()
    let farm = Farm.load(farmKey)

    let convertedAmount = convertTokenToDecimal(event.params.amount, BI_18)

    let fromUserLiquidityPosition = createLiquidityPosition(farm.pairAddress as Address, event.params.user)
    fromUserLiquidityPosition.liquidityTokenBalance = fromUserLiquidityPosition.liquidityTokenBalance.minus(convertedAmount)
    fromUserLiquidityPosition.save()
    createLiquiditySnapshot(fromUserLiquidityPosition, event)

    let toUserLiquidityPosition = createLiquidityPosition(farm.pairAddress as Address, event.params.to)
    toUserLiquidityPosition.liquidityTokenBalance = toUserLiquidityPosition.liquidityTokenBalance.plus(convertedAmount)
    toUserLiquidityPosition.save()
    createLiquiditySnapshot(toUserLiquidityPosition, event)
  }
}

export function handleWithdraw(event: Withdraw): void {
  // user stats
  createUser(event.params.to)

  if (event.params.user.notEqual(event.params.to)) {
    let farmKey = event.address.toHexString() + '-' + event.params.pid.toHexString()
    let farm = Farm.load(farmKey)

    let convertedAmount = convertTokenToDecimal(event.params.amount, BI_18)

    let fromUserLiquidityPosition = createLiquidityPosition(farm.pairAddress as Address, event.params.user)
    fromUserLiquidityPosition.liquidityTokenBalance = fromUserLiquidityPosition.liquidityTokenBalance.minus(convertedAmount)
    fromUserLiquidityPosition.save()
    createLiquiditySnapshot(fromUserLiquidityPosition, event)

    let toUserLiquidityPosition = createLiquidityPosition(farm.pairAddress as Address, event.params.to)
    toUserLiquidityPosition.liquidityTokenBalance = toUserLiquidityPosition.liquidityTokenBalance.plus(convertedAmount)
    toUserLiquidityPosition.save()
    createLiquiditySnapshot(toUserLiquidityPosition, event)
  }
}

export function handleEmergencyWithdraw(event: EmergencyWithdraw): void {
  // user stats
  createUser(event.params.to)

  if (event.params.user.notEqual(event.params.to)) {
    let farmKey = event.address.toHexString() + '-' + event.params.pid.toHexString()
    let farm = Farm.load(farmKey)

    let convertedAmount = convertTokenToDecimal(event.params.amount, BI_18)

    let fromUserLiquidityPosition = createLiquidityPosition(farm.pairAddress as Address, event.params.user)
    fromUserLiquidityPosition.liquidityTokenBalance = fromUserLiquidityPosition.liquidityTokenBalance.minus(convertedAmount)
    fromUserLiquidityPosition.save()
    createLiquiditySnapshot(fromUserLiquidityPosition, event)

    let toUserLiquidityPosition = createLiquidityPosition(farm.pairAddress as Address, event.params.to)
    toUserLiquidityPosition.liquidityTokenBalance = toUserLiquidityPosition.liquidityTokenBalance.plus(convertedAmount)
    toUserLiquidityPosition.save()
    createLiquiditySnapshot(toUserLiquidityPosition, event)
  }
}
