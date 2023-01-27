import {
    Component,
    ElementRef,
    EventEmitter,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    Output,
    SimpleChanges
} from "@angular/core";
import {DataPoint, RawDataPoint, RawDataSet, SkillSet} from "../../interfaces/data-point.interface";
import {Nullable} from "../../interfaces/generic.interface";
import {DataUtils} from "../../utils";
import * as echarts from "echarts";
import {ECElementEvent, EChartsType, HeatmapSeriesOption} from "echarts";
import {BehaviorSubject, debounceTime, skip, Subject, takeUntil, tap} from "rxjs";

// Internal types that make transforming the data a little easier here.
type HeatmapDataPoint = { dataPoint: SkillSet, alias: string };
type HeatmapDataSet = HeatmapDataPoint[];

/**
 * This component is a heatmap that displays all potential team members skills
 * and allows for the selection multiple people to add it to the group.
 * Additionally, sorting and color-mapping behaviors are available.
 */
@Component({
    selector: "viz-heatmap",
    templateUrl: "./heatmap.component.html",
    styleUrls: ["./heatmap.component.scss"]
})
export class HeatmapComponent implements OnInit, OnChanges, OnDestroy {
    // ### Inputs. ###
    // The raw data set as it is in the JSON file. We do all the necessary transformations in here.
    @Input() dataSet: Nullable<RawDataSet> = null;
    // The currently selected group's team members.
    @Input() selection: string[] = [];

    // ### Outputs. ###
    // Triggered whenever the heatmap wants to update the selection of team members.
    @Output() selectionChanged = new EventEmitter<string[]>();
    // Triggered whenever the user hovers over a given participant (or moves the mouse out of the heatmap).
    @Output() hoverChanged = new EventEmitter<Nullable<string>>();

    // ### Lifecycle subjects. ###
    // Triggered once when the component is to be disposed.
    private _destroyed$ = new Subject<void>();

    // ### Chart rendering data. ###
    // The skill to sort the heatmap by. We favor programmers, because I'm a programmer and I say so.
    // (Also, interesting fact: It tells a nice story. People in this group who rate programming high tend
    // to rate other skills high as well. This statement does not work as well for other skills.)
    private _sortCriterion: keyof SkillSet = "skillProgramming";
    // The instance of echarts that we are managing here.
    private _chart: Nullable<EChartsType> = null;
    // The series as it was last rendered. Useful for keeping track of selections when the chart is re-sorted.
    private _lastRenderedSeries: Nullable<HeatmapSeriesOption> = null;
    // The indices of selection that echarts last produced. Useful for keeping track of selections when the chart is re-sorted.
    private _lastDataIndices: number[] = [];
    // The participant that is currently hovered over, according to echarts.
    private readonly _mouseOverParticipant$ = new BehaviorSubject<Nullable<string>>(null);

    constructor(private elementRef: ElementRef) {
    }

    public ngOnInit(): void {
        // Create charts instance.
        this.initChart();

        // If we already have data, just have a go at it immediately.
        if (this.dataSet) {
            this.dataUpdated();
        }

        // We're gonna use RxJS for keeping track of the hovered person, because why not.
        // Of course, I could just emit whenever the events happen, but it's nice to have a state to keep track of
        // for future development. Also, this allows for debouncing which is very nice for performance.
        this._mouseOverParticipant$.pipe(
            skip(1),
            debounceTime(50), // This is enough to make the radar chart not freak out.
            tap((part) => this.hoverChanged.emit(part)),
            takeUntil(this._destroyed$)
        ).subscribe();
    }

    public ngOnDestroy(): void {
        // You'd think after all these years they'd just offer the subjects via injection.
        // You'd be wrong.
        this._destroyed$.next();
        this._destroyed$.complete();
    }

    public ngOnChanges(changes: SimpleChanges): void {
        // This long check is just out of courtesy in case this would ever be expanded and have attributes
        // that don't trigger a re-rendering. The important bit is: We need a dataset to render.
        if ((changes["dataSet"] || changes["selection"]) && this.dataSet) {
            this.dataUpdated();
        }
    }

    /**
     * Initializes the {@link EChartsType} instance.
     */
    private initChart(): void {
        // Instantiate echarts with the SVG renderer, so we have a nice zoom.
        this._chart = echarts.init(this.elementRef.nativeElement, undefined, {
            width: 1200,
            height: 425,
            renderer: "svg"
        });

        // Add sorting by skill through clicking on the skill names.
        this._chart.on("mousedown", (e: ECElementEvent) => {
            // There is probably a better way to capture only the relevant events than comparing those attributes,
            // but then again there are a million other things I'd rather care about.
            if (e.componentType === "yAxis" && (e as any).targetType === "axisLabel") {
                this._sortCriterion = DataUtils.SKILL_UNFORMATTER(e.value as string) as keyof SkillSet;
                this.dataUpdated();
            }
        });

        // Add hover behavior for the participants, so we can emit the hovered-over participant.
        this._chart.on("mouseover", (e: any) => e.data && this._mouseOverParticipant$.next(e.data[0]));
        this._chart.on("mouseout", (e: any) => this._mouseOverParticipant$.next(null));

        // Add selection behavior.
        this._chart.on("selectchanged", (e: any) => {
            // We cannot work without data, and we ignore any forced changes for clearing the selection.
            // (Which is what we do between re-renders because otherwise echarts messes up the selections.)
            if (!this._lastRenderedSeries || !e.isFromClick) {
                return;
            }

            const selectedPeople: string[] = [];

            // Look up all the selected team members via the indices that echarts provides.
            for (const sel of e.selected) {
                this._lastDataIndices = sel.dataIndex;
                for (const dataIndex of sel.dataIndex) {
                    selectedPeople.push((this._lastRenderedSeries as any).data[dataIndex][0]);
                }
            }

            // Let the other's know and rejoice, we have a new selection!
            this.selectionChanged.emit(selectedPeople);
        });

        // Apply the initial configuration.
        this.applyHeatmapConfig();
    }

    /**
     * Applies all the initial, static configuration to the charts instance.
     */
    private applyHeatmapConfig(): void {
        this._chart?.setOption({
            // Hover tooltip.
            tooltip: {
                textStyle: {
                    fontFamily: "IBM Plex Sans"
                }
            },
            // Skill labels.
            yAxis: {
                type: "category",
                data: DataUtils.SKILL_LIST.map(DataUtils.SKILL_FORMATTER),
                axisLabel: {
                    interval: 0,
                    fontSize: 11,
                    fontFamily: "IBM Plex Sans"
                },
                axisTick: {
                    show: false
                },
                axisLine: {
                    show: false // It's ugly.
                },
                triggerEvent: true, // This enforces that we can implement the sorting behavior.
            },
            // Participant labels.
            xAxis: {
                type: "category",
                axisLabel: {
                    interval: 0,
                    fontSize: 11,
                    rotate: 90,
                    fontFamily: "IBM Plex Sans",
                    color: "#000"
                },
                axisTick: {
                    show: false
                },
                axisLine: {
                    show: false // Still ugly.
                }
            },
            // Make sure this fits neatly in the layout with some space for the color map and labels.
            // Also, having a static grid like that prevents it from freaking out when the map re-sorts.
            // (containLabel does provoke layout changes on re-sort)
            grid: {
                right: "6%",
                left: "9%",
                top: "3px",
                height: "70%",
            },
            // This is the color map on the right hand side. It's just a nice version of a legend, that also allows
            // to change which boxes get colors.
            visualMap: [{
                top: 0,
                right: 0,
                dimension: 2, // Which index of the data to look at (which will be formatted [string, string, number]).
                calculable: true,
                min: 1,
                max: 10,
                hoverLink: false,
                textStyle: {
                    fontFamily: "IBM Plex Sans"
                },
                inRange: {
                    color: [ // Stole this color scheme from the examples 'cause it's nice.
                        "#313695",
                        "#4575b4",
                        "#74add1",
                        "#abd9e9",
                        "#e0f3f8",
                        "#ffffbf",
                        "#fee090",
                        "#fdae61",
                        "#f46d43",
                        "#d73027",
                        "#a50026"
                    ]
                },
                outOfRange: {
                    color: ["white"],
                    symbolSize: 0
                }
            }],
            axisLabel: {
                show: true
            },
            animation: false
        });
    }

    /**
     * Creates a copy of the raw data set that is sorted by the selected skill.
     * @returns {RawDataSet} The sorted copy.
     */
    private sortedDataSet(): RawDataSet {
        if (!this.dataSet) {
            return []; // No data will get translated to empty data set.
        }

        return [...this.dataSet].sort((a: RawDataPoint, b: RawDataPoint) => a[this._sortCriterion] - b[this._sortCriterion]);
    }

    /**
     * Removes unnecessary attributes from all available data points,
     * so we have them neat and tidy for further processing by echarts.
     * @param rawDataSet {RawDataSet} The raw data set.
     * @returns {HeatmapDataSet} The relevant data for display.
     */
    private cleanDataSet(rawDataSet: RawDataSet): HeatmapDataSet {
        return rawDataSet.map((el: RawDataPoint) => {
            const copy: DataPoint = {...el} as any;
            delete (copy as any)["timestamp"];
            delete (copy as any)["alias"];
            delete (copy as any)["selfDescription"];
            return {dataPoint: copy, alias: el.alias};
        });
    }

    /**
     * Creates the basic series options for the echarts instance.
     * @returns {HeatmapSeriesOption} The series.
     */
    private buildSeries(data: HeatmapDataSet): HeatmapSeriesOption {
        return {
            // Styling the boxes.
            itemStyle: {
                borderWidth: 1, // This is responsible for the gap between boxes.
                borderType: "solid",
                borderColor: "#ffffff",
            },
            label: {
                show: true
            },
            emphasis: {
                itemStyle: {
                    shadowBlur: 10,
                    shadowColor: "rgba(0, 0, 0, 0.5)"
                }
            },
            // Add selection behavior, which is disabled by default.
            select: {
                disabled: false,
                itemStyle: {
                    borderColor: "#000",
                    borderWidth: 2,
                    shadowColor: "rgba(0, 0, 0, 0.25)",
                    shadowBlur: 10,
                    shadowOffsetX: 0,
                    shadowOffsetY: 0
                }
            },
            // Make it, so we can select multiple people at once, for group forming.
            selectedMode: "multiple",
            name: "Skill Level",
            type: "heatmap",
            // Create the data points as the heatmap wants it: [string, string, number]
            data: data.map((dp: any) => { // TODO: Refactor. Clean up.
                const result: any[] = [];
                for (const key of Object.keys(dp.dataPoint)) {
                    const res = [];
                    res.push(dp.alias);
                    res.push(DataUtils.SKILL_FORMATTER(key));
                    res.push(dp.dataPoint[key]);
                    result.push(res);
                }
                return result;
            }).flatMap((a: any) => a)
        };
    }

    /**
     * Unselects all selected participants.
     */
    private clearSelection() {
        this._chart?.dispatchAction({
            type: "unselect", dataIndex: this._lastDataIndices
        });
    }

    /**
     * Restores the previous selection after they've been temporarily unselected.
     * This is necessary when re-sorting because the indices of selected entries change,
     * which is how echarts internally represents the selections, apparently.
     */
    private restoreSelection(): void {
        const data: [string, string, number][] = this._lastRenderedSeries?.data as any;
        const selectionIndices = this.selection.map(name => data.findIndex(dp => dp[0] === name));

        this._chart?.dispatchAction({
            type: "select", dataIndex: selectionIndices
        });

        this._lastDataIndices = selectionIndices;
    }

    /**
     * Handle any updates of the data, triggering a re-rendering of the heatmap.
     */
    private dataUpdated(): void {
        // No data, no rendering.
        if (this.dataSet == null) {
            return;
        }

        // Pre-process the data set.
        const sortedDataSet = this.sortedDataSet();
        const cleanedDataSet = this.cleanDataSet(sortedDataSet);

        // Create the scaffolding of the echarts series.
        const series = this.buildSeries(cleanedDataSet);

        // Keep track of the rendered series, so we can adjust selection.
        this._lastRenderedSeries = series;

        // Temporarily remove selection, because echarts internally represents it using
        // indices and those are probably about to change.
        this.clearSelection();

        // Paint the chart.
        this._chart?.setOption({
            xAxis: {
                // This changes with sorting, so we need to apply it here.
                data: cleanedDataSet.map(i => i.alias)
            },
            yAxis: {
                // Highlight the label of the sort criterion.
                data: DataUtils.SKILL_LIST.map(v => ({
                    value: DataUtils.SKILL_FORMATTER(v),
                    textStyle: {
                        color: v === this._sortCriterion ? "#313695" : "#000",
                        fontWeight: v === this._sortCriterion ? 600 : 400,
                        fontSize: v === this._sortCriterion ? 13 : 11,
                    }
                }))
            },
            series
        });

        // Restore previous selection based on new indices.
        this.restoreSelection();
    }
}
