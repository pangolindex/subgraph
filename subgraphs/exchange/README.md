# Pangolin Subgraph

An open source subgraph index for Pangolin -- a community-driven decentralized exchange for Avalanche assets with fast settlement, low transaction fees, and a democratic distribution -- powered by Avalanche.

This subgraph dynamically tracks any pair created by the Pangolin factory. It tracks the current state of Pangolin contracts, and contains derived stats for things like historical data.

- aggregated data across pairs and tokens,
- data on individual pairs and tokens,
- data on transactions
- data on liquidity providers
- historical data on Pangolin, pairs or tokens, aggregated by day


## Hosted Subgraphs

TheGraph hosted service currently hosts the main Pangolin subgraph and a few others:

[Exchange](https://thegraph.com/hosted-service/subgraph/pangolindex/exchange)

[Exchange Staging](https://thegraph.com/hosted-service/subgraph/pangolindex/exchange-staging)

[Exchange Backup](https://thegraph.com/hosted-service/subgraph/pangolindex/exchange-backup)

***Governance Coming Soon***


## Example Queries

### Querying Aggregated Pangolin Data

This query fetches aggregated data from all Pangolin pairs and tokens, to give a view into how much activity is happening within the whole protocol.

```graphql
{
  pangolinFactories(first: 1) {
    pairCount
    totalVolumeUSD
    totalLiquidityUSD
  }
}
```
