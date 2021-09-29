import { ApiPromise, WsProvider } from '@polkadot/api';
import { SignedBlock } from '@polkadot/types/interfaces/runtime';

import { eventsCount } from './utils';

async function main () {
    // Kusama network
    //const url: string = 'wss://kusama-rpc.polkadot.io';
    // Polkadot network
    const url: string = 'wss://rpc.polkadot.io';
    const provider = new WsProvider(url);

    // Create the API and wait until ready
    const api = await ApiPromise.create({ provider });

    // Retrieve the chain & node information information via rpc calls
    const [chain, nodeName, nodeVersion] = await Promise.all([
        api.rpc.system.chain(),
        api.rpc.system.name(),
        api.rpc.system.version()
    ]);

    console.log(`You are connected to chain ${chain} using ${nodeName} v${nodeVersion}`);

//   const blockHash = '0x37ee25393672ca9f91b700ac06996b5c165ece53a690bfa45e6dfbd92c6dd43e';
//   const signedBlock = await api.rpc.chain.getBlock(blockHash);
    const unsub = await api.query.timestamp.now((moment) => {
        console.log(`The last block has a timestamp of ${moment}`);
    });

    const signedBlock = await api.rpc.chain.getBlock();
    const blockNumberLatest = signedBlock.block.header.number.toNumber();


    let eventsMap = new Map<string, number>()
    for (let i=7038600; i < blockNumberLatest; i++) {
        const targetBlockHash = await api.rpc.chain.getBlockHash(i);
        const signedBlock = await api.rpc.chain.getBlock(targetBlockHash);
        await executeCount(eventsMap, api, signedBlock);
        
        console.log(`the #${i} block of event count: `, eventsMap)
    }


}

main().catch(console.error).finally(() => process.exit());


async function executeCount(eventsMap: Map<string, number>, api: ApiPromise, signedBlock: SignedBlock): Promise<Map<string, number>> {
    let promise: Promise<Map<string, number>>

    console.log(`the block number of latest: #${signedBlock.block.header.number.toNumber()}`);
    console.log(signedBlock.block.header.hash.toHex());
    
    // the hash for each extrinsic in the block
    signedBlock.block.extrinsics.forEach((ex, index) => {
        console.log(index, ex.hash.toHex());
    });

    const allRecords = await api.query.system.events.at(signedBlock.block.header.hash);

  // map between the extrinsics and events
    signedBlock.block.extrinsics.forEach(({ method: { method, section } }, index) => {
        const events = allRecords
            .filter(({ phase }) =>
                phase.isApplyExtrinsic &&
                phase.asApplyExtrinsic.eq(index)
            )
            .map(({ event }) => `${event.section}.${event.method}`);

        console.log(`${section}.${method}:: ${events.join(', ') || 'no events'}`);
        eventsCount(eventsMap, events);
    });

    promise = new Promise<Map<string, number>>(resolve => {
        resolve(eventsMap)
    })
    return promise;
}