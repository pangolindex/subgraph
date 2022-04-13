/* eslint-disable prefer-const */
import { Address } from '@graphprotocol/graph-ts'
import { Farm, Transaction } from '../../generated/schema'
import {
  convertTokenToDecimal,
  createUser,
  BI_18,
  createLiquidityPosition,
  createLiquiditySnapshot,
  createFarm,
} from './helpers'
import { Deposit, PoolAdded, Withdraw } from '../../generated/MiniChefV2/MiniChefV2'

export function handlePoolAdded(event: PoolAdded): void {
  createFarm(event.address, event.params.pid, event.params.lpToken)
}

// address indexed user, uint256 indexed pid, uint256 amount, address indexed to
export function handleDeposit(event: Deposit): void {
  let eventHashAsHexString = event.transaction.hash.toHexString()

  // user stats
  createUser(event.params.user)
  createUser(event.params.to)

  // get or create transaction
  let transaction = Transaction.load(eventHashAsHexString)
  if (transaction === null) {
    transaction = new Transaction(eventHashAsHexString)
    transaction.blockNumber = event.block.number
    transaction.timestamp = event.block.timestamp
    transaction.mints = []
    transaction.burns = []
    transaction.swaps = []
    transaction.save()
  }

  if (event.params.user !== event.params.to) {
    let chef = event.address.toHexString()
    let pid = event.params.pid.toHexString()
    let farmKey = `${chef}-${pid}`
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

// address indexed user, uint256 indexed pid, uint256 amount, address indexed to
export function handleWithdraw(event: Withdraw): void {
  let eventHashAsHexString = event.transaction.hash.toHexString()

  // user stats
  createUser(event.params.user)
  createUser(event.params.to)

  // get or create transaction
  let transaction = Transaction.load(eventHashAsHexString)
  if (transaction === null) {
    transaction = new Transaction(eventHashAsHexString)
    transaction.blockNumber = event.block.number
    transaction.timestamp = event.block.timestamp
    transaction.mints = []
    transaction.burns = []
    transaction.swaps = []
    transaction.save()
  }

  if (event.params.user !== event.params.to) {
    let chef = event.address.toHexString()
    let pid = event.params.pid.toHexString()
    let farmKey = `${chef}-${pid}`
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