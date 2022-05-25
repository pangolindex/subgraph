import { near, log, BigInt, json, JSONValueKind } from "@graphprotocol/graph-ts";
import { Account, Swap, AddLiquidity, Transaction, Pair, Token, LiquidityPosition } from "../generated/schema";

export function fill_pair(
    action: near.ActionValue,
    receipt: near.ActionReceipt,
    blockHeader: near.BlockHeader,
    outcome: near.ExecutionOutcome
  ): Pair {
    const receiptId = receipt.id.toHexString();
    let pair = new Pair(`${receiptId}`); // Initializing Pair entity
    let rawString = outcome.logs[0]
    let splitString = rawString.split(' ')
  
    pair.id = "1" // ATTENTION
    let token0 = fill_token(action, receipt, blockHeader, outcome, splitString[2].toString());
    let token1 = fill_token(action, receipt, blockHeader, outcome, splitString[5].toString());;
    pair.token0 = token0.id
    pair.token1 = token1.id
    pair.save()
    return (pair)
  }
  
  export function fill_token(
    action: near.ActionValue,
    receipt: near.ActionReceipt,
    blockHeader: near.BlockHeader,
    outcome: near.ExecutionOutcome,
    id: string
  ): Token {
    const receiptId = receipt.id.toHexString();
    let rawString = outcome.logs[0]
    let splitString = rawString.split(' ')
    let token = new Token(`${receiptId}`);
    token.id = id
    token.save()
  
    return (token)
  }
  
  export function fill_transaction(
    action: near.ActionValue,
    receipt: near.ActionReceipt,
    blockHeader: near.BlockHeader,
    outcome: near.ExecutionOutcome
  ): Transaction {
    const receiptId = receipt.id.toHexString();
    let transaction = new Transaction(`${receiptId}`);
  
    transaction.id = receipt.signerId;
    transaction.blockNumber = BigInt.fromU64(blockHeader.height)
    transaction.timestamp = BigInt.fromU64(blockHeader.timestampNanosec/1000000000)
    transaction.save()
  
    return (transaction)
  }