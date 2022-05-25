const { program } = require('commander');
const { exec } = require("child_process");
/*
DEFAULT CONFIGS
 */
function errorColor(str) {
    // Add ANSI escape codes to display text in red.
    return `\x1b[31m${str}\x1b[0m`;
}

function successColor(str) {
    // Add ANSI escape codes to display text in red.
    return `\u001b[32m${str}\u001b[32m`;
}

program
    .configureOutput({
        // Visibly override write routines as example!
        writeOut: (str) => process.stdout.write(`[OUT] ${str}`),
        writeErr: (str) => process.stdout.write(`[ERR] ${str}`),
        // Highlight errors in color.
        outputError: (str, write) => write(errorColor(str))
    });

program
    .requiredOption('-n, --network <char>', 'you must specify user')
    .requiredOption('-s, --subgraph <char>', 'subgraph name')
    .requiredOption('-e, --environment <char>', 'node & ipfs env', "local")
    .requiredOption('-v, --version-label <char>', 'node address', "0.0.1")
    .requiredOption('-u, --user <char>', 'the graph user')
    .option('-t, --access-token <char>', 'graph access token')
    .option('--status <char>', 'status (prod - staging - backup','staging')
    .option('--create');


program.parse();
const options = program.opts();
const network = options.network ;
const subgraph = options.subgraph;
const environment = options.environment;
const versionLabel = options.versionLabel;
const accessToken = options.accessToken;
const user = options.user;
const status = options.status;
//TODO: build subgraphpath by reading json

let vmPath
if (network == "near"){
    vmPath = "nearvm"
} else {
    vmPath = "evm"
}
let subgraphPath = `subgraphs/${vmPath}/${subgraph}`
let nodeAddress
let ipfsAddress

switch (environment) {
    case "local" :
        nodeAddress = "http://localhost:8020/"
        ipfsAddress = "http://localhost:5001"
        break
    case "staging" :
        nodeAddress = "https://api.staging.thegraph.com/deploy/"
        ipfsAddress = "https://api.staging.thegraph.com/ipfs/"
        break
    case "prod" :
        nodeAddress = "https://api.thegraph.com/deploy/"
        ipfsAddress = "https://api.thegraph.com/ipfs/"
        break
    case "pango-staging":
        nodeAddress = "https://staging.customurl.com/deploy/"
        ipfsAddress = ""
        break
    case "pango-prod":
        nodeAddress = "https://customurl.com/deploy/"
        ipfsAddress = ""
        break
}



//TODO: use SDK if subgraph is supported

if(!["avalanche","fuji","near"].includes(network)){
    program.error(`Network '${network}' isn't supported for this subgraph`)
}
if(!["governance","exchange","minichef"].includes(subgraph)){
    program.error(`Subgraph '${network}' isn't a valid subgraph`)
}


if(options.create) {
    exec(`graph create --node ${nodeAddress} ${user}/${network}-${subgraph} --access-token ${accessToken}`, (error, stdout, stderr) => {
        if (error) {
            program.error(error)
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }
        // console.log(`stdout: ${stdout}`);
    });


}



exec(`mustache subgraphs/configs/${network}.json ${subgraphPath}/manifests/template.yaml > ${subgraphPath}/manifests/${network}.yaml`, (error, stdout, stderr) => {
    if (error) {
        program.error(error)
        return;
    }
    if (stderr) {
        console.log(`stderr: ${stderr}`);
        return;
    }
    // console.log(`stdout: ${stdout}`);
});

exec(`graph codegen ${subgraphPath}/manifests/${network}.yaml --output-dir ${subgraphPath}/src/types`, (error, stdout, stderr) => {
    if (error) {
        program.error(error)
        return;
    }
    if (stderr) {
        console.log(`stderr: ${stderr}`);
        return;
    }
    // console.log(`stdout: ${stdout}`);
});

exec(`graph deploy ${user}/${network}-${subgraph}-${status} ${subgraphPath}/manifests/${network}.yaml --debug --ipfs ${ipfsAddress} --node ${nodeAddress} --version-label ${versionLabel} --access-token ${accessToken}`, (error, stdout, stderr) => {
    if (error) {
        program.error(error)
        return;
    }
    if (stderr) {
        console.log(`stderr: ${stderr}`);
        return;
    }
    //console.log(`stdout: ${stdout}`);
});

