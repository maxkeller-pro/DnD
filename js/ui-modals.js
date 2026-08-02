import { renderAll } from './ui-render.js';

/**
 * Ouvre la modale d'édition/création
 * @param {string} type - 'attack', 'spell', 'skill', ou 'item'
 * @param {number} index - L'index dans le tableau ( -1 pour une création)
 */
export function openModal(type, index = -1) {
    document.getElementById('m-type').value = type;
    document.getElementById('m-index').value = index;

    // 1. Visibilité des sections (simplifiée)
    ['m-atk-fields', 'm-spell-fields', 'm-skill-fields', 'm-item-fields'].forEach(id => document.getElementById(id).classList.add('hidden'));

    if (type === 'attack' || type === 'mount-attack') document.getElementById('m-atk-fields').classList.remove('hidden');
    if (type === 'spell') document.getElementById('m-spell-fields').classList.remove('hidden');
    if (type === 'skill' || type === 'mount-skill') document.getElementById('m-skill-fields').classList.remove('hidden');
    if (type === 'item' || type === 'mount-item-left' || type === 'mount-item-right') {
        document.getElementById('m-item-fields').classList.remove('hidden');
    }

    // 2. Mode ÉDITION (index !== -1)
    if (index !== -1) {
        let item;
        
        // --- NOUVELLE LOGIQUE DE RÉCUPÉRATION ---
        if (type === 'attack') item = window.state.attaques[index];
        else if (type === 'mount-attack') item = window.state.mountData.attacks[index];
        
        else if (type === 'skill') item = window.state.capacites[index];
        else if (type === 'mount-skill') item = window.state.mountData.skills[index];
        
        else if (type === 'spell') item = window.state.spells[index];
        
        else if (type === 'item') item = window.state.inventaire[index];
        else if (type === 'mount-item-left') item = window.state.mountData.inventoryLeft[index];
        else if (type === 'mount-item-right') item = window.state.mountData.inventoryRight[index];

        if (!item) return; // Sécurité

        // Remplissage des champs communs
        document.getElementById('m-name').value = item.nom || "";
        document.getElementById('m-desc').value = item.desc || "";

        // Logique spécifique Attaques (Perso OU Monture)
        if (type === 'attack' || type === 'mount-attack') {
            const hasSec = item.hasSecondary || false;
            document.getElementById('m-atk-stat').value = item.stat || "str";
            document.getElementById('m-atk-prof').checked = item.prof || false;
            document.getElementById('m-atk-dice').value = item.dice || "";
            document.getElementById('m-atk-type').value = item.damageType || "";
            document.getElementById('m-atk-misc').value = item.misc || 0;
            document.getElementById('m-atk-has-secondary').checked = hasSec;
            document.getElementById('m-atk-sec-container').classList.toggle('hidden', !hasSec);
            document.getElementById('m-atk-dice2').value = item.dice2 || "";
            document.getElementById('m-atk-type2').value = item.damageType2 || "";
        }

        // Logique spécifique Skills (Perso OU Monture)
        if (type === 'skill' || type === 'mount-skill') {
            const isProf = item.useProf || false;
            document.getElementById('m-skill-use-prof').checked = isProf;
            document.getElementById('m-skill-max').value = isProf ? "" : (item.max || 0);
            document.getElementById('m-skill-max').disabled = isProf;
            document.getElementById('m-skill-reset').value = item.reset || "none";
        }

        // Logique spécifique Spells
        if (type === 'spell') {
            document.getElementById('m-spell-rank').value = item.niveau || 0;
            document.getElementById('m-spell-school').value = item.ecole || 'abjuration';
            document.getElementById('spell-action-type').value = item.temps || 'action';
            document.getElementById('m-spell-range').value = item.portee || '';
            document.getElementById('m-spell-target').value = item.cible || '';
            document.getElementById('m-spell-duration').value = item.duree || '';
            document.getElementById('comp-v').checked = item.composantes?.v || false;
            document.getElementById('comp-s').checked = item.composantes?.s || false;
            document.getElementById('comp-m').checked = item.composantes?.m || false;
        }

        // Logique spécifique Items (Perso OU Monture)
        if (type === 'item' || type === 'mount-item-left' || type === 'mount-item-right') {
            document.getElementById('m-item-weight').value = item.weight || 0;
        }
        
    } else {
        // 3. Mode CRÉATION
        resetAllFields();
    }
    
    document.getElementById('modal-ui').classList.remove('hidden');
}

/**
 * Ferme la modale
 */
export function closeModal() { 
    document.getElementById('modal-ui').classList.add('hidden'); 
}

export function openMountModal() {
    const modal = document.getElementById('mount-modal');
    if (modal) {
        modal.classList.remove('hidden');
        // Optionnel : renderMountContent(); // Si tu as des données spécifiques à charger
    }
}

export function closeMountModal() {
    const modal = document.getElementById('mount-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

/**
 * Gère l'upload de l'image de la monture (conversion en Base64)
 */
export function handleMountImageUpload(input) {
    const file = input.files[0];
    if (!file) return;

    // Limite à 1Mo pour Supabase
    if (file.size > 1000000) { 
        alert("L'image est trop lourde (max 1Mo).");
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        // On sauvegarde dans le state (on initialise mountData si besoin)
        if (!window.state.mountData) window.state.mountData = {};
        window.state.mountData.image = e.target.result;
        
        // Mise à jour visuelle et sauvegarde DB
        renderAll();
    };
    reader.readAsDataURL(file);
}


export function switchTab(t) {
    // 1. On cache/affiche les sections
    const sectionActions = document.getElementById('section-actions');
    const sectionSpells = document.getElementById('section-spells');
    
    if (sectionActions) sectionActions.classList.toggle('hidden', t !== 'actions');
    if (sectionSpells) sectionSpells.classList.toggle('hidden', t !== 'spells');

    // 2. Gestion du Header de Sorts
    const spellHeader = document.getElementById('spell-stats-header');
    if (spellHeader) {
        if (t === 'spells') {
            spellHeader.classList.remove('hidden');
            // On s'assure que la fonction de calcul existe avant de l'appeler
            if (typeof calculateSpellStats === 'function') {
                calculateSpellStats();
            }
        } else {
            spellHeader.classList.add('hidden');
        }
    }

    // 3. Mise à jour visuelle des onglets
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById('tab-' + t);
    if (activeBtn) activeBtn.classList.add('active');
}

export function saveData() {
    const typeEl = document.getElementById('m-type');
    const indexEl = document.getElementById('m-index');
    if (!typeEl || !indexEl) return;

    const type = typeEl.value;
    const index = parseInt(indexEl.value);
    const state = window.state;

    if (!state.mountData) {
        state.mountData = { name: "", image: "", inventoryLeft: [], inventoryRight: [], attacks: [], skills: [] };
    }

    let targetArray = null;
    let data = {
        nom: document.getElementById('m-name')?.value || "",
        desc: document.getElementById('m-desc')?.value || ""
    };

    // --- 1. RÉCUPÉRATION SELON LE TYPE DE MODALE ---
    if (type === 'attack' || type === 'mount-attack') {
        data = {
            ...data,
            stat: document.getElementById('m-atk-stat')?.value || "Force",
            prof: document.getElementById('m-atk-prof')?.checked || false,
            dice: document.getElementById('m-atk-dice')?.value || "1d6",
            damageType: document.getElementById('m-atk-type')?.value || "tranchant",
            hasSecondary: document.getElementById('m-atk-has-secondary')?.checked || false,
            dice2: document.getElementById('m-atk-dice2')?.value || "",
            damageType2: document.getElementById('m-atk-type2')?.value || "",
            misc: parseInt(document.getElementById('m-atk-misc')?.value) || 0
        };
        targetArray = (type === 'attack') ? state.attaques : state.mountData.attacks;
    } 
    else if (type === 'skill' || type === 'mount-skill') {
        const useProfValue = document.getElementById('m-skill-use-prof')?.checked || false;
        const maxVal = useProfValue ? -1 : (parseInt(document.getElementById('m-skill-max')?.value) || 0);
        const oldArray = (type === 'skill') ? state.capacites : state.mountData.skills;
        const currentVal = (index === -1) ? (useProfValue ? 2 : maxVal) : (oldArray[index]?.current || 0);

        data = {
            ...data,
            max: maxVal,
            current: currentVal,
            useProf: useProfValue,
            reset: document.getElementById('m-skill-reset')?.value || "long"
        };
        targetArray = (type === 'skill') ? state.capacites : state.mountData.skills;
    } 
    else if (type === 'spell') {
        data = {
            ...data,
            niveau: parseInt(document.getElementById('m-spell-rank')?.value) || 0,
            ecole: document.getElementById('m-spell-school')?.value || 'évocation',
            temps: document.getElementById('spell-action-type')?.value || 'action',
            portee: document.getElementById('m-spell-range')?.value || '',
            cible: document.getElementById('m-spell-target')?.value || '',
            duree: document.getElementById('m-spell-duration')?.value || '',
            incantation: document.getElementById('m-spell-incantation')?.value || '',
            concentration: document.getElementById('m-spell-concentration')?.checked || false,
            composantes: {
                v: document.getElementById('comp-v')?.checked || false,
                s: document.getElementById('comp-s')?.checked || false,
                m: document.getElementById('comp-m')?.checked || false
            },
            prepare: index === -1 ? true : (state.spells[index]?.prepare || false)
        };
        targetArray = state.spells;
    } 
    else if (type === 'item' || type === 'mount-item-left' || type === 'mount-item-right') {
        data = {
            ...data,
            weight: parseFloat(document.getElementById('item-weight')?.value) || 0,
            qty: parseInt(document.getElementById('item-qty')?.value) || 1
        };
        if (type === 'item') targetArray = state.inventaire;
        else if (type === 'mount-item-left') targetArray = state.mountData.inventoryLeft;
        else if (type === 'mount-item-right') targetArray = state.mountData.inventoryRight;
    }

    // --- 2. ENREGISTREMENT ---
    if (targetArray) {
        if (index === -1) {
            targetArray.push(data);
        } else {
            targetArray[index] = data;
        }
    }

    // --- 3. FERMETURE ET MAJ ---
    closeModal();
    indexEl.value = "-99";
    if (typeof window.renderAll === 'function') window.renderAll(true);
}

function resetAllFields() {
    // Champs communs
    document.getElementById('m-name').value = "";
    document.getElementById('m-desc').value = "";

    // Reset Attaques
    document.getElementById('m-atk-stat').value = "str";
    document.getElementById('m-atk-prof').checked = false;
    document.getElementById('m-atk-dice').value = "";
    document.getElementById('m-atk-type').value = "";
    document.getElementById('m-atk-misc').value = "0";
    document.getElementById('m-atk-has-secondary').checked = false;
    document.getElementById('m-atk-sec-container').classList.add('hidden');
    document.getElementById('m-atk-dice2').value = "";
    document.getElementById('m-atk-type2').value = "";

    // Reset Sorts
    document.getElementById('m-spell-rank').value = 0;
    document.getElementById('m-spell-school').value = "abjuration";
    document.getElementById('spell-action-type').value = "action";
    document.getElementById('m-spell-range').value = "";
    document.getElementById('m-spell-target').value = "";
    document.getElementById('m-spell-duration').value = "";
    document.getElementById('comp-v').checked = false;
    document.getElementById('comp-s').checked = false;
    document.getElementById('comp-m').checked = false;

    // Reset Skills (Capacités)
    document.getElementById('m-skill-use-prof').checked = false;
    document.getElementById('m-skill-max').value = 0;
    document.getElementById('m-skill-max').disabled = false;
    document.getElementById('m-skill-reset').value = "none";
}