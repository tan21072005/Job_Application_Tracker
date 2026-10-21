import {beforeEach,describe,expect,it,vi} from 'vitest';
import {repository,DuplicateConflict,FieldValidationError} from './index';
import {emptyDraft,type Interview} from './domain';
import {fixture} from './fixture';

const storage=new Map<string,string>();
beforeEach(()=>{
 storage.clear();
 vi.stubGlobal('localStorage',{getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>storage.set(key,value)});
 vi.stubGlobal('window',new EventTarget());
 vi.stubGlobal('navigator',{});
});
describe('shared demo repository safeguards',()=>{
 it('keeps independent fixture copies and ignores injected fields',async()=>{
  const first=await repository.list();first[0].company='Changed externally';
  expect((await repository.list())[0].company).toBe('FPT Software');
  const saved=await repository.save({...emptyDraft,company:'New co',position:'Engineer',id:'injected'} as typeof emptyDraft);
  expect(saved.id).not.toBe('injected');expect(saved.interviews).toEqual([]);
 });
 it('rejects invalid required fields without committing',async()=>{
  await expect(repository.save(emptyDraft)).rejects.toBeInstanceOf(FieldValidationError);
  expect((await repository.list()).length).toBe(12);
 });
 it('blocks active duplicates even when reapply is confirmed',async()=>{
  const d={...fixture()[0]};
  await expect(repository.save(d,undefined,true)).rejects.toMatchObject({terminal:false});
  expect((await repository.list()).length).toBe(12);
 });
 it('requires explicit reapply for terminal duplicates and creates a new record',async()=>{
  const old=fixture()[8];const draft={...old,status:'Applied' as const};
  await expect(repository.save(draft)).rejects.toMatchObject({terminal:true});
  const saved=await repository.save(draft,undefined,true);
  expect(saved.id).not.toBe(old.id);expect(saved.interviews).toEqual([]);
  expect((await repository.list()).find(a=>a.id===old.id)?.status).toBe('Rejected');
 });
 it('blocks reactivation when another active application uses the same vacancy',async()=>{
  const old=fixture()[8];await repository.save({...old,status:'Applied'},undefined,true);
  await expect(repository.save({...old,status:'Applied'},old.id)).rejects.toBeInstanceOf(DuplicateConflict);
 });
 it('persists a single next action and removes interviews with their application',async()=>{
  const app=fixture()[0];await repository.save({...app,nextAction:'One next step'},app.id);
  expect((await repository.list())[0].nextAction).toBe('One next step');
  await repository.remove(app.id);expect((await repository.list()).some(a=>a.id===app.id)).toBe(false);
 });
 it('updates an interview without changing the application status again',async()=>{
  const app=fixture()[0];await repository.save({...app,status:'Screening'},app.id);
  await repository.saveInterview(app.id,{...app.interviews[0],status:'Completed'});
  expect((await repository.list()).find(a=>a.id===app.id)?.status).toBe('Screening');
 });
 it('rejects invalid interview times and zones without altering the application',async()=>{
  const round=fixture()[0].interviews[0];
  await expect(repository.saveInterview('demo-0',{...round,at:'bad'})).rejects.toThrow('thời điểm');
  await expect(repository.saveInterview('demo-0',{...round,timezone:'fake/zone'})).rejects.toThrow('IANA');
  expect((await repository.list())[0].interviews.length).toBe(2);
 });
 it('recovers malformed data only by an explicit demo reset',async()=>{
  storage.set('jobtrack.experiences.v1','malformed');
  await expect(repository.list()).rejects.toThrow('bị lỗi');
  await repository.resetDemo();expect((await repository.list()).length).toBe(12);
 });
 it('does not simulate successful authentication or store a password',async()=>{
  await expect(repository.login('test@example.com','demo-only')).rejects.toThrow('bản xem trước');
  expect([...storage.values()].join('')).not.toContain('demo-only');
 });
});
