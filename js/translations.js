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