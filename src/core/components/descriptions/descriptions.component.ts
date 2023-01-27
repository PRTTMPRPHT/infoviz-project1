import {Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges} from "@angular/core";
import {Nullable} from "../../interfaces/generic.interface";
import {RawDataPoint, RawDataSet} from "../../interfaces/data-point.interface";

// Represents a person within a group. Also, go watch the series "Person of Interest".
type PersonOfInterest = { alias: string, selfDescription: string };

/**
 * This component is a group-builder component that allows for the creation, removal and clearing of groups,
 * as well as displaying the self-descriptions.
 * (The latter part is the original intent, while the multi-group feature was a last minute addition.)
 */
@Component({
    selector: "viz-descriptions",
    templateUrl: "./descriptions.component.html",
    styleUrls: ["./descriptions.component.scss"]
})
export class DescriptionsComponent implements OnInit, OnChanges {
    // ### Inputs. ###
    // The raw data set as it is in the JSON file. We do all the necessary transformations in here.
    @Input() dataSet: Nullable<RawDataSet> = null;
    // The team members that are currently present in groups, represented by pseudonym.
    @Input() groups: string[][] = [[]];

    // ### Outputs. ###
    // Triggers when a group is to be removed entirely.
    @Output() removeGroupRequested = new EventEmitter<number>();
    // Triggers when a group is to be cleared of members but kept.
    @Output() clearGroupRequested = new EventEmitter<number>();
    // Triggers when the addition of a new group is requested. Will max out at four groups.
    @Output() addGroupRequested = new EventEmitter<void>();
    // Triggers when a group is to be marked as selected with priority.
    @Output() groupSelected = new EventEmitter<number>();

    // ### Display data. ###
    // The people within the currently selected group.
    public personsOfInterest: PersonOfInterest[] = [];
    // The currently selected group, by index over the array "groups".
    public selectedGroup = 0;

    public ngOnChanges(changes: SimpleChanges): void {
        // This long check is just out of courtesy in case this would ever be expanded and have attributes
        // that don't trigger a re-rendering. The important bit is: We need a dataset to show anything.
        if ((changes["dataSet"] || changes["groups"]) && this.dataSet) {
            this.dataUpdated();
        }
    }

    public ngOnInit(): void {
        // If we already have data, just have a display stuff immediately.
        if (this.dataSet) {
            this.dataUpdated();
        }
    }

    /**
     * Handle any updates of the data, changing the list of people to display.
     */
    private dataUpdated() {
        // No data, no rendering.
        if (!this.dataSet) {
            return;
        }

        // Get the data for all people in the currently selected group.
        this.personsOfInterest = this.groups[this.selectedGroup].map(m =>
            this.dataSet?.find(d => d.alias === m) as RawDataPoint
        );
    }

    /**
     * Request the addition of a new group.
     */
    public addGroup() {
        this.addGroupRequested.emit();
    }

    /**
     * Selects a given group and notifies outside components.
     * @param group {number} The index of the group to select.
     */
    public selectGroup(group: number) {
        // Keep track for our own display.
        this.selectedGroup = group;
        // We need to update the list of team members.
        this.dataUpdated();
        // Let the other components know we have a new selection.
        this.groupSelected.emit(group);
    }

    /**
     * Requests the removal of the currently selected group.
     */
    public removeSelectedGroup() {
        // Keep track of the currently selected group because we're changing selection in a moment.
        const group = this.selectedGroup;
        // Pre-emptively select the only group that cannot be deleted, so we don't run into errors.
        this.selectGroup(0);
        // Now we request deletion of the previously selected group.
        this.removeGroupRequested.emit(group);
    }

    /**
     * Requests the clearing of the currently selected group.
     */
    public clearSelectedGroup() {
        // Just immediately forward this request, nothing to do here.
        this.clearGroupRequested.emit(this.selectedGroup);
    }
}
