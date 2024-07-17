# Jetton-Tact

Jetton implemented using Tact. Jetton is Ton's standard for FT.

## Project structure

-   `contracts` - source code of all the smart contracts of the project and their dependencies.
-   `wrappers` - wrapper classes (implementing `Contract` from ton-core) for the contracts, including any [de]serialization primitives and compilation functions.
-   `tests` - tests for the contracts.
-   `scripts` - scripts used by the project, mainly the deployment scripts.

## How to use

### Build

`npx blueprint build` or `yarn blueprint build`

### Test

`npx blueprint test` or `yarn blueprint test`

### Deploy or run another script

`npx blueprint run` or `yarn blueprint run`

### Add a new contract

`npx blueprint create ContractName` or `yarn blueprint create ContractName`

## commond

### Contract

1. Only the contract needs to be created using `npx blueprint create ContractName`, other things such as traits and messages do not need to be created using the command;

### Install 

```bash
# set registry 
npm config set registry https://registry.npmmirror.com

# install
npm install @aws-crypto/sha256-js
npm install @types/qs
npm install base64url
npm install open
npm install enquirer
npm install ton-core 

npm install @dedust/sdk
npm install tonweb
npm install @ston-fi/sdk@0.4.0  
```

## Others

1. [0089-jetton-wallet-discovery](https://github.com/ton-blockchain/TEPs/blob/master/text/0089-jetton-wallet-discovery.md)

2. So by default, the Cell, Slice and Builder values are stored as a reference.And with as remaining they're stored directly, as a Slice;

```
field: Slice as remaining;
```