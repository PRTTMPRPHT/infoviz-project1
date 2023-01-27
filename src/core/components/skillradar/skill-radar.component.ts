import {Component, ElementRef, Input, OnChanges, OnInit, SimpleChanges} from "@angular/core";
import {Nullable} from "../../interfaces/generic.interface";
import {RawDataPoint, RawDataSet, SkillSet} from "../../interfaces/data-point.interface";
import * as echarts from "echarts";
import {EChartsType, RadarComponentOption, RadarSeriesOption} from "echarts";
import {DataUtils} from "../../utils";

// TODO: This should be imported from echarts, but they don't export it. Compiler freaks out if we import the specific file.
type RadarSeriesDataItemOption = any;

/**
 * This component is a radar chart that can display one participant's skills from the {@link RawDataSet},
 * as well as up to four compiled teams.
 */
@Component({
    selector: "viz-skill-radar",
    templateUrl: "./skill-radar.component.html",
    styleUrls: ["./skill-radar.component.scss"]
})
export class SkillRadarComponent implements OnInit, OnChanges {
    // ### Constants. ###
    // Colors to be used for the compiled groups.
    readonly MAIN_SERIES_COLORS = [
        "#f46d43", // Group 1.
        "#398d27", // Group 2.
        "#d0c81a", // Group 3.
        "#6f2b98", // Group 4. Limit.
    ];

    // ### Inputs. ###
    // The raw data set as it is in the JSON file. We do all the necessary transformations in here.
    @Input() dataSet: Nullable<RawDataSet> = null;
    // The team members that are currently present in groups, represented by pseudonym.
    @Input() groups: string[][] = [[]];
    // Participant that is currently being hovered over on the heatmap, so we can add them.
    @Input() hoverParticipant: Nullable<string> = null;
    // The index of the group that is currently "selected". It will receive additional labels.
    @Input() selectedGroup: number = 0;

    // ### Chart rendering data. ###
    // The instance of echarts that we are managing here.
    private _chart: Nullable<EChartsType> = null;

    constructor(private elementRef: ElementRef) {
    }

    public ngOnInit(): void {
        // Create charts instance.
        this.initChart();

        // If we already have data, just have a go at it immediately.
        if (this.dataSet) {
            this.dataUpdated();
        }
    }

    public ngOnChanges(changes: SimpleChanges): void {
        // This long check is just out of courtesy in case this would ever be expanded and have attributes
        // that don't trigger a re-rendering. The important bit is: We need a dataset to render.
        if ((changes["dataSet"] || changes["groups"] || changes["selectedGroup"] || changes["hoverParticipant"]) && this.dataSet) {
            this.dataUpdated();
        }
    }

    /**
     * Initializes the {@link EChartsType} instance.
     */
    private initChart(): void {
        // Instantiate echarts with the SVG renderer, so we have a nice zoom.
        this._chart = echarts.init(this.elementRef.nativeElement, undefined, {
            width: 500,
            height: 400,
            renderer: "svg"
        }); // TODO: This is a bit lazy as-is, in the real world we'd probably call dispose() in ngOnDestroy to be safe.

        // Apply initial configuration.
        this.applyRadarChartConfig();
    }

    /**
     * Applies all the initial, static configuration to the charts instance.
     */
    private applyRadarChartConfig(): void {
        this._chart?.setOption({
            tooltip: {
                textStyle: {
                    fontFamily: "IBM Plex Sans" // Ain't no better font in the world... Okay maybe Circular but that costs.
                }
            },
            legend: {
                data: [this.mainSeriesName(0)],
                type: "scroll" // Yeah, those names are long... Let's add a scrollable legend.
            },
            radar: {
                axisName: {
                    fontSize: 11,
                    fontFamily: "IBM Plex Sans",
                    color: "black"
                },
                radius: "70%",
                // Tell the radar chart which dimensions we are comparing.
                indicator: DataUtils.SKILL_LIST.map(s => ({
                    name: DataUtils.SKILL_FORMATTER(s), max: 10
                })),
            }
        } as Partial<RadarComponentOption>);
    }

    /**
     * Removes unnecessary attributes from all available data points,
     * so we have them neat and tidy for further processing by echarts.
     * @param rawDataSet {RawDataSet} The raw data set.
     * @returns {SkillSet[]} Only the skills.
     */
    private cleanDataSet(rawDataSet: RawDataSet): SkillSet[] {
        return rawDataSet.map((el: RawDataPoint) => {
            const copy: SkillSet = {...el} as any;
            delete (copy as any)["timestamp"];
            delete (copy as any)["alias"];
            delete (copy as any)["selfDescription"];
            return copy;
        });
    }

    /**
     * Creates the upper bounds for all skills within a group of team members.
     * @param skillSets {SkillSet[]} The skills of the group (each {@link SkillSet} represents one member).
     * @returns {SkillSet} The maximum skills of the given group.
     */
    private createMaxSkillSet(skillSets: SkillSet[]): SkillSet {
        return skillSets.reduce((prev, curr) => {
            const newSkillSet: SkillSet = {...prev};
            for (const k of Object.keys(newSkillSet)) {
                const key = k as keyof SkillSet; // Kindly shut up, TypeScript. (I still love you though.)
                newSkillSet[key] = Math.max(curr[key], newSkillSet[key]);
            }
            return newSkillSet;
        }, {
            skillProgramming: 0,
            skillArt: 0,
            skillCollaboration: 0,
            skillCommunication: 0,
            skillComputer: 0,
            skillGraphics: 0,
            skillUX: 0,
            skillHCI: 0,
            skillRepos: 0,
            skillInfoViz: 0,
            skillMaths: 0,
            skillStats: 0
        } as SkillSet);
    }

    /**
     * Creates the basic series options for the echarts instance.
     * @returns {RadarSeriesOption} The series.
     */
    private buildMainSeries(): RadarSeriesOption {
        return {
            name: "Skill Profile",
            type: "radar",
            data: [],
            areaStyle: {
                opacity: 0.1 // There will be a lot of overlapping.
            },
            animation: false // It's just too much for this one. If only I could do this for individual data sets...
        };
    }

    /**
     * Prepares the data set for the hovered-over participant that is displayed temporarily
     * @param skillSet {SkillSet} The skills of the given participant.
     * @param name {string} The participant's pseudonym.
     * @returns {RadarSeriesDataItemOption} The data that is to be rendered for the hovered-over participant.
     */
    private buildHoverParticipantData(skillSet: SkillSet, name: string): RadarSeriesDataItemOption {
        return {
            value: DataUtils.SKILL_LIST.map(skill => skillSet[skill]),
            name,
            itemStyle: {
                color: "#313695"
            }
        };
    }

    /**
     * Formats the name of a given group dataset.
     * @param index {number} The index of the group within the supplied array of max. 4 groups.
     * @returns {string} The formatted group name.
     */
    private mainSeriesName(index: number): string {
        return `Group ${index + 1} (max. skill levels)`;
    }

    /**
     * Builds the echarts data for a given group.
     * @param selectedPeople {string[]} The list of pseudonyms to pull the data for.
     * @param groupIndex {number} The index of the group within the supplied array of max. 4 groups.
     * @param selected {boolean} Is the group selected with priority right now?
     * @returns {RadarSeriesDataItemOption} The echarts data for the given group of people.
     */
    private buildGroupData(selectedPeople: string[], groupIndex: number, selected: boolean): RadarSeriesDataItemOption {
        // Extract the relevant raw data points.
        const relevantDataPoints: RawDataSet = selectedPeople.map(p => this.dataSet?.find(dp => dp.alias === p)) as any;
        // Clean the data set to only contain skills.
        const cleanedDataSet = this.cleanDataSet(relevantDataPoints);
        // Calculate the upper bounds of the skills.
        const maxSkillSet = this.createMaxSkillSet(cleanedDataSet);

        // Create base echarts data for this group.
        const data: RadarSeriesDataItemOption = {
            value: DataUtils.SKILL_LIST.map(skill => maxSkillSet[skill]),
            name: this.mainSeriesName(groupIndex),
            itemStyle: {
                color: this.MAIN_SERIES_COLORS[groupIndex]
            }
        };

        // Add additional label if the group is selected with priority.
        if (selected) {
            data.label = {
                show: true,
                formatter: (params: any) => params.value
            };
        }

        return data;
    }

    /**
     * Extract the skills of the hovered-over participant.
     * @param rawDataSet {RawDataSet} The entire data set in its raw form.
     * @param name {string} The pseudonym to look up.
     * @returns {SkillSet} The participant's skill set.
     */
    private getHoverParticipantSkills(rawDataSet: RawDataSet, name: string): SkillSet {
        // We'll just assume that we will find the participant in the data set,
        // since the inputs stem from it.
        const raw: RawDataPoint = rawDataSet.find(dp => dp.alias === name) as RawDataPoint;

        // Copy and clean the participant's attributes.
        const copy: SkillSet = {...raw};
        delete (copy as any)["timestamp"];
        delete (copy as any)["alias"];
        delete (copy as any)["selfDescription"];

        return copy;
    }

    /**
     * Handle any updates of the data, triggering a re-rendering of the radar chart.
     */
    private dataUpdated(): void {
        // No data, no rendering.
        if (this.dataSet == null) {
            return;
        }

        // Create the scaffolding of the echarts series.
        const mainSeries = this.buildMainSeries();
        const series = [mainSeries];
        const legendData = [];

        // If the user hovers over a participant in the heatmap, we will have it present in hoverParticipant and
        // want to render an additional shape for that participant.
        if (this.hoverParticipant) {
            // Extract data for participant.
            const skillSet = this.getHoverParticipantSkills(this.dataSet, this.hoverParticipant);
            const hoverSeries = this.buildHoverParticipantData(skillSet, this.hoverParticipant);
            // Append to echarts data as the first item.
            mainSeries.data?.push(hoverSeries);
            legendData.push(this.hoverParticipant);
        }

        // Add all the selected groups.
        for (let i = 0; i < this.groups.length; i++) {
            legendData.push(this.mainSeriesName(i));
            mainSeries.data?.push(this.buildGroupData(this.groups[i], i, this.selectedGroup === i));
        }

        // Let's roll!
        this._chart?.setOption({
            legend: {
                data: legendData
            },
            series
        });
    }
}
