import { GarminProvider } from "./providers/garmin";
import { toArray } from "rxjs/operators";

const garmin = new GarminProvider();

garmin.getWeightRecords("Roaders").pipe(
        toArray()
    )
    .subscribe(results => console.log(`records: ${results.length}`));
