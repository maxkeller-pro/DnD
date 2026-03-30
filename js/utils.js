export const SKILLS_LIST = [
    { n: "Athlétisme", s: "Force" }, { n: "Acrobaties", s: "Dextérité" }, { n: "Escamotage", s: "Dextérité" }, { n: "Discrétion", s: "Dextérité" },
    { n: "Arcanes", s: "Intelligence" }, { n: "Histoire", s: "Intelligence" }, { n: "Investigation", s: "Intelligence" }, { n: "Nature", s: "Intelligence" }, { n: "Religion", s: "Intelligence" },
    { n: "Dressage", s: "Sagesse" }, { n: "Médecine", s: "Sagesse" }, { n: "Perception", s: "Sagesse" }, { n: "Perspicacité", s: "Sagesse" }, { n: "Survie", s: "Sagesse" },
    { n: "Tromperie", s: "Charisme" }, { n: "Intimidation", s: "Charisme" }, { n: "Performance", s: "Charisme" }, { n: "Persuasion", s: "Charisme" }
];

export const statsOrder = ["Force", "Dextérité", "Constitution", "Intelligence", "Sagesse", "Charisme"];

export function getMod(v) { return Math.floor(((v || 10) - 10) / 2); }
export function getProf() { return Math.floor(1 + Math.ceil((window.state?.niveau || 1) / 4)); }