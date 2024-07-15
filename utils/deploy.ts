import { beginCell, Cell, contractAddress, storeStateInit } from "ton-core"; // 导入所需的 TON 核心模块
import { prompt } from "enquirer"; // 导入用于交互式命令行提示的模块
import open from "open"; // 导入用于打开链接的模块
import base64url from "base64url"; // 导入用于 Base64 编码和解码的模块
import { printSeparator } from "./print"; // 导入打印分隔符的函数
import qs from "qs"; // 导入用于处理查询字符串的模块

/**
 * 构建部署链接
 * @param prefix 部署链接的前缀（如 https://tonhub.com/）
 * @param init 初始化参数，包括合约的代码和数据
 * @param value 部署合约时发送的金额（单位为 nanotons）
 * @param command 部署合约时的命令，可以是 Cell 类型或字符串
 * @param testnet 是否使用测试网
 * @returns 构建的部署链接
 */
function getLink(
    prefix: string,
    init: { code: Cell; data: Cell },
    value: bigint,
    command: Cell | string,
    testnet: boolean
) {
    // 解析目标合约地址
    let to = contractAddress(0, init);

    // 解析初始化参数并转换为 Base64 URL 编码的字符串
    let initStr = base64url(beginCell().store(storeStateInit(init)).endCell().toBoc({ idx: false }));

    let link: string;
    if (typeof command === "string") {
        // 如果命令是字符串，生成带有命令文本的部署链接
        link =
            prefix +
            `transfer/` +
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
            prefix +
            `transfer/` +
            to.toString({ testOnly: testnet }) +
            "?" +
            qs.stringify({
                text: "Deploy contract", // 部署命令的默认文本
                amount: value.toString(10), // 部署金额
                init: initStr, // 初始化参数
                bin: base64url(command.toBoc({ idx: false })), // 命令的二进制数据
            });
    }
    return link;
}

/**
 * 获取 Tonhub 的部署链接
 * @param init 初始化参数，包括合约的代码和数据
 * @param value 部署合约时发送的金额（单位为 nanotons）
 * @param command 部署合约时的命令，可以是 Cell 类型或字符串
 * @param testnet 是否使用测试网
 * @returns Tonhub 的部署链接
 */
export function getTonhubLink(
    init: { code: Cell; data: Cell },
    value: bigint,
    command: Cell | string,
    testnet: boolean
) {
    return getLink(`https://${testnet ? "test." : ""}tonhub.com/`, init, value, command, testnet);
}

/**
 * 获取 Tonkeeper 的部署链接
 * @param init 初始化参数，包括合约的代码和数据
 * @param value 部署合约时发送的金额（单位为 nanotons）
 * @param command 部署合约时的命令，可以是 Cell 类型或字符串
 * @param testnet 是否使用测试网
 * @returns Tonkeeper 的部署链接
 */
export function getTonkeeperLink(
    init: { code: Cell; data: Cell },
    value: bigint,
    command: Cell | string,
    testnet: boolean
) {
    return getLink(`https://app.tonkeeper.com/`, init, value, command, testnet);
}

/**
 * 获取本地链接的部署链接
 * @param init 初始化参数，包括合约的代码和数据
 * @param value 部署合约时发送的金额（单位为 nanotons）
 * @param command 部署合约时的命令，可以是 Cell 类型或字符串
 * @param testnet 是否使用测试网
 * @returns 本地链接的部署链接
 */
export function getLocalLink(
    init: { code: Cell; data: Cell },
    value: bigint,
    command: Cell | string,
    testnet: boolean
) {
    return getLink(`ton://`, init, value, command, testnet);
}

/**
 * 获取部署链接
 * @param init 初始化参数，包括合约的代码和数据
 * @param value 部署合约时发送的金额（单位为 nanotons）
 * @param command 部署合约时的命令，可以是 Cell 类型或字符串
 * @param testnet 是否使用测试网
 * @returns 部署链接
 */
export function get(
    init: { code: Cell; data: Cell },
    value: bigint,
    command: Cell | string,
    testnet: boolean
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
                text: command,
                amount: value.toString(10),
                init: initStr,
            });
    } else {
        // 如果命令是 Cell 类型，生成带有命令二进制数据的部署链接
        link =
            `https://${testnet ? "test." : ""}tonhub.com/transfer/` +
            to.toString({ testOnly: testnet }) +
            "?" +
            qs.stringify({
                text: "Deploy contract",
                amount: value.toString(10),
                init: initStr,
                bin: base64url(command.toBoc({ idx: false })),
            });
    }
    return link;
}

/**
 * 部署合约的函数
 * @param init 初始化参数，包括合约的代码和数据
 * @param value 部署合约时发送的金额（单位为 nanotons）
 * @param command 部署合约时的命令，可以是 Cell 类型或字符串
 * @param testnet 是否使用测试网 (默认为 true)
 */
export async function deploy(
    init: { code: Cell; data: Cell },
    value: bigint,
    command: Cell | string,
    testnet: boolean = true
) {
    let kind = (
        await prompt<{ kind: "tonhub" | "tonkeeper" | "local" }>([
            {
                type: "select",
                name: "kind",
                message: "Way to deploy",
                initial: 0,
                choices: [
                    {
                        message: "Tonhub/Sandbox",
                        name: "tonhub",
                    },
                    {
                        message: "Tonkeeper",
                        name: "tonkeeper",
                    },
                    {
                        message: "Open local link",
                        name: "local",
                    },
                ],
            },
        ])
    ).kind;

    // 显示 Tonhub 链接
    if (kind === "tonhub") {
        printSeparator(); // 打印分隔符
        console.log("Deploy: " + getTonhubLink(init, value, command, testnet)); // 打印 Tonhub 部署链接
        printSeparator(); // 打印分隔符
        return;
    }

    // 显示 Tonkeeper 链接
    if (kind === "tonkeeper") {
        printSeparator(); // 打印分隔符
        console.log("Deploy: " + getTonkeeperLink(init, value, command, testnet)); // 打印 Tonkeeper 部署链接
        printSeparator(); // 打印分隔符
        return;
    }

    // 显示本地链接
    if (kind === "local") {
        // 创建本地链接并显示给用户
        let l = getLocalLink(init, value, command, testnet);
        printSeparator(); // 打印分隔符
        console.log("Deploy: " + l); // 打印本地部署链接
        printSeparator(); // 打印分隔符

        // 打开本地链接
        open(l);

        return;
    }
}
