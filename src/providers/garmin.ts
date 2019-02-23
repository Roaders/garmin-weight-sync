import { IWeightProvider, IWeightRecord, IUserRecord } from "../shared/contracts";
import { chromeStorageLocalSet, chromeStorageLocalGet } from "../shared/services";
import { Observable, from as observableFrom, defer, from } from "rxjs";
import { map, mergeMap, tap, filter, share, bufferTime, scan } from "rxjs/operators";
import { Axios } from "axios-observable";
import { String } from "typescript-string-operations";
import { isInterface, mapToSample } from "../shared/helpers";

//  {0}, {1} = yyyy-mm-dd
const requestUrl = "https://connect.garmin.com/modern/proxy/weight-service/weight/dateRange?startDate={0}&endDate={1}";
//  {0} = username
const profileUrl = "https://connect.garmin.com/modern/proxy/userprofile-service/userprofile/personal-information/{0}";

const indexUrl = "https://connect.garmin.com/modern/";

const jsonRegexp = /(\w+) *= *JSON.parse *\(("[^)]+")\)/gm;

interface IDateWeight{
    calendarDate: string; // "2019-02-07"
    weight: number; // g
    date: number; // ms since epoch
    sourceType: string // "INDEX_SCALE"
    bmi: number;
    bodyWater: number; // percentage
    bodyFat: number; // percentage
    boneMass: number; // g
    muscleMass: number; // g
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

interface ISocialProfile{
    fullName: string;
    garminGUID: string;
    id: number;
    profileId: number;
    profileImageUrlLarge?: string;
    profileImageUrlMedium?: string;
    profileImageUrlSmall?: string;
    userName: string;
    displayName: string;
    userProfileFullName: string;
}

interface IGarminStorage{
    user: IUserRecord<ISocialProfile>;
    dateWeightList: IDateWeight[];
}

export class GarminProvider implements IWeightProvider{

    public readonly storageKey = "garmin-weight-record-storage";

    public getUser(): Observable<IUserRecord<ISocialProfile>>{

        console.log(`Getting logged in Garmin user`);

        return Axios.get<string>(indexUrl).pipe(
            map(response => response.data),
            map(parseEmbeddedJson),
            map(parsedResults => parsedResults.filter(isSocialProfile)),
            filter(profiles => profiles.length > 0),
            map(profiles => profiles[0]),
            map(mapToSocialProfile),
            map(mapToUserRecord)
        );
    }

    public getWeightRecords( user: IUserRecord<ISocialProfile> ): Observable<IWeightRecord>{
        return defer(() => {
            const storageKey = `${this.storageKey}_${user.userId}`;

            console.log(`Garmin getWeightRecords: '${user.displayName}' (${user.source.displayName})`);

            const start = Date.now();

            const recordsFromStorageStream = chromeStorageLocalGet<IGarminStorage>(storageKey).pipe(
                tap(data => data == null ? console.log(`no records from storage`) : console.log(`items ${data.dateWeightList.length} loaded from storage for user ${data.user.displayName}`))
            );


            const dateWeightStream = this.getUserYears(user).pipe(
                mergeMap(year => Axios.get<IWeightResponse>(String.Format(requestUrl, `${year}-01-01`, `${year}-12-31`)), 4),
                mergeMap(response => observableFrom(response.data.dateWeightList)),
                share(),
            );

            dateWeightStream.pipe(
                bufferTime(100),
                filter(items => items.length > 0),
                scan<IDateWeight[], IDateWeight[]>((acc, value) => {acc.push(...value); return acc;}, []), // TODO: sort by date
                map(dateWeightList => ({user, dateWeightList})),
                mergeMap(dateWeightList => chromeStorageLocalSet(storageKey, dateWeightList)),
            )
            .subscribe(
                data => console.log(`Date Weight Records saved: ${data.dateWeightList.length}`),
                undefined,
                () => console.log(`storage complete`)
            );

            return dateWeightStream.pipe(
                map(mapDateWeight),
                tap(undefined, undefined, () => {
                    const finished = Date.now();
                    const elapsed = finished - start;
                    console.log(`Garmin records loaded in ${elapsed}ms`);
                }),
            );
        });
    }

    private loadLatestUserRecords(existingRecords: IDateWeight[]){
        const latestRecord = new Date(existingRecords.reduce((acc, record) => Math.max(acc, record.date), 0));
        const today = new Date();

        return Axios.get<IWeightResponse>(String.Format(requestUrl, `${year}-01-01`, `${year}-12-31`))
    }

    private loadAllUserRecords( user: IUserRecord<ISocialProfile> ){
        return this.getUserYears(user).pipe(
            mergeMap(year => Axios.get<IWeightResponse>(String.Format(requestUrl, `${year}-01-01`, `${year}-12-31`)), 4),
            mergeMap(response => observableFrom(response.data.dateWeightList)),
        );
    }

    private getUserYears( user: IUserRecord<ISocialProfile> ){
        return Axios.get<IProfileResponse>(String.Format(profileUrl, user.source.displayName)).pipe(
            map(response => new Date(Date.parse(response.data.userInfo.birthDate))),
            mergeMap(birthDate => observableFrom(getYears(birthDate))),
        );
    }
}

function parseEmbeddedJson(source: string): any[]{
    const results: any[] = [];

    let regexResult: RegExpExecArray | null;

    while(regexResult = jsonRegexp.exec(source)){
        const jsonString = regexResult[2];
        const unescaped = JSON.parse(jsonString);
        const jsonObject = JSON.parse(unescaped);

        results.push(jsonObject);
    }

    return results;
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

function isSocialProfile(value: any): value is ISocialProfile {
    const sampleProfile: ISocialProfile = {
        displayName: "",
        fullName: "",
        garminGUID: "",
        id: 0,
        profileId: 0,
        userProfileFullName: "",
        userName: "",
    }

    return isInterface(sampleProfile, value);
    
}

function mapToUserRecord(profile: ISocialProfile): IUserRecord<ISocialProfile>{
    return {
        displayName: profile.fullName,
        userId: profile.id.toString(),
        source: profile
    }
}

function mapToSocialProfile(value: ISocialProfile): ISocialProfile{

    const sampleProfile: ISocialProfile = {
        displayName: "",
        fullName: "",
        garminGUID: "",
        id: 0,
        profileId: 0,
        userProfileFullName: "",
        userName: "",
        profileImageUrlLarge: "",
        profileImageUrlMedium: "",
        profileImageUrlSmall: ""
    }

    return mapToSample(sampleProfile, value);
}
