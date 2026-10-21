export const statuses = ['Saved', 'Applied', 'Screening', 'Interview', 'Offer', 'Rejected', 'Withdrawn'] as const;
export type Status = typeof statuses[number];
export const labels: Record<Status, string> = {Saved:'Đã lưu',Applied:'Đã nộp',Screening:'Sàng lọc',Interview:'Phỏng vấn',Offer:'Offer',Rejected:'Từ chối',Withdrawn:'Đã rút'};
export type Interview = {id:string;title:string;at:string;timezone:string;format:string;location:string;preparation:string;notes:string;status:'Scheduled'|'Completed'|'Cancelled'};
export type Application = {id:string;company:string;position:string;url:string;source:string;jobCode:string;location:string;workMode:string;appliedAt:string;salary:string;notes:string;nextAction:string;deadline:string;status:Status;createdAt:string;interviews:Interview[]};
export type Draft = Omit<Application,'id'|'createdAt'|'interviews'>;
export const emptyDraft: Draft = {company:'',position:'',url:'',source:'',jobCode:'',location:'',workMode:'',appliedAt:'',salary:'',notes:'',nextAction:'',deadline:'',status:'Saved'};
export function metrics(apps:Application[], now=Date.now()) {
 const responses=apps.filter(a=>['Screening','Interview','Offer','Rejected'].includes(a.status)).length;
 const submitted=apps.filter(a=>['Applied','Screening','Interview','Offer','Rejected'].includes(a.status)).length;
 return {total:apps.length,upcoming:apps.flatMap(a=>a.interviews).filter(i=>i.status==='Scheduled'&&Date.parse(i.at)>=now).length,offers:apps.filter(a=>a.status==='Offer').length,response:submitted?responses/submitted*100:0};
}
export function validateDraft(d:Draft) {
 const errors:Record<string,string>={};
 if(!d.company.trim())errors.company='Nhập tên công ty.';
 if(!d.position.trim())errors.position='Nhập vị trí ứng tuyển.';
 if(d.url){try{if(!['http:','https:'].includes(new URL(d.url).protocol))throw Error();}catch{errors.url='Dùng địa chỉ http hoặc https hợp lệ.';}}
 if(d.deadline&&!d.nextAction.trim())errors.nextAction='Nhập hành động hoặc xóa deadline.';
 return errors;
}
export function normalizedUrl(input:string){
 if(!input)return ''; const url=new URL(input);url.hash='';for(const key of [...url.searchParams.keys()])if(key.startsWith('utm_')||['fbclid','gclid'].includes(key))url.searchParams.delete(key);url.searchParams.sort();return url.toString();
}
export function duplicate(apps:Application[],draft:Draft,exclude=''){
 const matches=apps.filter(a=>a.id!==exclude&&((draft.source.trim()&&draft.jobCode.trim()&&a.source.trim().toLocaleLowerCase()===draft.source.trim().toLocaleLowerCase()&&a.jobCode.trim().toLocaleLowerCase()===draft.jobCode.trim().toLocaleLowerCase())||(draft.url&&a.url&&normalizedUrl(draft.url)===normalizedUrl(a.url))));
 return matches.find(a=>!['Rejected','Withdrawn'].includes(a.status))||matches[0];
}
export function actionable(apps:Application[]){return apps.filter(a=>a.nextAction).sort((a,b)=>(a.deadline||'z').localeCompare(b.deadline||'z'));}
export function filtered(apps:Application[],query:string,status:string,sort:string){
 const term=query.trim().toLocaleLowerCase('vi');
 return apps.filter(a=>(!term||`${a.company} ${a.position}`.toLocaleLowerCase('vi').includes(term))&&(status==='all'||a.status===status)).sort((a,b)=>{const key=sort.startsWith('applied')?'appliedAt':'createdAt';const sign=sort.endsWith('asc')?1:-1;if(!a[key])return b[key]?1:0;if(!b[key])return -1;return a[key].localeCompare(b[key])*sign;});
}
export function formatDate(value:string){return value?new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(value.length===10?`${value}T12:00:00`:value)):'Chưa đặt';}
export function formatTime(value:string,timezone?:string){return new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',...(timezone?{timeZone:timezone}:{})}).format(new Date(value));}
export const deviceTimezone=Intl.DateTimeFormat().resolvedOptions().timeZone;
// Resolve both DST gaps and repeated times; never choose an offset silently.
export function resolveLocalTime(local:string,timezone:string):string[]{
 if(!local)return [];
 try{const fmt=new Intl.DateTimeFormat('sv-SE',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});const target=local.replace('T',' ');const guess=Date.parse(local+'Z');const matches:string[]=[];
 for(let offset=-14*60;offset<=14*60;offset+=15){const time=guess+offset*60000;if(fmt.format(new Date(time)).slice(0,16)===target)matches.push(new Date(time).toISOString());}return [...new Set(matches)];}catch{return [];}
}
