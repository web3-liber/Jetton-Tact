import { Sha256 } from "@aws-crypto/sha256-js";
import { Dictionary, beginCell, Cell } from "@ton/core";

// 定义常量
const ONCHAIN_CONTENT_PREFIX = 0x00; // 链上内容前缀，用于标识链上元数据
const SNAKE_PREFIX = 0x00; // 蛇形前缀，用于标识蛇形数据结构的起始
const CELL_MAX_SIZE_BYTES = Math.floor((1023 - 8) / 8); // 每个 Cell 的最大字节数（考虑到开销）

// 定义 SHA-256 哈希函数，将字符串转换为 Buffer 格式的哈希值
const sha256 = (str: string) => {
    const sha = new Sha256(); // 创建 Sha256 实例
    sha.update(str); // 更新哈希对象的数据
    return Buffer.from(sha.digestSync()); // 获取哈希值并转换为 Buffer
};

// 定义将字符串键转换为大整数键的函数
const toKey = (key: string) => {
    return BigInt(`0x${sha256(key).toString("hex")}`); // 将字符串转换为 SHA-256 哈希值并转换为 BigInt
};

// 定义构建链上元数据的函数
export function buildOnchainMetadata(data: { name: string; description: string; image: string }): Cell {
    // 创建一个空的字典，键为 256 位的大整数，值为 Cell
    let dict = Dictionary.empty(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell());

    // 将元数据存储在字典中
    Object.entries(data).forEach(([key, value]) => {
        // 将键值对转换为蛇形 Cell 并存储在字典中
        dict.set(toKey(key), makeSnakeCell(Buffer.from(value, "utf8")));
    });

    // 创建一个 Cell 并存储前缀和字典，然后结束 Cell
    return beginCell().storeInt(ONCHAIN_CONTENT_PREFIX, 8).storeDict(dict).endCell();
}

// 定义创建蛇形 Cell 的函数
export function makeSnakeCell(data: Buffer) {
    // 将数据分块
    let chunks = bufferToChunks(data, CELL_MAX_SIZE_BYTES);

    // 通过 reduceRight 方法倒序遍历数据块，依次创建和链接 Cell
    const b = chunks.reduceRight((curCell, chunk, index) => {
        if (index === 0) {
            curCell.storeInt(SNAKE_PREFIX, 8); // 如果是第一个块，存储蛇形前缀
        }
        curCell.storeBuffer(chunk); // 存储数据块
        if (index > 0) {
            const cell = curCell.endCell(); // 结束当前 Cell
            return beginCell().storeRef(cell); // 创建一个新的 Cell 并存储引用
        } else {
            return curCell; // 返回当前 Cell
        }
    }, beginCell());
    return b.endCell(); // 结束 Cell 并返回
}

// 定义将 Buffer 数据分割为指定大小块的函数
function bufferToChunks(buff: Buffer, chunkSize: number) {
    let chunks: Buffer[] = []; // 初始化块数组
    while (buff.byteLength > 0) {
        chunks.push(buff.slice(0, chunkSize)); // 分割数据为块并加入数组
        buff = buff.slice(chunkSize); // 移除已经分割的部分
    }
    return chunks; // 返回分块数组
}
