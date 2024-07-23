import "@stdlib/ownable";
import "./messages";

struct JettonWalletData {
    balance: Int;
    owner: Address;
    master: Address;    
    jettonWalletCode: Cell;
}

//================================ Jetton Wallet ================================//
@interface("org.ton.jetton.wallet")
contract JettonWallet {

    const minTonsForStorage: Int = ton("0.019");
    const gasConsumption: Int = ton("0.013");

    balance: Int as coins = 0;
    owner: Address;
    master: Address;    //Jetton master-address

    init(owner: Address, master: Address) {
        self.balance = 0;
        self.owner = owner;
        self.master = master;
    }

    receive(msg: Transfer) {
        let ctx: Context = context();
        require(ctx.sender == self.owner, "Invalid sender");

        //Gas checks, forwardTon = 0.152
        let final: Int = ctx.readForwardFee() * 2 + 
                            2 * self.gasConsumption + 
                                self.minTonsForStorage + 
                                    msg.forwardTonAmount;  
        require(ctx.value > final, "Invalid value");      
                
        self.balance = self.balance - msg.amount;
        require(self.balance >= 0, "Invalid balance");

        let walletInit: StateInit = initOf JettonWallet(msg.destination, self.master);
        let walletAddress: Address = contractAddress(walletInit);
        send(SendParameters{
            to: walletAddress,
            value: 0,
            mode: SendRemainingValue,
            bounce: false,
            body: TransferInternal{
                queryId: msg.queryId,
                amount: msg.amount,
                from: self.owner,   
                responseDestination: msg.responseDestination,
                forwardTonAmount: msg.forwardTonAmount,
                forwardPayload: msg.forwardPayload
            }.toCell(),
            code: walletInit.code,
            data: walletInit.data
        });            
    }

    receive(msg: TransferInternal) {
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
                mode: SendPayGasSeparately + SendIgnoreErrors,
                bounce: false,
                body: TransferNotification{ // Remind the new Owner
                    queryId: msg.queryId,
                    amount: msg.amount,
                    sender: msg.from,
                    forwardPayload: msg.forwardPayload
                }.toCell()
            });
        }

        //Cahback to the original Sender
        if (msg.responseDestination != null && msgValue > 0) {
            send(SendParameters{
                to: msg.responseDestination!!,
                value: msgValue,
                mode: SendIgnoreErrors, 
                bounce: false,
                body: Excesses {
                    queryId: msg.queryId
                }.toCell()
            });
        }
    }

    receive(msg: Burn) {
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
            body: BurnNotification{
                queryId: msg.queryId,
                amount: msg.amount,
                sender: self.owner,
                responseDestination: msg.responseDestination 
            }.toCell()
        });
    }

    //==== Private Methods ====//

    fun msgValue(value: Int): Int {
        let msgValue: Int = value;
        let tonBalanceBeforeMsg: Int = myBalance() - msgValue; 
        let storageFee: Int = self.minTonsForStorage - min(tonBalanceBeforeMsg, self.minTonsForStorage);
        msgValue = msgValue - (storageFee + self.gasConsumption);
        return msgValue;
    }

    //==== Bounced ====//

    bounced(msg: bounced<TransferInternal>) {
        self.balance = self.balance + msg.amount;
    }

    bounced(msg: bounced<BurnNotification>) {
        self.balance = self.balance + msg.amount;
    }

    //==== Get-methods ====//

    get fun get_wallet_data(): JettonWalletData {
        return JettonWalletData{
            balance: self.balance,
            owner: self.owner,
            master: self.master,
            jettonWalletCode: (initOf JettonWallet(self.owner, self.master)).code
        };
    }
}