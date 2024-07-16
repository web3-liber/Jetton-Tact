import {
    Blockchain, 
    SandboxContract, 
    TreasuryContract,
    printTransactionFees,
    prettyLogTransactions,
    RemoteBlockchainStorage,
    wrapTonClient4ForRemote,
    } from "@ton/sandbox";
import { Address, beginCell, fromNano, StateInit, toNano } from "@ton/core";
import { TonClient4 } from "@ton/ton";
import "@ton/test-utils";
import { buildOnchainMetadata } from "../utils/jetton-helpers";
import { printSeparator } from "../utils/print";

//==== Contract SDK ====//
import { SampleJetton, Mint, TokenTransfer } from "../wrappers/SampleJetton";
import { JettonWallet, TokenBurn } from "../wrappers/JettonWallet";

//==== DeDust.io SDK ====//
import {
    Asset,
    Factory,
    MAINNET_FACTORY_ADDR,
    PoolType,
    Vault,
    LiquidityDeposit,
    VaultJetton,
    JettonRoot,
    ReadinessStatus,
} from "@dedust/sdk";

//==== STON.fi SDK ====//
import TonWeb from "tonweb";
import { Router, ROUTER_REVISION, ROUTER_REVISION_ADDRESS } from "@ston-fi/sdk";

const sampleJettonParams = {
    name: "Liber Token",
    description: "This is description of Test tact sampleJetton",
    symbol: "LT",
    image: "https://play-lh.googleusercontent.com/ahJtMe0vfOlAu1XJVQ6rcaGrQBgtrEZQefHy7SXB7jpijKhu1Kkox90XDuH8RmcBOXNn",
};
let content = buildOnchainMetadata(sampleJettonParams);
let maxSupply = toNano(100000000000);

describe("SampleJetton", () => {

    let blockchain: Blockchain;
    let sampleJetton: SandboxContract<SampleJetton>;
    let deployerWallet: SandboxContract<JettonWallet>;
    let deployer: SandboxContract<TreasuryContract>; 

    beforeAll(async () => {

        //Create content Cell
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury("deployer");
        sampleJetton = blockchain.openContract(await SampleJetton.fromInit(deployer.address, content, maxSupply));
        
        //Send Transaction
        const deployResult = await sampleJetton.send(deployer.getSender(), { value: toNano("10") }, "Mint: 100");
        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: sampleJetton.address,
            deploy: true,
            success: true,
        });

        const deployerWalletAddress = await sampleJetton.getGetWalletAddress(deployer.address);
        deployerWallet = blockchain.openContract(await JettonWallet.fromAddress(deployerWalletAddress));
    });

    it("Whether contract deployed successfully", async () => {
        //the check is done inside beforeEach, blockchain and sampleJetton are ready to use
        console.log((await sampleJetton.getGetJettonData()).totalSupply);
        console.log((await sampleJetton.getGetJettonData()).mintable);
        console.log((await sampleJetton.getGetJettonData()).owner);
        console.log((await sampleJetton.getGetJettonData()).content)
    });

    it("Convert Address Format", async () => {
        console.log("Jetton Master Contract: " + sampleJetton.address);
        console.log("Is Friendly Address: " + Address.isFriendly(sampleJetton.address.toString()));

        const testAddr = Address.parse(sampleJetton.address.toString());
        console.log("@ Address: ", + testAddr.toString( { bounceable: false }));
        console.log("@ Address: ", testAddr.toString());
        console.log("@ Address(urlSafe: true): " + testAddr.toString( { urlSafe: true }));
        console.log("@ Address(urlSage: false): " + testAddr.toString( { urlSafe: false }));
        console.log("@ Address: ", testAddr.toRawString());
    });

    it("Should mint successfully", async () => {
        const totalSupplyBefore = (await sampleJetton.getGetJettonData()).totalSupply;
        const mintAmount = toNano(100);
        const mintMessage: Mint = {
            $$type: "Mint", 
            amount: mintAmount,
            receiver: deployer.address,
        };
        const mintResult =await  sampleJetton.send(deployer.getSender(),{ value: toNano("10") }, mintMessage);
        expect(mintResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: sampleJetton.address,
            success: true,
        });

        const totalSupplyAfter = (await sampleJetton.getGetJettonData()).totalSupply;
        expect(totalSupplyBefore + mintAmount).toEqual(totalSupplyAfter);

        const walletData = await deployerWallet.getGetWalletData();
        expect(walletData.owner).toEqualAddress(deployer.address);
        expect(walletData.balance).toBeGreaterThanOrEqual(mintAmount);
    });

    it("Should transfer successfully", async () => {
        const sender = await blockchain.treasury("sender");
        const receiver = await blockchain.treasury("receiver");    
        const mintAmount = toNano(100);
        const transferAmount = toNano(50);

        const mintMessage: Mint = {
            $$type: "Mint",
            amount: mintAmount,
            receiver: sender.address,
        };
        await sampleJetton.send(deployer.getSender(), { value: toNano("0.25") }, mintMessage);

        const senderWalletAddress = await sampleJetton.getGetWalletAddress(sender.address);
        const senderWallet = blockchain.openContract(JettonWallet.fromAddress(senderWalletAddress));

        //Transfer tokens from sender's wallet to receiver's wallet
        const tokenTransferMessage: TokenTransfer = {
            $$type: "TokenTransfer",
            queryId: 0n,
            amount: transferAmount,
            sender: receiver.address,  //receiver.address ??
            responseDestination: sender.address,
            customPayload: null,
            forwardTonAmount: toNano("0.1"),
            forwardPayload: beginCell().storeUint(0, 1).storeUint(0, 32).endCell(),
        };
        const tokenTransferResult = await senderWallet.send(sender.getSender(), { value: toNano("0.5") }, tokenTransferMessage);
        expect(tokenTransferResult.transactions).toHaveTransaction({
            from: sender.address,
            to: senderWallet.address,  
            success: true,
        });

        const receiverWalletAddress = await sampleJetton.getGetWalletAddress(receiver.address);
        const receiverWallet = blockchain.openContract(JettonWallet.fromAddress(receiverWalletAddress));

        const senderBalanceAter = (await senderWallet.getGetWalletData()).balance;
        const receiverBalanceAfter = await (await receiverWallet.getGetWalletData()).balance;
        //console
        //console.log("senderBalanceAter: ", senderBalanceAter);
        //console.log("receiverBalanceAfter: ",receiverBalanceAfter);
        //console.log("mintAmount: ", mintAmount);
        //console.log("transferAmount: ",transferAmount);
        //console

        expect(senderBalanceAter).toEqual(mintAmount - transferAmount); //gas fee??
        expect(receiverBalanceAfter).toEqual(transferAmount);
    });

    it("Should burn successfully", async () => {
        let deployerBalanceInit = (await deployerWallet.getGetWalletData()).balance;
        const mintAmount = toNano(100);
        const mintMessage: Mint = {
            $$type: "Mint",
            amount: mintAmount,
            receiver: deployer.address,
        };
        await sampleJetton.send(deployer.getSender(), { value: toNano(1) }, mintMessage);

        let deployerBalanceBefore = (await deployerWallet.getGetWalletData()).balance;
        expect(deployerBalanceBefore).toEqual(deployerBalanceInit + mintAmount);

        let burnAmount = toNano(10);
        const burnMessage: TokenBurn = {
            $$type: "TokenBurn",
            queryId: 0n,
            amount: burnAmount,
            responseDestination: deployer.address,
            customPayload: beginCell().endCell(),
        };

        await deployerWallet.send(deployer.getSender(), { value: toNano("10") }, burnMessage);
        let deloyerBalanceAfter = (await deployerWallet.getGetWalletData()).balance;
        expect(deloyerBalanceAfter).toEqual(deployerBalanceBefore - burnAmount);
    });

    it("Should mint failingly", async () => {
        const player = await blockchain.treasury("player");
        const mintAmount = toNano(100);
        const mintMessage: Mint = {
            $$type: "Mint",
            amount: mintAmount,
            receiver: player.address,
        };
        await sampleJetton.send(deployer.getSender(), { value: toNano(1) }, mintMessage);

        let totalSupplyBefore = (await sampleJetton.getGetJettonData()).totalSupply;
        const mintResult = await sampleJetton.send(player.getSender(), { value: toNano(1) }, mintMessage);
        expect(mintResult.transactions).toHaveTransaction({
            from: player.address,
            to: sampleJetton.address,
        });

        let totalSupplyAfter = (await sampleJetton.getGetJettonData()).totalSupply;
        expect(totalSupplyAfter).toEqual(totalSupplyBefore);
    });
})