import "@stdlib/ownable";
import "./messages";

//================================ Jetton Wallet ================================//
@interface("org.ton.jetton.wallet")
contract JettonWallet {

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

        let walletInit: StateInit = initOf JettonWallet(msg.sender, self.master);
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
            let walletInit: StateInit = initOf JettonWallet(msg.from, self.master); 
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
            code: (initOf JettonWallet(self.owner, self.master)).code
        };
    }
}