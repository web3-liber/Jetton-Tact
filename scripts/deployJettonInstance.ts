import { Address, toNano } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { JettonInstance } from '../wrappers/JettonInstance';
import { buildOnchainMetadata } from '../utils/jetton-helpers';

export async function run(provider: NetworkProvider) {
    
    const jettonParams = {
        name: "Jetton Name",
        description: "A standard Instance for Jettons (TON fungible tokens).",
        symbol: "JN",
        image: "https://avatars.githubusercontent.com/u/104382459?s=200&v=4",
    };

    // Create content Cell
    let jettonContent = buildOnchainMetadata(jettonParams);
    
    let maxSupply = toNano(1000000000);

    const sampleJetton = provider.open(await JettonInstance.fromInit(provider.sender().address as Address, jettonContent, maxSupply));

    await sampleJetton.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'Mint',
            amount: toNano(1000000),
            receiver: provider.sender().address as Address
        }
    );

    await provider.waitForDeploy(sampleJetton.address);
}