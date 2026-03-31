export const SKILLS_LIST = [
    { n: "Athlétisme", s: "Force" }, { n: "Acrobaties", s: "Dextérité" }, { n: "Escamotage", s: "Dextérité" }, { n: "Discrétion", s: "Dextérité" },
    { n: "Arcanes", s: "Intelligence" }, { n: "Histoire", s: "Intelligence" }, { n: "Investigation", s: "Intelligence" }, { n: "Nature", s: "Intelligence" }, { n: "Religion", s: "Intelligence" },
    { n: "Dressage", s: "Sagesse" }, { n: "Médecine", s: "Sagesse" }, { n: "Perception", s: "Sagesse" }, { n: "Perspicacité", s: "Sagesse" }, { n: "Survie", s: "Sagesse" },
    { n: "Tromperie", s: "Charisme" }, { n: "Intimidation", s: "Charisme" }, { n: "Performance", s: "Charisme" }, { n: "Persuasion", s: "Charisme" }
];

export const statsOrder = ["Force", "Dextérité", "Constitution", "Intelligence", "Sagesse", "Charisme"];

export function getMod(v) { return Math.floor(((v || 10) - 10) / 2); }
export function getProf() { return Math.floor(1 + Math.ceil((window.state?.niveau || 1) / 4)); }

export const CATALOGUE_SURVIE = {
    BUCHE: { 
        nom: "Bûche", 
        desc: "Pour un bon feu", 
        cat: "MATERIEL_SURVIE", 
        taille: 4, 
        valeur: 0.01 
    },
    CORDE: { 
        nom: "Corde robuste", 
        desc: "30m de longueur", 
        cat: "MATERIEL_SURVIE", 
        taille: 4, 
        valeur: 1 
    },
    COUVERTURE: { 
        nom: "Couverture", 
        desc: "Couverture chaude pour 1 personne (Avantage aux JS contre le froid)", 
        cat: "MATERIEL_SURVIE", 
        taille: 4, 
        valeur: 0.5 
    },
    GOURDE: { 
        nom: "Gourde", 
        desc: "Contenance 3L", 
        cat: "MATERIEL_SURVIE", 
        taille: 2, 
        valeur: 0.05 
    },
    HACHETTE: { 
        nom: "Hachette", 
        desc: "Pour couper du bois", 
        cat: "MATERIEL_SURVIE", 
        taille: 2, 
        valeur: 3 
    },
    KIT_SOIN: { 
        nom: "Kit de soin", 
        desc: "Pour stabiliser les blessés sans faire de test de Médecine", 
        cat: "MATERIEL_SURVIE", 
        taille: 2, 
        valeur: 10 
    },
    LAMPE: { 
        nom: "Lampe à huile", 
        desc: "Lumière vive sur 4,5m, lumière faible sur 9m de plus, pendant 6h", 
        cat: "MATERIEL_SURVIE", 
        taille: 2, 
        valeur: 0.5 
    },
    PEAU: { 
        nom: "Peau", 
        desc: "Peau imperméable protégeant de l'humidité", 
        cat: "MATERIEL_SURVIE", 
        taille: 4, 
        valeur: 2 
    },
    PETIT_BOIS: { 
        nom: "Petit bois", 
        desc: "Pour démarrer quelques bons feux de camp", 
        cat: "MATERIEL_SURVIE", 
        taille: 1, 
        valeur: 0.01 
    },
    PIERRE_A_FEU: { 
        nom: "Pierre à feu", 
        desc: "Besoin d'une étincelle par ici ?", 
        cat: "MATERIEL_SURVIE", 
        taille: 1, 
        valeur: 0.5 
    },
    RATION: { 
        nom: "Ration", 
        desc: "2/jour pour être en forme", 
        cat: "MATERIEL_SURVIE", 
        taille: 2, 
        valeur: 0.2 
    },
    TORCHE: { 
        nom: "Torche", 
        desc: "Lumière vive sur 6m, lumière faible sur 6m de plus, pendant 1h", 
        cat: "MATERIEL_SURVIE", 
        taille: 1, 
        valeur: 0.03 
    }
};

export const BAG_TYPES = {
    SACOCHE: { 
        name: "Sacoche", 
        main: 8, 
        img: "images/sacoche.png",
        survivalLimits: {
            GOURDE: 1,
            RATION: 4,
            PEAU: 1,
            COUVERTURE: 1
        }
    },
    CLASSIQUE: { 
        name: "Sac Standard", 
        main: 14, 
        img: "images/sac-standard.png",
        survivalLimits: {
            RATION: 6,
            GOURDE: 2,
            HACHETTE: 1,
            TORCHE: 3,
            PIERRE_A_FEU: 1,
            KIT_SOIN: 1,
            COUVERTURE: 1,
            PEAU: 1
        }
    },
    GRAND: { 
        name: "Grand Sac", 
        main: 22, 
        img: "images/sac-grand.png",
        survivalLimits: {
            RATION: 10,
            GOURDE: 3,
            HACHETTE: 1,
            TORCHE: 6,
            PIERRE_A_FEU: 1,
            KIT_SOIN: 2,
            COUVERTURE: 2,
            PEAU: 2,
            CORDE: 1,
            BUCHE: 2
        }
    }
};

// Déduit le montant du porte-monnaie (en partant des petites pièces vers les grandes)
export const subtractMoney = (money, costInPO) => {
    let totalPC = getTotalFortuneInPC(money);
    let costInPC = costInPO * 100;

    if (totalPC < costInPC) return false;

    totalPC -= costInPC;
    
    // On redistribue dans les compartiments
    money.pp = Math.floor(totalPC / 1000);
    totalPC %= 1000;
    money.po = Math.floor(totalPC / 100);
    totalPC %= 100;
    money.pa = Math.floor(totalPC / 10);
    money.pc = totalPC % 10;
    
    return true;
};

// Convertit le porte-monnaie du joueur en Pièces de Cuivre (unité de base)
const getTotalFortuneInPC = (money) => {
    return (parseInt(money.pp) || 0) * 1000 +
           (parseInt(money.po) || 0) * 100 +
           (parseInt(money.pa) || 0) * 10 +
           (parseInt(money.pc) || 0);
};