import { Blockchain, SandboxContract, TreasuryContract } from "@ton/sandbox";
import { Address, beginCell, toNano } from "@ton/core";
import { buildOnchainMetadata } from "../utils/jetton-helpers";
import "@ton/test-utils";

//==== Contract SDK ====//
import { JettonInstance, Mint, Transfer } from "../wrappers/JettonInstance";
import { JettonWallet, Burn } from "../wrappers/JettonWallet";

const jettonParams = {
    name: "Test Jetton",
    description: "This is description of Test Jetton",
    symbol: "TJ",
    image: "https://avatars.githubusercontent.com/u/104382459?s=200&v=4",
};
let jettonContent = buildOnchainMetadata(jettonParams);
let maxSupply = toNano(100000000000);

describe("JettonInstance", () => {

    let blockchain: Blockchain;
    let jettonInstance: SandboxContract<JettonInstance>;
    let deployerWallet: SandboxContract<JettonWallet>;
    let deployer: SandboxContract<TreasuryContract>; 

    beforeAll(async () => {

        //Create content Cell
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury("deployer");
        jettonInstance = blockchain.openContract(await JettonInstance.fromInit(deployer.address, jettonContent, maxSupply));
        
        //Send Transaction
        const deployResult = await jettonInstance.send(deployer.getSender(), { value: toNano("10") }, "Mint: 100");
        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: jettonInstance.address,
            deploy: true,
            success: true,
        });

        const deployerWalletAddress = await jettonInstance.getGetWalletAddress(deployer.address);
        deployerWallet = blockchain.openContract(await JettonWallet.fromAddress(deployerWalletAddress));
    });

    it("Whether contract deployed successfully", async () => {
        //the check is done inside beforeEach, blockchain and jettonInstance are ready to use
        console.log((await jettonInstance.getGetJettonData()).totalSupply);
        console.log((await jettonInstance.getGetJettonData()).mintable);
        console.log((await jettonInstance.getGetJettonData()).owner);
        console.log((await jettonInstance.getGetJettonData()).jettonContent)
    });

    it("Convert Address Format", async () => {
        console.log("Jetton Master Contract: " + jettonInstance.address);
        console.log("Is Friendly Address: " + Address.isFriendly(jettonInstance.address.toString()));

        const testAddr = Address.parse(jettonInstance.address.toString());
        console.log("@ Address: ", + testAddr.toString( { bounceable: false }));
        console.log("@ Address: ", testAddr.toString());
        console.log("@ Address(urlSafe: true): " + testAddr.toString( { urlSafe: true }));
        console.log("@ Address(urlSage: false): " + testAddr.toString( { urlSafe: false }));
        console.log("@ Address: ", testAddr.toRawString());
    });

    it("Should mint successfully", async () => {
        const totalSupplyBefore = (await jettonInstance.getGetJettonData()).totalSupply;
        const mintAmount = toNano(100);
        const mintMessage: Mint = {
            $$type: "Mint", 
            amount: mintAmount,
            receiver: deployer.address,
        };
        const mintResult =await  jettonInstance.send(deployer.getSender(),{ value: toNano("10") }, mintMessage);
        expect(mintResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: jettonInstance.address,
            success: true,
        });

        const totalSupplyAfter = (await jettonInstance.getGetJettonData()).totalSupply;
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
        await jettonInstance.send(deployer.getSender(), { value: toNano("0.25") }, mintMessage);

        const senderWalletAddress = await jettonInstance.getGetWalletAddress(sender.address);
        const senderWallet = blockchain.openContract(JettonWallet.fromAddress(senderWalletAddress));

        //Transfer tokens from sender's wallet to receiver's wallet
        const transferMessage: Transfer = {
            $$type: "Transfer",
            queryId: 0n,
            amount: transferAmount,
            destination: receiver.address,  //receiver.address ??
            responseDestination: sender.address,
            customPayload: null,
            forwardTonAmount: toNano("0.1"),
            forwardPayload: beginCell().storeUint(0, 1).storeUint(0, 32).endCell(),
        };
        const transferResult = await senderWallet.send(sender.getSender(), { value: toNano("0.5") }, transferMessage);
        expect(transferResult.transactions).toHaveTransaction({
            from: sender.address,
            to: senderWallet.address,  //why
            success: true,
        });

        const receiverWalletAddress = await jettonInstance.getGetWalletAddress(receiver.address);
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
        await jettonInstance.send(deployer.getSender(), { value: toNano(1) }, mintMessage);

        let deployerBalanceBefore = (await deployerWallet.getGetWalletData()).balance;
        expect(deployerBalanceBefore).toEqual(deployerBalanceInit + mintAmount);

        let burnAmount = toNano(10);
        const burnMessage: Burn = {
            $$type: "Burn",
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
        await jettonInstance.send(deployer.getSender(), { value: toNano(1) }, mintMessage);

        let totalSupplyBefore = (await jettonInstance.getGetJettonData()).totalSupply;
        const mintResult = await jettonInstance.send(player.getSender(), { value: toNano(1) }, mintMessage);
        expect(mintResult.transactions).toHaveTransaction({
            from: player.address,
            to: jettonInstance.address,
        });

        let totalSupplyAfter = (await jettonInstance.getGetJettonData()).totalSupply;
        expect(totalSupplyAfter).toEqual(totalSupplyBefore);
    });
})