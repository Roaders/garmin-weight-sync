import { GarminProvider } from "./providers/garmin";
import { toArray, mergeMap, tap } from "rxjs/operators";

const garmin = new GarminProvider();

garmin.getUser().pipe(
        tap(user => console.log(`User: ${user.displayName} ${user.userId}`)),
        mergeMap(user => garmin.getWeightRecords(user)),
        toArray()
    )
    .subscribe(results => console.log(`records: ${results.length}`));
