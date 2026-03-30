export const APP_VERSION = "2.1.0";

export function getInitialState() {
    return {
        nom: "Nouveau Héros", race: "Humain", classe: "Barbare", niveau: 1,
        hp_cur: 10, hp_max: 10, hd_cur: 1, maxWeight: 14, ac: 10, speed: 9,
        stats: { Force: 10, Dextérité: 10, Constitution: 10, Intelligence: 10, Sagesse: 10, Charisme: 10 },
        m_saves: [], m_skills: {}, attaques: [], capacites: [], inventaire: [], spells: [],
        spellSlots: { 
            1: { max: 0, used: 0 }, 2: { max: 0, used: 0 }, 3: { max: 0, used: 0 },
            4: { max: 0, used: 0 }, 5: { max: 0, used: 0 }, 6: { max: 0, used: 0 },
            7: { max: 0, used: 0 }, 8: { max: 0, used: 0 }, 9: { max: 0, used: 0 } 
        },
        spellMiscBonus: 0,
        inspiration: false, blessures: 0, money: { pp: 0, po: 0, pa: 0, pc: 0 },
        languages: [], tools: [], portrait: "", openedDescs: [],
        notes: {
            currentSessionId: Date.now(),
            sessions: [{ id: Date.now(), title: "Session Initiale", content: "" }]
        },
        mountData: {
            name: "",
            image: "",
            hp_cur: 19,
            hp_max: 19,
            ac: 11,
            speed: "18m",
            fly_speed: "0m",
            str: 18, dex: 12, con: 15, int: 2, wis: 12, cha: 7,
            inventoryLeft: [],
            inventoryRight: [],
            attacks: [],
            skills: []
        }
    };
}

// On initialise le state global
window.state = getInitialState();
window.currentCharacterId = null;
window.isSaving = false;