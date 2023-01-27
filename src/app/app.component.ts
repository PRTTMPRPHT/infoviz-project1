import {Component, OnInit} from "@angular/core";
import {BehaviorSubject} from "rxjs";
import {Nullable} from "../core/interfaces/generic.interface";
import {RawDataSet} from "../core/interfaces/data-point.interface";
import {QueryUtils} from "../core/utils";

/**
 * This is the root component that orchestrates this application's behavior.
 */
@Component({
    selector: "viz-root",
    templateUrl: "./app.component.html",
    styleUrls: ["./app.component.scss"]
})
export class AppComponent implements OnInit {
    // The raw data set as it is in the JSON file.
    public readonly data$ = new BehaviorSubject<Nullable<RawDataSet>>(null);
    // A participant that is currently being hovered over on the heatmap, represented by pseudonym.
    public readonly hoverParticipant$ = new BehaviorSubject<Nullable<string>>(null);
    // The formed groups.
    public readonly groups$ = new BehaviorSubject<string[][]>([[]]);
    // Currently selected team, represented as index over "groups$".
    // TODO: Ideally I would have based it all on RxJS for future extension possibilities. Ran out of time.
    public selectedGroup = 0;
    // Whether to show the "About & Controls" modal.
    public displayInfoDialog = false;

    public async ngOnInit(): Promise<void> {
        // Query the dataset once and store it. It's all static data and of low size.
        const dataSet = await QueryUtils.obtainDataSet();
        this.data$.next(dataSet); // Notifies components once the dataset is there.
    }

    /**
     * Adds a new, fresh, empty group to our list.
     */
    public addGroup(): void {
        this.groups$.next([...this.groups$.value, []]);
    }

    /**
     * Removes a group by index.
     * @param groupIndex {number} The index of the group to remove.
     */
    public removeGroup(groupIndex: number): void {
        const val = [...this.groups$.value];
        val.splice(groupIndex, 1);
        this.groups$.next(val);
    }

    /**
     * Handles a change of selected participants in the heatmap by adding or removing
     * from the currently selected group.
     * @param selectedPeople {string[]} The new selection.
     */
    public heatmapSelectionChanged(selectedPeople: string[]) {
        const val = [...this.groups$.value];
        val[this.selectedGroup] = selectedPeople;
        this.groups$.next(val);
    }

    /**
     * Removes all participants from a given group (identified by index).
     * @param groupIndex {number} The index of the group to clear out.
     */
    public clearGroup(groupIndex: number) {
        const val = [...this.groups$.value];
        val.splice(groupIndex, 1, []);
        this.groups$.next(val);
    }
}
