/* eslint-disable prefer-const */
import {
  ProposalCreated,
  ProposalCanceled,
  ProposalExecuted,
  VoteCast,
  ProposalQueued,
} from "./types/Governance/Governance";
import { Bytes, log } from "@graphprotocol/graph-ts";
import { Proposal } from "./types/schema";

export function handleNewProposal(event: ProposalCreated): void {
  log.info("PROPPOSAL CREATED" + event.params.id.toString(), []);

  let proposal = new Proposal(event.params.id.toString());
  proposal.description = event.params.description;
  proposal.proposer = event.params.proposer;

  // @ts-ignore
  proposal.targets = changetype<Array<Bytes>>(event.params.targets);

  proposal.startTime = event.params.startTime;
  proposal.endTime = event.params.endTime;
  proposal.signatures = event.params.signatures;
  proposal.calldatas = event.params.calldatas;

  proposal.save();
}

export function handleUpdatedProposalCanceled(event: ProposalCanceled): void {
  log.info("PROPPOSAL Canceled" + event.params.id.toString(), []);

  let id = event.params.id.toString();
  let proposal = Proposal.load(id);
  if (proposal !== null) {
    proposal.canceled = true;
    proposal.save();
  }
}

export function handleUpdatedProposalExecuted(event: ProposalExecuted): void {
  log.info("PROPPOSAL Executed" + event.params.id.toString(), []);

  let id = event.params.id.toString();
  let proposal = Proposal.load(id);
  if (proposal !== null) {
    proposal.executed = true;
    proposal.save();
  }
}

export function handleVoteCast(event: VoteCast): void {
  log.info("PROPPOSAL VoteCast" + event.params.proposalId.toString(), []);

  let id = event.params.proposalId.toString();
  let proposal = Proposal.load(id);
  if (proposal !== null) {
    if (event.params.support) {
      proposal.forVotes = proposal.forVotes.plus(event.params.votes);
    } else {
      proposal.againstVotes = proposal.againstVotes.plus(event.params.votes);
    }

    proposal.save();
  }
}

export function handleProposalQueued(event: ProposalQueued): void {
  log.info("PROPPOSAL VoteCast" + event.params.id.toString(), []);

  let id = event.params.id.toString();
  let proposal = Proposal.load(id);
  if (proposal !== null) {
    if (event.params.eta) {
      proposal.eta = event.params.eta;
    }

    proposal.save();
  }
}
