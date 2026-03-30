/**
 * Ouvre la modale d'édition/création
 * @param {string} type - 'attack', 'spell', 'skill', ou 'item'
 * @param {number} index - L'index dans le tableau ( -1 pour une création)
 */
export function openModal(type, index = -1) {
    document.getElementById('m-type').value = type;
    document.getElementById('m-index').value = index;

    // Reset fields visibility
    ['m-atk-fields', 'm-spell-fields', 'm-skill-fields', 'm-item-fields'].forEach(id => document.getElementById(id).classList.add('hidden'));

    if (type === 'attack') document.getElementById('m-atk-fields').classList.remove('hidden');
    if (type === 'spell') document.getElementById('m-spell-fields').classList.remove('hidden');
    if (type === 'skill') document.getElementById('m-skill-fields').classList.remove('hidden');
    if (type === 'item') document.getElementById('m-item-fields').classList.remove('hidden');

    if (index !== -1) {
        let item = (type === 'attack') ? window.state.attaques[index] : (type === 'skill') ? window.state.capacites[index] : (type === 'spell') ? window.state.spells[index] : window.state.inventaire[index];
        document.getElementById('m-name').value = item.nom;
        document.getElementById('m-desc').value = item.desc || "";
        if (type === 'attack') {
            const hasSec = item.hasSecondary || false;
            document.getElementById('m-atk-stat').value = item.stat;
            document.getElementById('m-atk-prof').checked = item.prof;
            document.getElementById('m-atk-dice').value = item.dice;
            document.getElementById('m-atk-type').value = item.damageType || "";
            document.getElementById('m-atk-misc').value = item.misc;

            document.getElementById('m-atk-has-secondary').checked = hasSec;
            document.getElementById('m-atk-sec-container').classList.toggle('hidden', !hasSec);
            document.getElementById('m-atk-dice2').value = item.dice2 || "";
            document.getElementById('m-atk-type2').value = item.damageType2 || "";
        }
        if (type === 'skill') {
            const isProf = item.useProf || false;
            document.getElementById('m-skill-use-prof').checked = isProf;
            document.getElementById('m-skill-max').value = isProf ? "" : item.max;
            document.getElementById('m-skill-max').disabled = isProf;
            document.getElementById('m-skill-reset').value = item.reset;
        }
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
        if (type === 'item') {
            document.getElementById('m-item-weight').value = item.weight;
        }
    } else {
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