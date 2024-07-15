import { Sha256 } from "@aws-crypto/sha256-js"; // 导入用于计算 SHA-256 哈希的模块
import { Dictionary, beginCell, Cell } from "@ton/core"; // 导入 TON 区块链核心模块

// 常量定义
const ONCHAIN_CONTENT_PREFIX = 0x00; // 链上内容前缀
const SNAKE_PREFIX = 0x00; // SNAKE cell 前缀
const CELL_MAX_SIZE_BYTES = Math.floor((1023 - 8) / 8); // cell 最大字节数

/**
 * 计算字符串的 SHA-256 哈希值
 * @param str 输入字符串
 * @returns SHA-256 哈希值的 Buffer
 */
const sha256 = (str: string) => {
    const sha = new Sha256(); // 创建一个 SHA-256 实例
    sha.update(str); // 更新 SHA-256 实例的状态
    return Buffer.from(sha.digestSync()); // 计算并返回哈希值
};

/**
 * 将字符串键转换为大整数键
 * @param key 输入键字符串
 * @returns 大整数形式的键
 */
const toKey = (key: string) => {
    return BigInt(`0x${sha256(key).toString("hex")}`);
};

/**
 * 构建链上元数据
 * @param data 包含名称、描述和图像的元数据对象
 * @returns 包含元数据的 Cell
 */
export function buildOnchainMetadata(data: { name: string; description: string; image: string }): Cell {
    // 创建一个空的字典，键为 256 位大整数，值为 Cell
    let dict = Dictionary.empty(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell());

    // 将元数据存储在字典中
    Object.entries(data).forEach(([key, value]) => {
        dict.set(toKey(key), makeSnakeCell(Buffer.from(value, "utf8")));
    });

    // 创建一个 Cell，存储链上内容前缀和字典
    return beginCell().storeInt(ONCHAIN_CONTENT_PREFIX, 8).storeDict(dict).endCell();
}

/**
 * 创建一个包含数据的 SNAKE cell
 * @param data 需要存储的数据
 * @returns 包含数据的 SNAKE cell
 */
export function makeSnakeCell(data: Buffer) {
    // 将数据分块
    let chunks = bufferToChunks(data, CELL_MAX_SIZE_BYTES);

    // 使用 reduceRight 将数据块存储在 Cell 中
    const b = chunks.reduceRight((curCell, chunk, index) => {
        if (index === 0) {
            curCell.storeInt(SNAKE_PREFIX, 8); // 在第一个块中存储 SNAKE 前缀
        }
        curCell.storeBuffer(chunk); // 存储数据块
        if (index > 0) {
            const cell = curCell.endCell(); // 完成当前 Cell
            return beginCell().storeRef(cell); // 将当前 Cell 作为引用存储在新的 Cell 中
        } else {
            return curCell;
        }
    }, beginCell());
    return b.endCell(); // 完成并返回最终的 Cell
}

/**
 * 将 Buffer 分割成指定大小的块
 * @param buff 输入的 Buffer
 * @param chunkSize 每块的大小
 * @returns 包含数据块的数组
 */
function bufferToChunks(buff: Buffer, chunkSize: number) {
    let chunks: Buffer[] = [];
    while (buff.byteLength > 0) {
        chunks.push(buff.slice(0, chunkSize)); // 切割 Buffer 并存储在 chunks 数组中
        buff = buff.slice(chunkSize); // 更新 Buffer，移除已处理的部分
    }
    return chunks; // 返回包含数据块的数组
}
