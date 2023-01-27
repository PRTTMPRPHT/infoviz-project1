import {RawDataSet, SkillSet} from "./interfaces/data-point.interface";

/**
 * Contains utility methods related to querying of data.
 */
export namespace QueryUtils {
    /**
     * Query the static dataset from the web server.
     * @returns {Promise<RawDataSet>} The dataset.
     */
    export async function obtainDataSet(): Promise<RawDataSet> {
        const res = await fetch("/assets/data.json");
        return (await res.json()) as unknown as RawDataSet;
    }
}

/**
 * Contains utility methods related to the transformation of data.
 */
export namespace DataUtils {
    // Map the JSON attributes to human-readable names.
    // TODO: In any self-respecting application, this would give i18n keys and translate it in the formatter...
    export const NAME_MAPPINGS: {
        [identifier in keyof SkillSet]: string
    } = {
        skillInfoViz: "Visualization",
        skillArt: "Art",
        skillCollaboration: "Collab",
        skillCommunication: "Communication",
        skillComputer: "Computers",
        skillGraphics: "Graphics",
        skillHCI: "HCI",
        skillMaths: "Maths",
        skillProgramming: "Programming",
        skillRepos: "Repositories",
        skillStats: "Statistics",
        skillUX: "UX"
    };

    // The inverse map of the human-readable names to JSON attribute names.
    // TODO: Again this could be avoided through the usage of an i18n library
    export const REVERSE_NAME_MAPPINGS: {
        [identifier: string]: keyof SkillSet
    } = Object.entries(NAME_MAPPINGS)
        .map((entry) => ({[entry[1]]: entry[0]}))
        .reduce((prev, curr) => {
            return {...prev, ...curr};
        }, {} as any);

    /**
     * Performs the mapping from a JSON-attribute name to a human-readable name.
     * @param name {string} The name to map.
     */
    export const SKILL_FORMATTER = (name: string) => NAME_MAPPINGS[name as keyof SkillSet] as string;

    /**
     * Performs the mapping from a human-readable name to a JSON-attribute name.
     * @param name {string} The name to map.
     */
    export const SKILL_UNFORMATTER = (name: string) => REVERSE_NAME_MAPPINGS[name] as keyof SkillSet;

    // The list of relevant JSON attributes.
    export const SKILL_LIST: (keyof SkillSet)[] = [
        "skillUX",
        "skillArt",
        "skillCollaboration",
        "skillCommunication",
        "skillHCI",
        "skillInfoViz",
        "skillStats",
        "skillMaths",
        "skillComputer",
        "skillGraphics",
        "skillRepos",
        "skillProgramming",
    ];
}
