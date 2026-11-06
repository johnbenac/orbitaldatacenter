// Two-slot checkpoint custody. The completed slot is retained while the other
// slot drains through the same installed drive interface used by other writes.
// Requests while a save is in progress are deferred; they never overwrite it.
export function checkpointWriteStep({checkpointGB=0,pendingGB=0,requests=0,targetUnits=0,pendingTargetUnits=0,committedCount=0,lastCompleteUnits=0,capacityGB=0}={}){
 const requested=Math.max(0,Math.floor(requests)),size=Math.max(0,checkpointGB),priorPending=Math.max(0,pendingGB);
 const started=requested>0&&priorPending<=1e-10&&size>0;
 const target=started?targetUnits:pendingTargetUnits,queued=started?size:priorPending;
 const writtenGB=Math.min(queued,Math.max(0,capacityGB)),remaining=Math.max(0,queued-writtenGB),committed=queued>0&&remaining<=1e-10;
 const nextCount=committedCount+Number(committed);
 return {writtenGB,pendingGB:committed?0:remaining,pendingTargetUnits:target,committed,committedCount:nextCount,lastCompleteUnits:committed?target:lastCompleteUnits,deferredSaves:Math.max(0,requested-Number(started)),activeSlot:nextCount%2,completeSlot:nextCount>0?(nextCount-1)%2:null};
}
