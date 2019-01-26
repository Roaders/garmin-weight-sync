
import { Observable } from "rxjs";

export interface IWeightRecord{
    grams: Number;
    date: Date;
}

export interface IWeightProvider{
    getWeightRecords: (user: string) => Observable<IWeightRecord>;
}
