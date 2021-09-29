
export function eventsCount(eventMap: Map<string, number>, events: string[], filter?: string): Map<string, number> {
    events.forEach((event, index) => {
        // 对目标event进行筛选
        const namelist = event.split('.');
        console.log('Func eventsCount: namelist:: ', namelist[0]);
        // TODO: 对event进行
        switch (namelist[0]) {
            case ('treasury' || 'democracy' || 'society' || 'council'):
                console.log('target sccuess!!!')
                const count = eventMap.get(event);
                if (count !== undefined) {
                    eventMap.set(event, count + 1);
                } else {
                    eventMap.set(event, 1)
                }
                break;
            default:
                break;
            };               
        }
    );
    
    return eventMap;
}