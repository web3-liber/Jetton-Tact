# Jetton-Tact

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

## Others

1. [0089-jetton-wallet-discovery](https://github.com/ton-blockchain/TEPs/blob/master/text/0089-jetton-wallet-discovery.md)

2. So by default, the Cell, Slice and Builder values are stored as a reference.And with as remaining they're stored directly, as a Slice;

```
field: Slice as remaining;
```