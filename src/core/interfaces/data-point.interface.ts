/**
 * Represents the self-rated skills of a potential group member,
 * rated on a scale of one to ten.
 */
export interface SkillSet {
    skillInfoViz: number;
    skillStats: number;
    skillMaths: number;
    skillArt: number;
    skillComputer: number;
    skillProgramming: number;
    skillGraphics: number;
    skillHCI: number;
    skillUX: number;
    skillCommunication: number;
    skillCollaboration: number;
    skillRepos: number;
}

/**
 * Data point containing all the relevant information to display a person in charts.
 */
export interface DataPoint extends SkillSet  {
    alias: string;
}

/**
 * Data point as it is present in the raw JSON file.
 */
export interface RawDataPoint extends DataPoint {
    timestamp: string;
    selfDescription: string;
}

/**
 * The entire data set as it is present in the JSON file.
 */
export type RawDataSet = RawDataPoint[];

/**
 * The data set with a reduced set of attributes.
 */
export type DataSet = DataPoint[];
