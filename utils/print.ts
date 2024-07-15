import { Address, beginCell, Cell, contractAddress, storeStateInit } from "@ton/ton"; //// 从 "@ton/ton" 包中导入必要的模块和类型
import qs from "qs"; // 导入用于查询字符串处理的模块
import base64url from "base64url"; // 导入用于 Base64 编码和解码的模块

/**
 * 打印分隔符到控制台
 */
export function printSeparator() {
    console.log("========================================================================================");
}

/**
 * 打印合约的标题信息
 * @param name 合约名称
 */
export function printHeader(name: string) {
    printSeparator(); // 打印分隔符
    console.log("Contract: " + name); // 打印合约名称
    printSeparator(); // 打印分隔符
}

/**
 * 打印合约地址和浏览器链接
 * @param address 合约地址
 * @param testnet 是否使用测试网 (默认为 true)
 */
export function printAddress(address: Address, testnet: boolean = true) {
    // 打印合约地址，考虑是否是测试网
    console.log("Address: " + address.toString({ testOnly: testnet }));

    // 打印浏览器链接，考虑是否是测试网
    console.log(
        "Explorer: " +
            "https://" +
            (testnet ? "testnet." : "") +
            "tonapi.io/account/" +
            address.toString({ testOnly: testnet })
    );

    printSeparator(); // 打印分隔符
}

/**
 * 打印部署合约的链接信息
 * @param init 初始化参数，包括合约的代码和数据
 * @param value 部署合约时发送的金额（单位为 nanotons）
 * @param command 部署合约时的命令，可以是 Cell 类型或字符串
 * @param testnet 是否使用测试网 (默认为 true)
 */
export function printDeploy(
    init: { code: Cell; data: Cell },
    value: bigint,
    command: Cell | string,
    testnet: boolean = true
) {
    // 解析目标合约地址
    let to = contractAddress(0, init);

    // 解析初始化参数并转换为 Base64 URL 编码的字符串
    let initStr = base64url(beginCell().store(storeStateInit(init)).endCell().toBoc({ idx: false }));

    let link: string;
    if (typeof command === "string") {
        // 如果命令是字符串，生成带有命令文本的部署链接
        link =
            `https://${testnet ? "test." : ""}tonhub.com/transfer/` +
            to.toString({ testOnly: testnet }) +
            "?" +
            qs.stringify({
                text: command, // 部署命令的文本
                amount: value.toString(10), // 部署金额
                init: initStr, // 初始化参数
            });
    } else {
        // 如果命令是 Cell 类型，生成带有命令二进制数据的部署链接
        link =
            `https://${testnet ? "test." : ""}tonhub.com/transfer/` +
            to.toString({ testOnly: testnet }) +
            "?" +
            qs.stringify({
                text: "Deploy contract", // 部署命令的默认文本
                amount: value.toString(10), // 部署金额
                init: initStr, // 初始化参数
                bin: base64url(command.toBoc({ idx: false })), // 命令的二进制数据
            });
    }
    // 打印生成的部署链接
    console.log("Deploy: " + link);
    printSeparator(); // 打印分隔符
}
