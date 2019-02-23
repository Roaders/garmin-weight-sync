
import { Observable, Subject } from "rxjs";

export function chromeStorageLocalSet<T>(key: string, data: T): Observable<T>{
    return Observable.create((subscriber: Subject<T>) => {

        try{
        chrome.storage.local.set({[key]: data}, () => {
            subscriber.next(data);
            subscriber.complete();
        });
        } catch(e){
            subscriber.error(e);
        }

    })
}

export function chromeStorageLocalGet<T>(key: string): Observable<T | undefined>{
    return Observable.create((subscriber: Subject<T>) => {

        try{
        chrome.storage.local.get(key, (item: any) => {

            subscriber.next(item[key]);
            subscriber.complete();
        });
        } catch(e){
            subscriber.error(e);
        }

    })
}
