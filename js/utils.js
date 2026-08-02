export const SKILLS_LIST = [
    { n: "Athlétisme", s: "Force" }, { n: "Acrobaties", s: "Dextérité" }, { n: "Escamotage", s: "Dextérité" }, { n: "Discrétion", s: "Dextérité" },
    { n: "Arcanes", s: "Intelligence" }, { n: "Histoire", s: "Intelligence" }, { n: "Investigation", s: "Intelligence" }, { n: "Nature", s: "Intelligence" }, { n: "Religion", s: "Intelligence" },
    { n: "Dressage", s: "Sagesse" }, { n: "Médecine", s: "Sagesse" }, { n: "Perception", s: "Sagesse" }, { n: "Perspicacité", s: "Sagesse" }, { n: "Survie", s: "Sagesse" },
    { n: "Tromperie", s: "Charisme" }, { n: "Intimidation", s: "Charisme" }, { n: "Performance", s: "Charisme" }, { n: "Persuasion", s: "Charisme" }
];

// Dans js/utils.js
export const SUBCLASSES_BY_CLASS = {
    "Barbare": ["Voie du Berserker", "Voie du Arbre-Monde", "Voie du Gardien des Espurs", "Voie du Wild Magic"],
    "Barde": ["Collège du Savoir", "Collège de la Danse", "Collège de la Séduction", "Collège de la Valor"],
    "Clerc": ["Domaine de la Vie", "Domaine de la Lumière", "Domaine de la Nature", "Domaine de la Ombre"],
    "Druide": ["Cercle de la Terre", "Cercle de la Lune", "Cercle des Étoiles", "Cercle du Scribe", "Cercle des titans"],
    "Ensorceleur": ["Origine Sauvage", "Lignée Draconique", "Magie des Tempêtes", "Esprit Aberrant"],
    "Guerrier": ["Champion", "Maître d'Armes", "Chevalier Occulte", "Psychique"],
    "Magicien": ["École d'Évocation", "École d me l'Illusion", "École de Abjuration", "École de Divination"],
    "Moine": ["Voie de la Main Ouverte", "Voie de l'Ombre", "Voie des Éléments", "Voie du Mercenaire"],
    "Paladin": ["Serment de Dévotion", "Serment des Anciens", "Serment de Vengeance", "Serment de Gloire"],
    "Rôdeur": ["Chasseur", "Maître des Bêtes", "Traqueur Sombre", "Vagabond Féerique"],
    "Roublard": ["Voleur", "Assassin", "Escroc Swashbuckler", "Arnaqueur Magique"],
    "Occultiste": ["Le Fiélon", "Le Grand Ancien", "La Archifée", "Le Céleste"]
};

export const TITAN_SPELLS_BY_LEVEL = {
    3: [
        { 
            nom: "Grandissement/Rétrécissement", 
            niveau: 2, 
            ecole: "Transmutation", 
            temps: "action", 
            portee: "9m", 
            duree: "Concentration, jusqu'à 1 min", 
            prepare: true, 
            isTitanSpell: true,
            description: "Agrandit ou réduit une créature ou un objet à portée. Agrandissement : La taille de la cible augmente d'une catégorie. Elle gagne un avantage aux jets et sauvegardes de Force et ses attaques infligent 1d4 dégâts supplémentaires. Rapetissement : La taille diminue d'une catégorie. Elle subit un désavantage aux jets et sauvegardes de Force et ses attaques infligent 1d4 dégâts de moins."
        },
        { 
            nom: "Thaumaturgie", 
            niveau: 0, 
            ecole: "Transmutation", 
            temps: "action", 
            portee: "9m", 
            duree: "Jusqu'à 1 min", 
            prepare: true, 
            isTitanSpell: true,
            description: "Permet de créer un petit miracle : modifier l'apparence des yeux, rendre la voix 3 fois plus forte (avantage aux jets d'Intimidation), modifier des flammes, ouvrir/fermer une porte non verrouillée, créer un son bref (tonnerre, cris) ou provoquer une secousse inoffensive. Jusqu'à 3 effets simultanés."
        },
        { 
            nom: "Vague tonnante", 
            niveau: 1, 
            ecole: "Évocation", 
            temps: "action", 
            portee: "Soi (cône de 4.5m)", 
            duree: "Instantannée", 
            prepare: true, 
            isTitanSpell: true,
            description: "Déchaîne une vague d'énergie tonitruante dans un cube de 4,50 m de côté depuis vous. Chaque créature dans la zone doit réussir un jet de sauvegarde de Constitution ou subir 2d8 dégâts de tonnerre et être repoussée de 3 m (moitié des dégâts si réussi). Repousse aussi les objets non sécurisés et résonne jusqu'à 90 m."
        }
    ],
    5: [
        { 
            nom: "Peur", 
            niveau: 3, 
            ecole: "Illusion", 
            temps: "action", 
            portee: "Soi (cône de 9m)", 
            duree: "Concentration, jusqu'à 1 min", 
            prepare: true, 
            isTitanSpell: true,
            description: "Chaque créature dans un cône de 9 m doit réussir un JS de Sagesse ou lâcher ce qu'elle tient et subir l'état Effrayé. La cible effrayée doit exécuter l'action Pointe et fuir par le chemin le plus sûr à chaque tour. Si elle termine son tour sans ligne de vue avec vous, elle retente le jet pour dissiper l'effet."
        }
    ],
    7: [
        { 
            nom: "Bouclier de feu", 
            niveau: 4, 
            ecole: "Évocation", 
            temps: "action", 
            portee: "Soi", 
            duree: "10 minutes", 
            prepare: true, 
            isTitanSpell: true,
            description: "Des flammes vous enveloppent (lumière vive 3m / faible 3m). Au choix : bouclier chaud (résistance au froid, inflige 2d8 dégâts de feu aux attaquants au corps-à-corps dans les 1,5m) ou bouclier glacial (résistance au feu, inflige 2d8 dégâts de froid aux attaquants)."
        }
    ],
    9: [
        { 
            nom: "Vague destructrice", 
            niveau: 5, 
            ecole: "Évocation", 
            temps: "action", 
            portee: "Soi (rayon de 9m)", 
            duree: "Instantannée", 
            prepare: true, 
            isTitanSpell: true,
            description: "Une énergie destructrice se propage dans une émanation de 9 m. Chaque créature choisie dans la zone doit réussir un JS de Constitution ou subir 5d6 dégâts de tonnerre + 5d6 dégâts radiants ou nécrotiques (au choix) et tomber À terre. Moitié des dégâts en cas de réussite."
        }
    ]
};

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
        PIERRE_A_FEU: 1,
        HACHETTE: 1,
        RATION: 4,
        PEAU: 1,
        COUVERTURE: 1,
        KIT_SOIN: 1
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
            TORCHE: 1,
            PIERRE_A_FEU: 1,
        PETIT_BOIS: 1,
            KIT_SOIN: 2,
            COUVERTURE: 1,
        CORDE: 1,
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
            TORCHE: 2,
            PIERRE_A_FEU: 1,
        PETIT_BOIS: 2,
            KIT_SOIN: 3,
            COUVERTURE: 2,
            PEAU: 1,
            CORDE: 1,
        LAMPE: 1,
            BUCHE: 1
        }
    }
};

export function getUnlockedTitanSpells(characterLevel) {
    const spells = [];
    
    // Parcourt les paliers (3, 5, 7, 9)
    Object.keys(TITAN_SPELLS_BY_LEVEL).forEach(levelReq => {
        if (characterLevel >= parseInt(levelReq, 10)) {
            spells.push(...TITAN_SPELLS_BY_LEVEL[levelReq]);
        }
    });
    
    return spells;
}

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