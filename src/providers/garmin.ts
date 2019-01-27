import { IWeightProvider, IWeightRecord, IUserRecord } from "../shared/contracts";
import { Observable, from as observableFrom, defer } from "rxjs";
import { map, mergeMap, tap, filter } from "rxjs/operators";
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

export class GarminProvider implements IWeightProvider{

    public getUser(): Observable<IUserRecord<ISocialProfile>>{

        console.log(`Getting logged in Garmin user`);

        return Axios.get<string>(indexUrl).pipe(
            map(response => response.data),
            map(parseEmbeddedJson),
            map(parsedResults => parsedResults.filter(isSocialProfile)),
            filter(profiles => profiles.length > 0),
            map(profiles => profiles[0]),
            map(mapToSocialProfile),
            tap(profile => console.log(`profile: ${JSON.stringify(profile, undefined, 4)}`)),
            map(mapToUserRecord)
        );
    }

    public getWeightRecords( user: IUserRecord<ISocialProfile> ): Observable<IWeightRecord>{
        return defer(() => {
            console.log(`Garmin getWeightRecords: '${user.displayName}'`);

            const start = Date.now();

            return Axios.get<IProfileResponse>(String.Format(profileUrl, user.source.displayName)).pipe(
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
