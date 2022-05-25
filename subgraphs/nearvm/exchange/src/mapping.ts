import { near, log, BigInt, json, JSONValueKind } from "@graphprotocol/graph-ts";
import { Account, Swap, AddLiquidity, Transaction, Pair, Token, LiquidityPosition } from "../generated/schema";
import { fill_pair, fill_transaction } from "./utils";

export function handleReceipt(receipt: near.ReceiptWithOutcome): void {
  const actions = receipt.receipt.actions;
  
  for (let i = 0; i < actions.length; i++) {
    handleAction(
      actions[i], 
      receipt.receipt, 
      receipt.block.header,
      receipt.outcome
      );
  }
}

function handleAction(
  action: near.ActionValue,
  receipt: near.ActionReceipt,
  blockHeader: near.BlockHeader,
  outcome: near.ExecutionOutcome
): void {
  
  if (action.kind != near.ActionKind.FUNCTION_CALL) {
    log.info("Early return: {}", ["Not a function call"]);
    return;
  }
  
  let accounts = new Account(receipt.signerId);

  const functionCall = action.toFunctionCall();

// SWAP FUNCTION CALL
  if (functionCall.methodName == "swap") {
    const receiptId = receipt.id.toHexString();
    accounts.signerId = receipt.signerId;
    accounts.timestamp = BigInt.fromU64(blockHeader.timestampNanosec/1000000000)

    let logs = new Swap(`${receiptId}`); // Initializing Swap entity

    if(outcome.logs[0]!= null){
      let rawString = outcome.logs[0]
      let splitString = rawString.split(' ')
      // Filling Swap entity
        logs.id = rawString;
        logs.action = splitString[0].toString()
        // Filling Transaction entity
          let transaction = fill_transaction(action, receipt, blockHeader, outcome)
        logs.transaction = transaction.id
        logs.timestamp = BigInt.fromU64(blockHeader.timestampNanosec/1000000000)
        // Filling Pair entity
        let pair = fill_pair(action, receipt, blockHeader, outcome);
        logs.pair = pair.id
        logs.from = receipt.signerId
        logs.to = receipt.receiverId
        logs.amount0In = BigInt.fromString(splitString[1])
        logs.amount1In = BigInt.fromString("0")
        logs.amount0Out = BigInt.fromString("0")
        logs.amount1Out = BigInt.fromString(splitString[4])
      logs.save()
    }

  } else {
    log.info("Not processed - FunctionCall is: {}", [functionCall.methodName]);
  }

// ADD_LIQUIDITY FUNCTION CALL
  if (functionCall.methodName == "add_liquidity") {
  const receiptId = receipt.id.toHexString();
    accounts.signerId = receipt.signerId;

    let liquidity = new AddLiquidity(`${receiptId}`);
    if(outcome.logs[0]!= null){
      liquidity.id = receipt.signerId;
      liquidity.output = outcome.logs[0]
      liquidity.timestamp = BigInt.fromU64(blockHeader.timestampNanosec/1000000000)
      let rawString = outcome.logs[0]
      let splitString = rawString.split(' ')
      liquidity.functionCalled = functionCall.methodName
      liquidity.functionAction = (splitString[0] + ' ' + splitString[1])
      liquidity.firstPoolAmount = BigInt.fromString(splitString[2].split('"')[1])
      liquidity.firstPool = splitString[3].slice(0, -2)
      liquidity.secondPoolAmount = BigInt.fromString(splitString[4].split('"')[1])
      liquidity.secondPool = splitString[5].slice(0, -3)
      liquidity.sharesMinted = BigInt.fromString(splitString[7])

      liquidity.save()
    }
  } else {
    log.info("Not processed - FunctionCall is: {}", [functionCall.methodName]);
  }

  accounts.save();
}
