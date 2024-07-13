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
        let walletInit: StateInit = initOf JettonDefaultWallet(msg.ownerAddress, myAddress());
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
        return initOf JettonDefaultWallet(owner, myAddress());
    }

    //==== Getter Methods ====//

    get fun getJettonData(): JettonData {
        return JettonData{
            totalSupply: self.totalSupply,
            mintable: self.mintable,
            owner: self.owner,
            content: self.content,
            walletCode: initOf JettonDefaultWallet(self.owner, myAddress()).code  //Why isn't it written this way ? (initOf JettonDefaultWallet(self.owner, myAddress())).code
        };
    }

    get fun getWalletAddress(owner: Address): Address {
        return contractAddress(initOf JettonDefaultWallet(owner, myAddress()));
    }
}

//================================ Jetton Wallet ================================//
@interface("org.ton.jetton.wallet")
contract JettonDefaultWallet {

    const minTonsForStorage: Int = ton("0.019");
    const gasConsumption: Int = ton("0.013");

    balance: Int as coins = 0;
    owner: Address;
    master: Address;

    init(owner: Address, master: Address) {
        self.balance = 0;
        self.owner = owner;
        self.master = master;
    }

    receive(msg: TokenTransfer) {
        let ctx: Context = context();
        require(ctx.sender == self.owner, "Invalid sender");

        let final: Int = ctx.readForwardFee() * 2 + 
                            2 * self.gasConsumption + 
                                self.minTonsForStorage + 
                                    msg.forwardTonAmount;  //Gas checks, forwardTon = 0.152
        require(ctx.value > final, "Invalid value");      

        self.balance = self.balance - msg.amount;
        require(self.balance >= 0, "Invalid balance");

        let walletInit: StateInit = initOf JettonDefaultWallet(msg.sender, self.master);
        let walletAddress: Address = contractAddress(walletInit);
        send(SendParameters{
            to: walletAddress,
            value: 0,
            mode: SendRemainingValue,
            bounce: false,
            body: TokenTransferInternal{
                queryId: msg.queryId,
                amount: msg.amount,
                from: self.owner,   //Why owner and not myAddress() ?
                responseDestination: msg.responseDestination,
                forwardTonAmount: msg.forwardTonAmount,
                forwardPayload: msg.forwardPayload
            }.toCell(),
            code: walletInit.code,
            data: walletInit.data
        });            
    }

    receive(msg: TokenTransferInternal) {
        let ctx: Context = context();
        if (ctx.sender != self.master) {
            let walletInit: StateInit = initOf JettonDefaultWallet(msg.from, self.master); 
            require(contractAddress(walletInit) == ctx.sender, "Invalid sender");
        }

        self.balance = self.balance + msg.amount;
        require(self.balance >= 0, "Invalid balance");

        //Get value for gas
        let msgValue: Int = self.msgValue(ctx.value);  
        let forwardFee: Int = ctx.readForwardFee();
        if(msg.forwardTonAmount > 0) {
            msgValue = msgValue - msg.forwardTonAmount - forwardFee;
            send(SendParameters{
                to: self.owner,
                value: msg.forwardTonAmount,
                mode: SendPayGasSeparately, // Why
                bounce: false,
                body: TokenNotification{ // Remind the new Owner
                    queryId: msg.queryId,
                    amount: msg.amount,
                    from: msg.from,
                    forwardPayload: msg.forwardPayload
                }.toCell()
            });
        }

        //Cahback to the original Sender
        if (msg.responseDestination != null && msgValue > 0) {
            send(SendParameters{
                to: msg.responseDestination!!,
                value: msgValue,
                mode: SendPayGasSeparately,
                bounce: false,
                body: TokenExcesses {
                    queryId: msg.queryId
                }.toCell()
            });
        }
    }

    receive(msg: TokenBurn) {
        let ctx: Context = context();
        require(ctx.sender == self.owner, "Invalid sender");

        self.balance = self.balance -msg.amount;
        require(self.balance >= 0, "Invalid balance");

        let forwardFee: Int = ctx.readForwardFee();
        require(ctx.value > forwardFee + 2 * self.gasConsumption + self.minTonsForStorage, "Invalid value - Burn");  // Why

        send(SendParameters{
            to: self.master,
            value: 0,
            mode: SendRemainingValue,
            bounce: true,
            body: TokenBurnNotification{
                queryId: msg.queryId,
                amount: msg.amount,
                sender: self.owner,
                responseDestination: msg.responseDestination!!
            }.toCell()
        });
    }

    //==== Private Methods ====//

    fun msgValue(value: Int): Int {
        let msgValue: Int = value;
        let tonBalanceBeforeMsg: Int = myBalance() - msgValue;  // Why
        let storageFee: Int = self.minTonsForStorage - min(tonBalanceBeforeMsg, self.minTonsForStorage);
        msgValue = msgValue - (storageFee + self.gasConsumption);
        return msgValue;
    }

    //==== Bounced ====//

    bounced(msg: bounced<TokenTransferInternal>) {
        self.balance = self.balance + msg.amount;
    }

    bounced(msg: bounced<TokenBurnNotification>) {
        self.balance = self.balance + msg.amount;
    }

    //==== Getter Methods ====//

    get fun getWalletData(): JettonWalletData {
        return JettonWalletData{
            balance: self.balance,
            owner: self.owner,
            master: self.master,
            code: (initOf JettonDefaultWallet(self.owner, self.master)).code
        };
    }
}