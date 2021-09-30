import * as fs from 'fs';

export default function eventsCount(
  eventMap: Map<string, number>,
  addrMap: Map<string, boolean>,
  addr: string,
  events: string[],
): Map<string, number> {
  events.forEach((event) => {
    // 对目标event进行筛选
    const namelist = event.split('.');
    console.log('Func eventsCount: namelist:: ', namelist[0]);
    // TODO: 对event进行
    switch (namelist[0]) {
      case ('treasury' || 'democracy' || 'society' || 'council' || 'society' || 'collective'):
        console.log('target sccuess!!!');

        // 判断target address是否已经存在
        if (addrMap.get(`${event}=${addr}`) === undefined) {
          // 判断target event是否已经存在
          const count = eventMap.get(event);
          if (count !== undefined) {
            eventMap.set(event, count + 1);
          } else {
            eventMap.set(event, 1);
          }
          // 为该address相应的事件，打tag
          addrMap.set((`${event}=${addr}`), true);
          // 地址tag追加进文件，用于验证
          fs.appendFileSync('kusama-eventAddr-count.json', `{"name": "${event}=${addr}"},\n`);
        }
        break;
      default:
        break;
    }
  });

  return eventMap;
}
