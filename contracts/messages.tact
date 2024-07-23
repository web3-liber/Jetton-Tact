message(0xf8a7ea5) Transfer {
    queryId: Int as uint64;
    amount: Int as coins;
    destination: Address;
    responseDestination: Address;
    customPayload: Cell?;
    forwardTonAmount: Int as coins;
    forwardPayload: Slice as remaining;  
}

message(0x178d4519) TransferInternal {
    queryId: Int as uint64;
    amount: Int as coins;
    from: Address;
    responseDestination: Address?;
    forwardTonAmount: Int as coins;
    forwardPayload: Slice as remaining;
}

message(0x7362d09c) TransferNotification {
    queryId: Int as uint64;
    amount: Int as coins;
    sender: Address;
    forwardPayload: Slice as remaining;
}

message(0x595f07bc) Burn {
    queryId: Int as uint64;
    amount: Int as coins;
    responseDestination: Address;
    customPayload: Cell?;
}

message(0x7bdd97de) BurnNotification {
    queryId: Int as uint64;
    amount: Int as coins;
    sender: Address;   
    responseDestination: Address; 
}

message(0xd53276db) Excesses {
    queryId: Int as uint64;
}