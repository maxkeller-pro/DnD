export function createWildShapeTemplate({
    id = Date.now().toString(),
    nom = "Nouvelle Bête",
    cr = "1/4",
    str = 10,
    dex = 10,
    con = 10,
    ac = 10,
    speed = "9m",
    senses = "Perception passive 10",
    skills = {},
    saves = {},
    hpMult = 4,
    traits = [],
    attacks = []
}) {
    return {
        id, nom, cr, str, dex, con, ac, speed, senses, skills, saves, hpMult, traits, attacks
    };
}

/**
 * Règle D&D 2024 : Combine les compétences et sauvegardes du Druide et de la Bête.
 * Utilise la valeur/modificateur le plus élevé.
 */
export function getEffectiveSkillsAndSaves() {
    const state = window.state;
    if (!state || !state.isTransformed || !state.activeShape) {
        return { 
            skills: state?.m_skills || {}, 
            saves: state?.m_saves || [] 
        };
    }

    const beast = state.activeShape;
    
    // 1. COMPÉTENCES (Prend le modificateur / niveau le plus élevé)
    const effectiveSkills = { ...(state.m_skills || {}) };
    if (beast.skills) {
        Object.entries(beast.skills).forEach(([skill, beastBonus]) => {
            const druidLevel = effectiveSkills[skill] || 0;
            // Si la bête a un bonus plus fort que la maîtrise du druide, on applique la valeur de la bête
            effectiveSkills[skill] = Math.max(druidLevel, beastBonus);
        });
    }

    // 2. JETS DE SAUVEGARDE (Inclus les maîtrises du Druide + de la Bête)
    let effectiveSaves = [...(state.m_saves || [])];
    if (beast.saves) {
        Object.keys(beast.saves).forEach(saveStat => {
            if (!effectiveSaves.includes(saveStat)) {
                effectiveSaves.push(saveStat);
            }
        });
    }

    return { skills: effectiveSkills, saves: effectiveSaves };
}