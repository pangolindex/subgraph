# Pangolin Subgraph

An open source subgraph index for Pangolin -- a community-driven decentralized exchange for Avalanche and Ethereum assets with fast settlement, low transaction fees, and a democratic distribution -- powered by Avalanche.

This subgraph dynamically tracks any pair created by the Pangolin factory. It tracks the current state of Pangolin contracts, and contains derived stats for things like historical data.

- aggregated data across pairs and tokens,
- data on individual pairs and tokens,
- data on transactions
- data on liquidity providers
- historical data on Pangolin, pairs or tokens, aggregated by day

## Running Locally
### Prerequisites
* [Docker](https://www.docker.com/)
* [Docker compose](https://www.docker.com/) installed locally.

Run the following:
```bash
docker pull avaplatform/avalanchego
docker run -ti -p 9650:9650 -p 9651:9651 avaplatform/avalanchego /avalanchego/build/avalanchego --network-id=fuji --http-host=localhost
docker-compose up
```

The `docker-compose.yaml` file is currently setup to connect to a locally running `Avalanche` blockchain.

Now run
```bash
yarn
yarn run-local
```

Now open another terminal and run the following commands
```bash
yarn codegen
yarn create-local
yarn deploy-local
```
You can now navigate to http://127.0.0.1:8000/subgraphs/name/dasconnor/pangolindex/graphql to interact with the GraphQL endpoint.

Make sure to update package.json settings to point to your own graph account.

## Queries

Below are a few ways to show how to query the Pangolin subgraph for data. The queries show most of the information that is queryable, but there are many other filtering options that can be used, just check out the [querying api](https://thegraph.com/docs/graphql-api). 

## Key Entity Overviews

#### PangolinFactory

Contains data across all of Pangolin. This entity tracks important things like total liquidity, all time volume, transaction count, number of pairs and more.

#### Token

Contains data on a specific token. This token specific data is aggregated across all pairs, and is updated whenever there is a transaction involving that token.

#### Pair

Contains data on a specific pair.

#### Transaction

Every transaction on Pangolin is stored. Each transaction contains an array of mints, burns, and swaps that occured within it.

#### Mint, Burn, Swap

These contain specifc information about a transaction. Things like which pair triggered the transaction, amounts, sender, recipient, and more. Each is linked to a parent Transaction entity.

## Example Queries

### Querying Aggregated Pangolin Data

This query fetches aggredated data from all Pangolin pairs and tokens, to give a view into how much activity is happening within the whole protocol.

```graphql
{
  pangolinFactories(first: 1) {
    pairCount
    totalVolumeUSD
    totalLiquidityUSD
  }
}
```
