import { IWeightProvider, IWeightRecord } from "../shared/contracts";
import { Observable, from as observableFrom, defer } from "rxjs";
import { map, mergeMap, tap } from "rxjs/operators";
import { Axios } from "axios-observable";
import { String } from "typescript-string-operations";

//  {0}, {1} = yyyy-mm-dd
const requestUrl = "https://connect.garmin.com/modern/proxy/weight-service/weight/dateRange?startDate={0}&endDate={1}";
//  {0} = username
const profileUrl = "https://connect.garmin.com/modern/proxy/userprofile-service/userprofile/personal-information/{0}";

interface IDateWeight{
    calendarDate: string;
    weight: number;
    date: number;
}

interface IWeightResponse{
    dateWeightList: IDateWeight[];
}

interface IUserInfo{
    birthDate: string, // "yyyy-mm-dd"
    genderType: string, // "MALE"
    email: string,
    locale: string,
    timeZone: string,
    age: number
}

interface IBiometricProfile{
    userId: number,
    height: number, // cm
    weight: number, // g
    vo2Max: number,
    vo2MaxCycling: number,
    lactateThresholdHeartRate: null,
    activityClass: number
}

interface IProfileResponse{
    userInfo: IUserInfo,
    biometricProfile: IBiometricProfile,
    birthDate: string, // "yyyy-mm-dd"
    gender: string, // "MALE"
    timeZone: string,
    locale: string
}

export class GarminProvider implements IWeightProvider{

    public getWeightRecords( user: string ): Observable<IWeightRecord>{
        return defer(() => {
            console.log(`Garmin getWeightRecords: '${user}'`);

            const start = Date.now();

            return Axios.get<IProfileResponse>(String.Format(profileUrl, user)).pipe(
                map(response => new Date(Date.parse(response.data.userInfo.birthDate))),
                mergeMap(birthDate => observableFrom(getYears(birthDate))),
                mergeMap(year => Axios.get<IWeightResponse>(String.Format(requestUrl, `${year}-01-01`, `${year}-12-31`)), 4),
                mergeMap(response => observableFrom(response.data.dateWeightList)),
                map(mapDateWeight),
                tap(undefined, undefined, () => {
                    const finished = Date.now();
                    const elapsed = finished - start;
                    console.log(`Garmin records loaded in ${elapsed}ms`);
                })
            )
        });
    }
}

function getYears(birthDate: Date): number[]{
    const birthYear = birthDate.getFullYear();
    const todayYear = new Date().getFullYear();

    const years: number[] = [];

    for(let currentYear = birthYear; currentYear <= todayYear; currentYear++){
        years.push(currentYear);
    }

    return years;
}

function mapDateWeight(dateWeight: IDateWeight): IWeightRecord{

    return {
        date: new Date(dateWeight.date),
        grams: dateWeight.weight,
    }
}