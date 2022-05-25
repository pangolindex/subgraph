# Local server set up

- need docker compose installed on your machine

### Single chain
Run single blockchain server using 

`SINGLE_NETWORK=avalanche SINGLE_RPC_ENDPOINT=https://api.avax.network/ext/bc/C/rpc docker compose -f server/single.docker-compose.yaml up`

supported networks: "avalanche" , "near"

### Run multichain server [WIP]

`docker compose up -f server/multichain.docker-compose.yaml` 

# Local deployment

### Local
after creating the server, to deploy a subgraph in pangolindex collection run:

`yarn deployLocal --network avalanche --subgraph governance`


### Hosted Service 

`yarn deploySubgraph --network avalanche --subgraph governance -e prod -v $(git rev-parse --verify HEAD --short) --user my-user --access-token $GRAPH_AUTH_TOKEN`c

