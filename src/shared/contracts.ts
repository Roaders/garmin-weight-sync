
import { Observable } from "rxjs";

export interface IWeightRecord{
    grams: Number;
    date: Date;
}

export interface IUserRecord<T>{
    displayName: string;
    userId: string;
    source: T
}

export interface IWeightProvider{

    getUser: () => Observable<IUserRecord<any>>;

    getWeightRecords: (user: IUserRecord<any>) => Observable<IWeightRecord>;
}
