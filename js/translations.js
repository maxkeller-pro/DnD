// translations.js

/**
 * Convertit une vitesse de mètres en feet (ou l'inverse)
 */
export function convertSpeed(metersValue, targetLang = 'FR') {
    const meters = parseFloat(metersValue) || 0;
    if (targetLang.toUpperCase() === 'EN') {
        // Règle D&D 5e: 1.5m = 5ft (ex: 9m -> 30ft, 12m -> 40ft)
        const feet = Math.round((meters / 1.5) * 5);
        return { val: feet, unit: 'ft' };
    }
    return { val: meters, unit: 'm' };
}

/**
 * Convertit une saisie en feet vers des mètres pour le stockage dans le state
 */
export function convertFeetToMeters(feetValue) {
    const feet = parseFloat(feetValue) || 0;
    return (feet / 5) * 1.5;
}

// 2. Dictionnaire des UI pour extension facile
export const UI_TRANSLATIONS = {
    FR: {
        race: "Race",
        class: "Classe",
        subclass: "Sous-classe",
        level: "Niveau",
        speed: "Vitesse",
        speedUnit: "m",
        ac: "CA",
        mastery: "Maîtrise",
        perception: "Perception",
        initiative: "Initiative",
        hp: "Points de Vie",
        tempHp: "PV Temp",
        hitDice: "Dés de Vie",
        inspiration: "Inspiration",
        shortRest: "Repos Court",
        longRest: "Repos Long",
        stats: "Statistiques",
        purse: "Bourse",
        saves: "Sauvegardes",
        skills: "Compétences",
        actionsTab: "⚔️ Actions & Capacités",
        spellsTab: "✨ Grimoire Magique",
        myCharacters: "Mes Personnages",
        chooseDestiny: "Choisissez votre destin",
        newCharacters: "+ Nouveau Personnage",
        disconnection: "Déconnexion",
        noPicture: "Aucune image",
        mountPic: "Fiche monture",
        backpack: "Sac à dos",
        handleBeastForms: "🐾 Gérer mes Formes Sauvages",
        switchChar: "Changer de personnages",
        race: "Race",
        raceHuman: "Humain",
        raceElf: "Elfe",
        raceDwarf: "Nain",
        raceHalfling: "Halfelin",
        raceDragonborn: "Drakéïde",
        raceGnome: "Gnome",
        raceHalfElf: "Demi-Elfe",
        raceHalfOrc: "Demi-Orque",
        raceTiefling: "Tieffelin",
        raceGoliath: "Goliath",
        raceAasimar: "Aasimar",
        raceYuanTi: "Yuan-ti",
        class: "Classe",
        classArtificer: "Artificier",
        classBarbarian: "Barbare",
        classBard: "Barde",
        classCleric: "Clerc",
        classDruid: "Druide",
        classSorcerer: "Ensorceleur",
        classFighter: "Guerrier",
        classWizard: "Magicien",
        classMonk: "Moine",
        classWarlock: "Occultiste",
        classPaladin: "Paladin",
        classRanger: "Rôdeur",
        classRogue: "Roublard",
        deathThreshold: "Seuil de Mort",
        stable: "Stable",
        manageBastion: "🏰 Gérer mon Bastion",
    },
    EN: {
        race: "Race",
        class: "Class",
        subclass: "Subclass",
        level: "Level",
        speed: "Speed",
        speedUnit: "ft",
        ac: "AC",
        mastery: "Proficiency",
        perception: "Perception",
        initiative: "Initiative",
        hp: "Hit Points",
        tempHp: "Temp HP",
        hitDice: "Hit Dice",
        inspiration: "Inspiration",
        shortRest: "Short Rest",
        longRest: "Long Rest",
        stats: "Stats",
        purse: "Purse",
        saves: "Saving Throws",
        skills: "Skills",
        actionsTab: "⚔️ Actions & Features",
        spellsTab: "✨ Spellbook",
        myCharacters: "My Characters",
        chooseDestiny: "Choose your destiny",
        newCharacters: "+ New Character",
        disconnection: "Disconnection",
        noPicture: "No Picture",
        mountPic: "Mount specification",
        backpack: "Backpack",
        handleBeastForms: "🐾 Handle my beast forms",
        switchChar: "Switch Characters",
        race: "Race",
        raceHuman: "Human",
        raceElf: "Elf",
        raceDwarf: "Dwarf",
        raceHalfling: "Halfling",
        raceDragonborn: "Dragonborn",
        raceGnome: "Gnome",
        raceHalfElf: "Half-Elf",
        raceHalfOrc: "Half-Orc",
        raceTiefling: "Tiefling",
        raceGoliath: "Goliath",
        raceAasimar: "Aasimar",
        raceYuanTi: "Yuan-ti",
        class: "Class",
        classArtificer: "Artificer",
        classBarbarian: "Barbarian",
        classBard: "Bard",
        classCleric: "Cleric",
        classDruid: "Druid",
        classSorcerer: "Sorcerer",
        classFighter: "Fighter",
        classWizard: "Wizard",
        classMonk: "Monk",
        classWarlock: "Warlock",
        classPaladin: "Paladin",
        classRanger: "Ranger",
        classRogue: "Rogue",
        deathThreshold: "Death Threshold",
        stable: "Stable",
        manageBastion: "🏰 Manage Bastion"
    }
};
 

// Dictionnaire centralisé des traductions de sous-classes
export const SUBCLASSES_TRANSLATIONS = {
    // Barbare
    "Voie du Berserker": "Path of the Berserker",
    "Voie du Arbre-Monde": "Path of the World Tree",
    "Voie du Gardien des Espurs": "Path of the Wild Heart",
    "Voie du Wild Magic": "Path of the Zealot",

    // Barde
    "Collège du Savoir": "College of Lore",
    "Collège de la Danse": "College of Dance",
    "Collège de la Séduction": "College of Glamour",
    "Collège de la Valor": "College of Valor",

    // Clerc
    "Domaine de la Vie": "Life Domain",
    "Domaine de la Lumière": "Light Domain",
    "Domaine de la Nature": "War Domain",
    "Domaine de la Ombre": "Trickery Domain",

    // Druide
    "Cercle de la Terre": "Circle of the Land",
    "Cercle de la Lune": "Circle of the Moon",
    "Cercle des Étoiles": "Circle of the Stars",
    "Cercle du Scribe": "Circle of the Sea",
    "Cercle des titans": "Circle of the titans",

    // Ensorceleur
    "Origine Sauvage": "Wild Magic Sorcery",
    "Lignée Draconique": "Draconic Sorcery",
    "Magie des Tempêtes": "Clockwork Sorcery",
    "Esprit Aberrant": "Aberrant Sorcery",

    // Guerrier
    "Champion": "Champion",
    "Maître d'Armes": "Battle Master",
    "Chevalier Occulte": "Eldritch Knight",
    "Psychique": "Psi Warrior",

    // Magicien
    "École d'Évocation": "Evoker",
    "École d me l'Illusion": "Illusionist",
    "École de Abjuration": "Abjurer",
    "École de Divination": "Diviner",

    // Moine
    "Voie de la Main Ouverte": "Warrior of the Open Hand",
    "Voie de l'Ombre": "Warrior of Shadow",
    "Voie des Éléments": "Warrior of the Elements",
    "Voie du Mercenaire": "Warrior of Mercy",

    // Paladin
    "Serment de Dévotion": "Oath of Devotion",
    "Serment des Anciens": "Oath of the Ancients",
    "Serment de Vengeance": "Oath of Vengeance",
    "Serment de Gloire": "Oath of Glory",

    // Rôdeur
    "Chasseur": "Hunter",
    "Maître des Bêtes": "Beast Master",
    "Traqueur Sombre": "Gloom Stalker",
    "Vagabond Féerique": "Fey Wanderer",

    // Roublard
    "Voleur": "Thief",
    "Assassin": "Assassin",
    "Âme acérée": "Soulknife",
    "Arnaqueur arcanique": "Arcane Trickster",

    // Occultiste
    "Le Fiélon": "Fiend Patron",
    "Le Grand Ancien": "Great Old One Patron",
    "La Archifée": "Archfey Patron",
    "Le Céleste": "Celestial Patron"
};

/**
 * Traduit une sous-classe vers la langue cible ('FR' ou 'EN')
 * @param {string} subclassName - Nom actuel de la sous-classe
 * @param {string} targetLang - 'FR' ou 'EN'
 * @returns {string} Le nom traduit
 */
export function translateSubclass(subclassName, targetLang = 'FR') {
    if (!subclassName) return "";

    const cleanName = subclassName.trim();
    const lang = targetLang.toUpperCase();

    if (lang === 'EN') {
        if (SUBCLASSES_TRANSLATIONS[cleanName]) {
            return SUBCLASSES_TRANSLATIONS[cleanName];
        }
    } else if (lang === 'FR') {
        const frEntry = Object.entries(SUBCLASSES_TRANSLATIONS).find(
            ([fr, en]) => en.toLowerCase() === cleanName.toLowerCase()
        );
        if (frEntry) {
            return frEntry[0];
        }
    }

    return subclassName;
}