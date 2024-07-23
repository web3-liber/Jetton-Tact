import "@stdlib/ownable";
import "./messages";

struct JettonData {
    totalSupply: Int;
    mintable: Bool;
    owner: Address;
    jettonContent: Cell;
    jettonWalletCode: Cell;
}

//================================ Trait Jetton ================================//
@interface("org.ton.jetton.master")
trait Jetton with Ownable {

    totalSupply: Int;
    mintable: Bool;
    owner: Address;
    jettonContent: Cell;

    receive(msg: BurnNotification) {
        self.requireSenderAsWalletOwner(msg.sender);
        self.totalSupply = self.totalSupply - msg.amount;
        if (msg.responseDestination != null) { //CashBack
            send(SendParameters{
                to: msg.responseDestination,  
                value: 0,
                bounce: false,
                mode: SendRemainingValue + SendIgnoreErrors,
                body: Excesses{
                    queryId: msg.queryId
                }.toCell()
            });
        }
    }

    //==== Private-methods ====//

    // @to The Address receive the Jetton token after minting
    // @amount The amount of Jetton token being minted
    // @responseDestination The previous owner address
    fun mint(to: Address, amount: Int, responseDestination: Address) {
        require(self.mintable, "Can't Mint Anymore");
        self.totalSupply = self.totalSupply + amount;

        let walletInit: StateInit = self.getJettonWalletInit(to);
        send(SendParameters{
            to: contractAddress(walletInit),
            value: 0,
            bounce: true, 
            mode: SendRemainingValue,
            body: TransferInternal{
                queryId: 0, 
                amount: amount,
                from: myAddress(),
                responseDestination: responseDestination,
                forwardTonAmount: 0,
                forwardPayload: emptySlice()
            }.toCell(),
            code: walletInit.code,
            data: walletInit.data
        });
    }

    fun requireSenderAsWalletOwner(owner: Address) {
        let walletInit: StateInit = self.getJettonWalletInit(owner);
        require(contractAddress(walletInit) == sender(), "Invalid sender");
    }

    virtual fun getJettonWalletInit(owner: Address): StateInit {
        return initOf JettonWallet(owner, myAddress());
    }

    //==== Get-methods ====//

    get fun get_jetton_data(): JettonData {
        return JettonData{
            totalSupply: self.totalSupply,
            mintable: self.mintable,
            owner: self.owner,
            jettonContent: self.jettonContent,
            jettonWalletCode: self.getJettonWalletInit(myAddress()).code
        };
    }

    get fun get_wallet_address(ownerAddress: Address): Address {
        let walletInit: StateInit = self.getJettonWalletInit(ownerAddress);
        let jettonWalletAddress: Address = contractAddress(walletInit);
        return jettonWalletAddress;
    }
}