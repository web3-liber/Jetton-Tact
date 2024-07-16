import "@stdlib/ownable";
import "./messages";

//================================ Trait Jetton ================================//
@interface("org.ton.jetton.master")
trait Jetton with Ownable {

    totalSupply: Int;
    mintable: Bool;
    owner: Address;
    content: Cell;

    receive(msg: TokenUpdateContent) {
        self.requireOwner();
        self.content = msg.content;
    }

    receive(msg: TokenBurnNotification) {
        self.requireSenderAsWalletOwner(msg.responseDestination!!);
        self.totalSupply = self.totalSupply - msg.amount;
        if (msg.responseDestination != null) { //CashBack
            send(SendParameters{
                to: msg.responseDestination!!,  
                value: 0,
                bounce: false,
                mode: SendRemainingValue,
                body: TokenExcesses{
                    queryId: msg.queryId
                }.toCell()
            });
        }
    }

    receive(msg: ProvideWalletAddress) {
        let ctx: Context = context();
        require(ctx.value >= ton("0.0061"), "Insufficient gas"); 
        let walletInit: StateInit = initOf JettonWallet(msg.ownerAddress, myAddress());
        //let walletInit: StateInit = getJettonWalletInit(msg.ownerAddress);
        if (msg.includeAddress) {
            send(SendParameters{
                to: sender(),
                value: 0,
                mode: SendRemainingValue,
                body: TakeWalletAddress{
                    queryId: msg.queryId,
                    walletAddress: contractAddress(walletInit),
                    ownerAddress: beginCell().storeBool(true).storeAddress(msg.ownerAddress).endCell().asSlice() //Why 
                }.toCell()
            });
        } else {
            send(SendParameters{
                to: sender(),
                value: 0,
                mode: SendRemainingValue,
                body: TakeWalletAddress{
                    queryId: msg.queryId,
                    walletAddress: contractAddress(walletInit),
                    ownerAddress: beginCell().storeBool(false).endCell().asSlice()
                }.toCell()
            });
        }
    }

    //==== Private Methods ====//

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
            body: TokenTransferInternal{
                queryId: 0, //Why zero ?
                amount: amount,
                from: myAddress(),
                responseDestination: responseDestination,
                forwardTonAmount: 0,
                forwardPayload: beginCell().endCell().asSlice()
            }.toCell(),
            code: walletInit.code,
            data: walletInit.data
        });
    }

    fun requireSenderAsWalletOwner(owner: Address) {
        let ctx: Context = context();  //Is it possible to use sender() directly without using ctx.sender ?
        let walletInit: StateInit = self.getJettonWalletInit(owner);
        require(contractAddress(walletInit) == ctx.sender, "Invalid sender");
    }

    virtual fun getJettonWalletInit(owner: Address): StateInit {
        return initOf JettonWallet(owner, myAddress());
    }

    //==== Getter Methods ====//

    get fun getJettonData(): JettonData {
        return JettonData{
            totalSupply: self.totalSupply,
            mintable: self.mintable,
            owner: self.owner,
            content: self.content,
            walletCode: initOf JettonWallet(self.owner, myAddress()).code  //Why isn't it written this way ? (initOf JettonWallet(self.owner, myAddress())).code
        };
    }

    get fun getWalletAddress(owner: Address): Address {
        return contractAddress(initOf JettonWallet(owner, myAddress()));
    }
}