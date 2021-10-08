import { ApiPromise, WsProvider } from '@polkadot/api';
import { CodecHash, SignedBlock } from '@polkadot/types/interfaces/runtime';
import * as fs from 'fs';

import eventsCount from './utils';

// eventsMap用于存储最后的event-number
const eventsCountMap = new Map<string, number>();
// eventsAddrMap用于存储event-address的tag
const eventsAddrMap = new Map<string, boolean>();

async function main() {
  // Kusama network
  // const url = 'wss://kusama-rpc.polkadot.io';
  // Polkadot network
  const url = 'wss://rpc.polkadot.io';
  const provider = new WsProvider(url);

  // Create the API and wait until ready
  const api = await ApiPromise.create({ provider });

  // Retrieve the chain & node information information via rpc calls
  const [chain, nodeName, nodeVersion] = await Promise.all([
    api.rpc.system.chain(),
    api.rpc.system.name(),
    api.rpc.system.version(),
  ]);

  console.log(`You are connected to chain ${chain} using ${nodeName} v${nodeVersion}`);

  //   const blockHash = '0x37ee25393672ca9f91b700ac06996b5c165ece53a690bfa45e6dfbd92c6dd43e';
  //   const signedBlock = await api.rpc.chain.getBlock(blockHash);
  /*
  const unsub = await api.query.timestamp.now((moment) => {
    console.log(`The last block has a timestamp of ${moment}`);
  });
  */

  const latestBlock = await api.rpc.chain.getBlock();
  const blockNumberLatest = latestBlock.block.header.number.toNumber();

  /*
  // 包装async函数
  const getSingedBlock = async (num: number) => {
    // const targetBlockHash = await api.rpc.chain.getBlockHash(num);
    const targetBlockHash = await api.rpc.chain.getBlockHash(num);
    // return targetBlockHash;
    const block = await api.rpc.chain.getBlock(targetBlockHash);
    return block;
  };
  */

  // 包装所有从链上需要获取数据的async函数
  const getBlockByBlockNumber = async (num: number) => {
    const targetBlockHash = await api.rpc.chain.getBlockHash(num);
    const signedBlock = await api.rpc.chain.getBlock(targetBlockHash);
    return signedBlock;
  };

  // 包装所有从链上需要获取数据的async函数
  const getEventsByBlock = async (blockHash: SignedBlock) => {
    const allRecords = await api.query.system.events.at(blockHash.block.header.hash);
    return allRecords;
  };

  const fetchBlocksByBlockNumber = (nums: number[]) => {
    const promises = nums.map(getBlockByBlockNumber);
    return Promise.all(promises);
  };

  const fetchEventsByBlock = (blocks: SignedBlock[]) => {
    const promises = blocks.map(getEventsByBlock);
    return Promise.all(promises);
  };

  const Start = async (nums: number[]) => {
    console.log('Start');

    // 一个signedBlock对应一组event
    const arraySignedBlock = await fetchBlocksByBlockNumber(nums);
    const arrayEvents = await fetchEventsByBlock(arraySignedBlock);
    for (let i = 0; i < arraySignedBlock.length; i++) {
      const signedBlock = arraySignedBlock[i];

      // map between the extrinsics and events
      signedBlock.block.extrinsics.forEach((ex, index) => {
        const { isSigned, meta, method: { args, method, section } } = ex;

        const events = arrayEvents[i]
          .filter(({ phase }) => phase.isApplyExtrinsic
                    && phase.asApplyExtrinsic.eq(index))
          .map(({ event }) => `${event.section}.${event.method}`);

        console.log(`${section}.${method}:: ${events.join(', ') || 'no events'}`);

        if (isSigned) {
          console.log(`signer=${ex.signer.toString()}, nonce=${ex.nonce.toString()}`);
          eventsCount(eventsCountMap, eventsAddrMap, ex.signer.toString(), events);
        }
      });
    }
    console.log('End');
  };

  const tmp = 10;
  const predix = blockNumberLatest / tmp;
  for (let i = 0; i < predix; i + tmp) {
    const nums: number[] = [];
    const temp = i;
    // 组装nums
    for (let j = temp; j < temp + tmp; j++) {
      nums.push(j);
    }

    console.log(`组装的nums: ${nums.toString()}`);
    await Start(nums);
  }

  /*
  for (let i = 0; i < blockNumberLatest; i++) {
    const targetBlockHash = await api.rpc.chain.getBlockHash(i);
    signedBlock = await api.rpc.chain.getBlock(targetBlockHash);
    // await executeCount(eventsCountMap, eventsAddrMap, api, signedBlock);

    // console.log(`the #${i} block of event count: `, eventsCountMap, eventsAddrMap);
    //console.log(`the #${i} block of event count: `, eventsCountMap);
    console.log(`the #${i} block of event count: `);
  }
  */

  /*
  // save to files
  const eventsCountJson = Object.fromEntries(eventsCountMap);
  const eventsAddrJson = Object.fromEntries(eventsAddrMap);

  const networkNameAsCount = './kusame-address-count.json';
  const networkNameAsAddress = './kusama-address.json';

  fs.writeFileSync(networkNameAsCount, JSON.stringify(eventsCountJson));
  fs.writeFileSync(networkNameAsAddress, JSON.stringify(eventsAddrJson));
  */
}

main().catch(console.error).finally(() => process.exit());

/*
async function executeCount(
  eventsCountMap: Map<string, number>,
  eventsAddrMap: Map<string, boolean>,
  api: ApiPromise,
  signedBlock: SignedBlock,
): Promise<Map<string, number>> {
  let promise: Promise<Map<string, number>>;

  console.log(`the block number of latest: #${signedBlock.block.header.number.toNumber()}`);
  console.log(signedBlock.block.header.hash.toHex());

  // the hash for each extrinsic in the block
  signedBlock.block.extrinsics.forEach((ex, index) => {
    console.log(index, ex.hash.toHex());
  });

  const allRecords = await api.query.system.events.at(signedBlock.block.header.hash);

  // map between the extrinsics and events
  signedBlock.block.extrinsics.forEach((ex, index) => {
    const { isSigned, meta, method: { args, method, section } } = ex;

    const events = allRecords
      .filter(({ phase }) => phase.isApplyExtrinsic
                && phase.asApplyExtrinsic.eq(index))
      .map(({ event }) => `${event.section}.${event.method}`);

    console.log(`${section}.${method}:: ${events.join(', ') || 'no events'}`);

    if (isSigned) {
      console.log(`signer=${ex.signer.toString()}, nonce=${ex.nonce.toString()}`);
      eventsCount(eventsCountMap, eventsAddrMap, ex.signer.toString(), events);
    }
  });

  promise = new Promise<Map<string, number>>((resolve) => {
    resolve(eventsCountMap);
  });
  return promise;
}
*/

const executeCount = async (
  eventsCountMap: Map<string, number>,
  eventsAddrMap: Map<string, boolean>,
  api: ApiPromise,
  signedBlock: SignedBlock,
) => {
  console.log(`the block number of latest: #${signedBlock.block.header.number.toNumber()}`);
  console.log(signedBlock.block.header.hash.toHex());

  // the hash for each extrinsic in the block
  signedBlock.block.extrinsics.forEach((ex, index) => {
    console.log(index, ex.hash.toHex());
  });

  const allRecords = await api.query.system.events.at(signedBlock.block.header.hash);

  // map between the extrinsics and events
  signedBlock.block.extrinsics.forEach((ex, index) => {
    const { isSigned, meta, method: { args, method, section } } = ex;

    const events = allRecords
      .filter(({ phase }) => phase.isApplyExtrinsic
                && phase.asApplyExtrinsic.eq(index))
      .map(({ event }) => `${event.section}.${event.method}`);

    console.log(`${section}.${method}:: ${events.join(', ') || 'no events'}`);

    if (isSigned) {
      console.log(`signer=${ex.signer.toString()}, nonce=${ex.nonce.toString()}`);
      eventsCount(eventsCountMap, eventsAddrMap, ex.signer.toString(), events);
    }
  });
  return eventsCountMap;
};
