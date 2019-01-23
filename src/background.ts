
import { Axios } from "axios-observable";

console.log(`make request`);

const requestUrl = "https://connect.garmin.com/modern/proxy/weight-service/weight/dateRange?startDate=2000-01-01&endDate=2019-01-23";

interface IDateWeight{
    calendarDate: string;
    weight: number;
}

interface IWeightResponse{
    dateWeightList: IDateWeight[];
}

Axios.get<IWeightResponse>(requestUrl)
    .subscribe(result => console.log(`result: ${result.data.dateWeightList.map(record => record.weight).join(", ")}`));
