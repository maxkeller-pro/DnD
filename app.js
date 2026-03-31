import { getInitialState, APP_VERSION } from './js/state.js';
import { handleLogin, handleSignup, handleLogout, checkUser } from './js/auth.js';
import { saveToSupabase, loadUserData, deleteCharacter, createNewCharacter, selectCharacter, loadCharactersList } from './js/api.js';
import { renderAll, renderStatsList, renderSavesList, renderSkillsList, renderAttaques, renderCapacites, renderMountActions, renderMount, renderBag, renderSpellsList, renderSpellSlots, renderBlessures, renderInventoryList, renderMountInventory, renderExtras, renderPortrait, renderMountPortrait, renderNotes, renderInspiration } from './js/ui-render.js';
import { openModal, closeModal, closeMountModal, openMountModal, handleMountImageUpload, switchTab } from './js/ui-modals.js';
import { getProf, SKILLS_LIST, BAG_TYPES, CATALOGUE_SURVIE, subtractMoney } from './js/utils.js';

/**
    /js
    ├── config.js       (Supabase)
    ├── state.js        (getInitialState, gestion du state global, APP_VERSION)
    ├── auth.js         (Login, Signup, CheckUser)
    ├── api.js          (saveToSupabase, loadCharactersList)
    ├── ui-render.js    (renderAll, renderAttaques, renderSpellsList)
    ├── ui-modals.js    (openModal, closeModal, saveData)
    └── utils.js        (getMod, getProf, calculs de stats)
    app.js
 */
let filterPreparedOnly = false;

// --- DONNÉES DE RÉFÉRENCE ---

window.currentCharacterId = null;
window.state = getInitialState();

window.calculateSpellStats = function() {
    const s = window.state;
    // 1. Déterminer le bonus de maîtrise (2 au niv 1, 3 au niv 5, etc.)
    const mastery = Math.ceil(1 + (s.niveau / 4));

    let castingStat = "Charisme"; 
    if (s.classe === "Magicien") castingStat = "Intelligence";
    if (s.classe === "Clerc" || s.classe === "Druide") castingStat = "Sagesse";

    const statValue = s.stats[castingStat] || 10;
    const statMod = Math.floor((statValue - 10) / 2);
    
    // 3. Récupérer le bonus d'objet magique (stocké dans ton state)
    const miscBonus = parseInt(s.spellMiscBonus || 0);

    // 4. Calculs finaux
    const saveDC = 8 + mastery + statMod + miscBonus;
    const attackBonus = mastery + statMod + miscBonus;

    // 5. Affichage
    document.getElementById('display-spell-save-dc').innerText = saveDC;
    document.getElementById('display-spell-attack-bonus').innerText = (attackBonus >= 0 ? "+" : "") + attackBonus;
    document.getElementById('spell-mod-name').innerText = castingStat.substring(0, 3).toUpperCase();
    document.getElementById('spell-misc-bonus').value = miscBonus;
};

// Fonction pour mettre à jour le bonus d'objet
window.updateSpellMiscBonus = function(val) {
    window.state.spellMiscBonus = parseInt(val) || 0;
    window.calculateSpellStats();
    saveToSupabase(); // On n'oublie pas de sauvegarder !
};

// Au chargement initial de la page
let isBackingToSelection = false;

// Dictionnaire des maîtrises par classe (Sert pour l'automatisation)
const CLASS_SAVES = {
    "Barbare": ["Force", "Constitution"],
    "Barde": ["Dextérité", "Charisme"],
    "Clerc": ["Sagesse", "Charisme"],
    "Druide": ["Intelligence", "Sagesse"],
    "Ensorceleur": ["Constitution", "Charisme"],
    "Guerrier": ["Force", "Constitution"],
    "Magicien": ["Intelligence", "Sagesse"],
    "Moine": ["Force", "Dextérité"],
    "Paladin": ["Sagesse", "Charisme"],
    "Rôdeur": ["Force", "Dextérité"],
    "Roublard": ["Dextérité", "Intelligence"],
    "Occultiste": ["Sagesse", "Charisme"]
};

// window.ajouterAuSac = function(obj, estSurvie = false) {
//     const inv = window.state.inventory;

//     if (estSurvie) {
//         if (inv.pocheSurvie.length >= inv.survivalMax) {
//             alert("Plus de place dans le kit de survie !");
//             return;
//         }
//         inv.pocheSurvie.push(obj);
//     } else {
//         // Calcul de l'encombrement (getSlotsUtilises)
//         const utilise = inv.pochePrincipale.reduce((total, o) => total + o.taille, 0);
//         if (utilise + obj.taille > inv.capacityMax) {
//             alert(`Pas assez de place ! (Reste: ${inv.capacityMax - utilise} slots)`);
//             return;
//         }
//         inv.pochePrincipale.push(obj);
//     }
    
//     saveToSupabase();
//     renderInventory();
// };

window.promptAddItem = function() {
    document.getElementById('add-item-modal').classList.remove('hidden');
};

window.closeAddItemModal = function() {
    document.getElementById('add-item-modal').classList.add('hidden');
    // On vide les champs pour la prochaine fois
    document.getElementById('new-item-name').value = '';
    document.getElementById('new-item-desc').value = '';
    document.getElementById('new-item-qty').value = 1;
};

window.confirmAddItem = function() {
    const nom = document.getElementById('new-item-name').value;
    const desc = document.getElementById('new-item-desc').value;
    const taille = parseInt(document.getElementById('new-item-size').value);
    const qte = parseInt(document.getElementById('new-item-qty').value);

    if (!nom) {
        alert("L'objet doit avoir un nom !");
        return;
    }

    // On vérifie la place disponible dans le sac (Logique Sac.cpp)
    const inv = window.state.inventory;
    const currentType = inv.type || "CLASSIQUE";
    const capacityMax = BAG_TYPES[currentType].main;
    const usedSlots = inv.pochePrincipale.reduce((sum, item) => sum + (item.taille * item.quantite), 0);
    
    const encombrementTotal = taille * qte;

    if (usedSlots + encombrementTotal > capacityMax) {
        alert("Pas assez de place dans le sac pour cette quantité !");
        return;
    }

    // Ajout de l'objet (ou mise à jour si déjà présent ?)
    // Ici, on crée un nouvel objet comme ton constructeur Objet.cpp
    const nouvelObjet = {
        nom: nom,
        description: desc,
        taille: taille,
        quantite: qte,
        valeur: 0 // Tu pourras ajouter un champ si besoin
    };

    inv.pochePrincipale.push(nouvelObjet);
    
    // Sauvegarde et mise à jour visuelle
    closeAddItemModal();
    renderBag();
    saveToSupabase();
};

window.openBagModal = function() {
    document.getElementById('bag-modal').classList.remove('hidden');
    renderBag();
};

window.closeBagModal = function() {
    document.getElementById('bag-modal').classList.add('hidden');
};

window.removeItem = function(index, isSurvival) {
    if(isSurvival) window.state.inventory.pocheSurvie.splice(index, 1);
    else window.state.inventory.pochePrincipale.splice(index, 1);
    
    renderBag();
    saveToSupabase();
};

window.updateBagType = function(newType) {
    window.state.inventory.type = newType;
    // On ajuste aussi les capacités max si tu veux être strict comme en C++
    window.state.inventory.capacityMax = BAG_TYPES[newType].max;
    
    renderBag();
    saveToSupabase();
};

window.showSurvivalCatalogue = function() {
    const grid = document.getElementById('survival-items-grid');
    const inv = window.state.inventory;
    const currentType = inv.type || "CLASSIQUE";
    const config = BAG_TYPES[currentType];
    const limits = config.survivalLimits || {};
    
    grid.innerHTML = '';

    // 1. On transforme le catalogue en tableau de clés pour pouvoir trier
    const sortedKeys = Object.keys(CATALOGUE_SURVIE).sort((a, b) => {
        const itemA = CATALOGUE_SURVIE[a];
        const itemB = CATALOGUE_SURVIE[b];
        
        // Calcul des places en survie pour A et B
        const maxA = limits[a] || 0;
        const qteA = (inv.pocheSurvie.find(i => i.key === a))?.quantite || 0;
        const hasSpaceA = maxA > 0 && qteA < maxA;

        const maxB = limits[b] || 0;
        const qteB = (inv.pocheSurvie.find(i => i.key === b))?.quantite || 0;
        const hasSpaceB = maxB > 0 && qteB < maxB;

        // --- LOGIQUE DU TRI ---
        // Priorité 1 : Ceux qui ont encore de la place dans la poche survie
        if (hasSpaceA && !hasSpaceB) return -1;
        if (!hasSpaceA && hasSpaceB) return 1;

        // Priorité 2 : Si les deux sont dans le même état, tri alphabétique par nom
        return itemA.nom.localeCompare(itemB.nom);
    });

    // 2. On boucle sur les clés triées
    sortedKeys.forEach(key => {
        const itemTemplate = CATALOGUE_SURVIE[key];
        const maxSurvie = limits[key] || 0;
        
        const itemInSurvie = inv.pocheSurvie.find(i => i.key === key);
        const qteSurvie = itemInSurvie ? itemInSurvie.quantite : 0;
        const isSurvieFull = qteSurvie >= maxSurvie;

        const usedSlots = inv.pochePrincipale.reduce((sum, i) => sum + (i.taille * (i.quantite || 1)), 0);
        const canFitInMain = (usedSlots + itemTemplate.taille) <= config.main;
        const canBuy = !isSurvieFull || (isSurvieFull && canFitInMain);

        let statusText = `${qteSurvie} / ${maxSurvie}`;
        let statusColor = "text-emerald-500/50";
        let cardStyle = "bg-white/5 border-white/10 hover:bg-emerald-500/10 hover:border-emerald-500/50";

        // Ajustement visuel si la survie est pleine ou le sac est plein
        if (maxSurvie === 0 || isSurvieFull) {
            if (canFitInMain) {
                statusText = maxSurvie === 0 ? "Sac Principal" : "Vers Sac Principal";
                statusColor = "text-amber-500";
                cardStyle = "bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10 hover:border-amber-500/50";
            } else {
                statusText = "Sac Plein";
                statusColor = "text-red-500";
                cardStyle = "opacity-50 bg-zinc-800 border-white/5 cursor-not-allowed";
            }
        }

        grid.innerHTML += `
            <button onclick="addSurvivalItem('${key}')" ${!canBuy ? 'disabled' : ''}
                    class="flex flex-col text-left p-3 rounded-xl border transition-all ${cardStyle} group">
                <div class="flex justify-between items-center w-full mb-1">
                    <span class="font-bold ${!canBuy ? 'text-zinc-500' : 'text-white'} group-hover:text-emerald-400 transition-colors">
                        ${itemTemplate.nom}
                    </span>
                    <span class="text-[10px] font-black ${statusColor}">
                        ${statusText}
                    </span>
                </div>
                <p class="text-[9px] text-white/40 italic leading-tight mb-2">${itemTemplate.desc}</p>
                <div class="flex justify-between items-center mt-auto pt-2 border-t border-white/5">
                    <span class="text-[10px] font-bold text-amber-500/80">${itemTemplate.valeur} PO</span>
                    <span class="text-[8px] uppercase tracking-widest text-white/20">${itemTemplate.taille} Slots</span>
                </div>
            </button>
        `;
    });

    document.getElementById('survival-catalogue-modal').classList.remove('hidden');
};

window.closeSurvivalCatalogue = function() {
    document.getElementById('survival-catalogue-modal').classList.add('hidden');
};

window.addSurvivalItem = function(key) {
    const inv = window.state.inventory;
    const stats = window.state.stats; // Supposons que l'argent est dans state.money ou state.stats.money
    const itemTemplate = CATALOGUE_SURVIE[key];
    const currentType = inv.type || "CLASSIQUE";
    const config = BAG_TYPES[currentType];
    
    // 1. Vérification de l'argent
    if (!subtractMoney(window.state.money, itemTemplate.valeur)) {
        alert("Pas assez d'argent !");
        return;
    }

    // 2. Tentative d'ajout dans la POCHE SURVIE
    const limits = config.survivalLimits || {};
    const maxSurvie = limits[key] || 0;
    const itemSurvie = inv.pocheSurvie.find(i => i.key === key);
    const qteSurvie = itemSurvie ? itemSurvie.quantite : 0;

    if (maxSurvie > 0 && qteSurvie < maxSurvie) {
        if (itemSurvie) {
            itemSurvie.quantite += 1;
        } else {
            inv.pocheSurvie.push({ ...itemTemplate, key: key, quantite: 1 });
        }
    } 
    // 3. Sinon, tentative d'ajout dans la POCHE PRINCIPALE
    else {
        // Calcul de la place restante dans le sac
        const usedSlots = inv.pochePrincipale.reduce((sum, i) => sum + (i.taille * (i.quantite || 1)), 0);
        const slotsNecessaires = itemTemplate.taille;

        if (usedSlots + slotsNecessaires <= config.main) {
            // On cherche si l'objet existe déjà en principal pour le stacker
            const itemPrincipal = inv.pochePrincipale.find(i => i.nom === itemTemplate.nom);
            if (itemPrincipal) {
                itemPrincipal.quantite = (itemPrincipal.quantite || 1) + 1;
            } else {
                inv.pochePrincipale.push({ 
                    nom: itemTemplate.nom, 
                    taille: itemTemplate.taille, 
                    quantite: 1, 
                    description: itemTemplate.desc 
                });
            }
            alert(`Poche survie pleine ! Ajouté au sac principal. (-${itemTemplate.valeur} PO)`);
        } else {
            alert("Plus aucune place, même dans le sac principal !");
            return;
        }
    }

    // 4. Mises à jour globales
    renderBag();
    if (window.renderStats) window.renderStats(); // Pour l'argent
    showSurvivalCatalogue(); 
    saveToSupabase();
};

window.removeSurvivalItem = function(key) {
    const inv = window.state.inventory;
    const itemIndex = inv.pocheSurvie.findIndex(i => i.key === key);

    if (itemIndex !== -1) {
        if (inv.pocheSurvie[itemIndex].quantite > 1) {
            inv.pocheSurvie[itemIndex].quantite -= 1;
        } else {
            inv.pocheSurvie.splice(itemIndex, 1);
        }
        
        renderBag();
        // Si la modale catalogue est ouverte, on la rafraîchit aussi
        if (!document.getElementById('survival-catalogue-modal').classList.contains('hidden')) {
            window.showSurvivalCatalogue();
        }
        saveToSupabase();
    }
};

let draggedItemIndex = null;

window.handleDragStart = function(e, index) {
    draggedItemIndex = index;
    e.dataTransfer.effectAllowed = "move";
    // On ajoute un petit délai pour que l'ombre portée (ghost image) soit visible 
    // avant que l'élément d'origine ne devienne transparent
    setTimeout(() => {
        e.target.classList.add('opacity-20');
    }, 0);
};

window.handleDragOver = function(e) {
    e.preventDefault(); // CRUCIAL : permet d'autoriser le drop
    e.dataTransfer.dropEffect = "move";
};

window.handleDragEnd = function(e) {
    e.target.classList.remove('opacity-20');
};

window.handleDrop = function(e, targetIndex) {
    e.preventDefault();
    const inv = window.state.inventory;
    
    if (draggedItemIndex !== null && draggedItemIndex !== targetIndex) {
        const list = inv.pochePrincipale;
        
        // On déplace l'élément dans le tableau
        const [movedItem] = list.splice(draggedItemIndex, 1);
        list.splice(targetIndex, 0, movedItem);

        // Sauvegarde et rendu
        renderBag();
        if (typeof saveToSupabase === "function") saveToSupabase();
    }
    draggedItemIndex = null;
};

// --- GESTION DES QUANTITÉS ---
window.updateItemQuantity = function(index, delta) {
    const list = window.state.inventory.pochePrincipale;
    const item = list[index];
    
    const newQty = (parseInt(item.quantite) || 1) + delta;
    
    if (newQty <= 0) {
        // Si la quantité tombe à 0, on demande confirmation pour supprimer
        if (confirm(`Supprimer ${item.nom} de l'inventaire ?`)) {
            removeItem(index, false);
        }
    } else {
        item.quantite = newQty;
        renderBag();
        saveToSupabase();
    }
};

window.saveItemEdits = function(index) {
    const nameInput = document.getElementById(`edit-name-${index}`);
    const descInput = document.getElementById(`edit-desc-${index}`);
    const bonusInput = document.getElementById(`edit-bonus-save-${index}`);
    
    // On récupère l'objet dans le state
    const item = window.state.inventory.pochePrincipale[index];

    if (item && nameInput && descInput) {
        // Mise à jour des valeurs textuelles
        item.nom = nameInput.value;
        item.description = descInput.value;
        
        // Mise à jour du bonus (on vérifie s'il existe dans le DOM)
        if (bonusInput) {
            item.bonusSauvegarde = parseInt(bonusInput.value) || 0;
        }

        renderBag(); 
        
        if (typeof renderSavesList === "function") {
            renderSavesList();
        }

        if (typeof saveToSupabase === "function") {
            saveToSupabase();
        }
    }
};

window.toggleEditMode = function(index) {
    const card = document.getElementById(`item-card-${index}`);
    const editForm = document.getElementById(`edit-form-${index}`);
    const viewContent = document.getElementById(`view-content-${index}`);
    
    if (editForm.classList.contains('hidden')) {
        // Entrée en mode édition
        editForm.classList.remove('hidden');
        viewContent.classList.add('hidden');
        
        // CRUCIAL : Désactive le drag pour permettre la sélection de texte
        card.setAttribute('draggable', 'false');
        card.classList.remove('cursor-move');
        
        // Optionnel : Focus automatique sur le nom
        setTimeout(() => document.getElementById(`edit-name-${index}`).focus(), 50);
    } else {
        // Sortie / Annulation
        renderBag(); 
    }
};

// --- ÉDITION D'UN OBJET ---
window.editMainItem = function(index) {
    const item = window.state.inventory.pochePrincipale[index];
    
    const newNom = prompt("Nom de l'objet :", item.nom);
    if (newNom === null) return; // Annulation

    const newTaille = prompt("Taille (slots) :", item.taille);
    const newDesc = prompt("Description :", item.description || "");

    window.state.inventory.pochePrincipale[index] = {
        ...item,
        nom: newNom || item.nom,
        taille: parseInt(newTaille) || 0,
        description: newDesc
    };

    renderBag();
    saveToSupabase();
};

// --- INITIALISATION ---
// On utilise 'DOMContentLoaded' pour être sûr que l'ID 'auth-overlay' existe dans le DOM
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('app-version').innerText = `v${APP_VERSION}`;
    checkUser(loadCharactersList);
});

// --- CALCULS ---


// --- UI HELPERS ---
function updateHPUI() {
    const p = Math.min(100, Math.max(0, (window.state.hp_cur / window.state.hp_max) * 100));
    const fill = document.getElementById('hp-bar-fill');
    const bg = document.getElementById('hp-bar-bg');
    const label = document.getElementById('hp-label');

    if (fill && label) {
        fill.style.width = p + '%';

        fill.classList.remove('bg-emerald-500', 'bg-amber-500', 'bg-red-600', 'bg-red-900');
        label.classList.remove('text-emerald-500', 'text-amber-500', 'text-red-600', 'text-red-900');

        if (p <= 0) {
            label.innerText = "Inconscient";
            label.classList.add('text-red-900');
            fill.classList.add('bg-red-900');
        } else if (p <= 25) {
            label.innerText = "Agonie";
            label.classList.add('text-red-600');
            fill.classList.add('bg-red-600');
        } else if (p <= 50) {
            label.innerText = "Blessé";
            label.classList.add('text-amber-500');
            fill.classList.add('bg-amber-500');
        } else {
            label.innerText = "En forme";
            label.classList.add('text-emerald-500');
            fill.classList.add('bg-emerald-500');
        }
    }

    if (bg) bg.style.width = p + '%';
}

// --- MODALES ---


function updateClassSaves(className) {
    console.log("test");
    const normalizedClass = Object.keys(CLASS_SAVES).find(
        k => k.toLowerCase() === className.toLowerCase().trim()
    );

    if (normalizedClass) {
        window.state.m_saves = [...CLASS_SAVES[normalizedClass]];
        renderAll();
    }
}

export function saveData() {
    const typeEl = document.getElementById('m-type');
    const indexEl = document.getElementById('m-index');
    if (!typeEl || !indexEl) return;

    const type = typeEl.value;
    const index = parseInt(indexEl.value);
    const state = window.state;

    // Déclaration de la variable de destination pour éviter l'erreur "undeclared variable"
    let targetArray = null;

    if (!state.mountData) {
        state.mountData = { name: "", image: "", inventoryLeft: [], inventoryRight: [], attacks: [], skills: [] };
    }

    let data = {
        nom: document.getElementById('m-name').value,
        desc: document.getElementById('m-desc').value
    };

    // --- 1. RÉCUPÉRATION DES DONNÉES SELON LE TYPE ---

    if (type === 'attack' || type === 'mount-attack') {
        data = {
            ...data,
            stat: document.getElementById('m-atk-stat').value,
            prof: document.getElementById('m-atk-prof').checked,
            dice: document.getElementById('m-atk-dice').value,
            damageType: document.getElementById('m-atk-type').value,
            hasSecondary: document.getElementById('m-atk-has-secondary').checked,
            dice2: document.getElementById('m-atk-dice2').value,
            damageType2: document.getElementById('m-atk-type2').value,
            misc: parseInt(document.getElementById('m-atk-misc').value) || 0
        };
        targetArray = (type === 'attack') ? state.attaques : state.mountData.attacks;
    }

    else if (type === 'skill' || type === 'mount-skill') {
        const useProfValue = document.getElementById('m-skill-use-prof').checked;
        const maxVal = useProfValue ? -1 : (parseInt(document.getElementById('m-skill-max').value) || 0);
        
        // On récupère l'ancienne valeur current si on édite, sinon on initialise
        const oldArray = (type === 'skill') ? state.capacites : state.mountData.skills;
        const currentVal = (index === -1) ? (useProfValue ? 2 : maxVal) : (oldArray[index]?.current || 0);

        data = {
            ...data,
            max: maxVal,
            current: currentVal,
            useProf: useProfValue,
            reset: document.getElementById('m-skill-reset').value
        };
        targetArray = (type === 'skill') ? state.capacites : state.mountData.skills;
    }

    else if (type === 'spell') {
        data = {
            ...data,
            niveau: parseInt(document.getElementById('m-spell-rank').value) || 0,
            ecole: document.getElementById('m-spell-school').value,
            temps: document.getElementById('spell-action-type').value,
            portee: document.getElementById('m-spell-range').value,
            cible: document.getElementById('m-spell-target').value,
            duree: document.getElementById('m-spell-duration').value,
            composantes: {
                v: document.getElementById('comp-v').checked,
                s: document.getElementById('comp-s').checked,
                m: document.getElementById('comp-m').checked
            },
            prepare: index === -1 ? true : state.spells[index].prepare
        };
        targetArray = state.spells;
    }

    else if (type === 'item' || type === 'mount-item-left' || type === 'mount-item-right') {
        data = {
            ...data,
            weight: parseFloat(document.getElementById('item-weight').value) || 0,
            qty: parseInt(document.getElementById('item-qty').value) || 1
        };
        
        if (type === 'item') targetArray = state.inventaire;
        else if (type === 'mount-item-left') targetArray = state.mountData.inventoryLeft;
        else if (type === 'mount-item-right') targetArray = state.mountData.inventoryRight;
    }

    // --- 2. ENREGISTREMENT DANS LE TABLEAU CIBLE ---

    if (targetArray) {
        if (index === -1) {
            targetArray.push(data);
        } else {
            targetArray[index] = data;
        }
    }

    // --- 3. FERMETURE ET SAUVEGARDE ---
    closeModal();
    indexEl.value = "-99"; 
    renderAll();
}

function toggleSave(s) {
    if (window.state.m_saves.includes(s)) {
        window.state.m_saves = window.state.m_saves.filter(x => x !== s);
    } else {
        window.state.m_saves.push(s);
    }

    if (window.renderAll) {
        window.renderAll(); 
    }
}
function toggleSkill(n) {
    // 1. Initialisation / Migration de sécurité
    if (Array.isArray(window.state.m_skills)) {
        const legacy = [...window.state.m_skills];
        window.state.m_skills = {};
        legacy.forEach(name => window.state.m_skills[name] = 1);
    }

    // 2. Logique de cycle
    const current = window.state.m_skills[n] || 0;
    const next = (current + 1) % 3;

    if (next === 0) {
        delete window.state.m_skills[n]; // On nettoie l'objet si 0
    } else {
        window.state.m_skills[n] = next;
    }
    
    // 3. Mise à jour de l'UI
    // On appelle renderAll pour que la Perception Passive se mette aussi à jour
    if (window.renderAll) {
        window.renderAll(); 
    }
}
function updateLevel(v) { window.state.niveau = parseInt(v) || 1; window.state.hd_cur = window.state.niveau; renderAll(); }
function updateHP(t, v) { if (t === 'cur') window.state.hp_cur = parseInt(v) || 0; else window.state.hp_max = parseInt(v) || 1; renderAll(); }

function toggleDesc(id) {
    if (!window.state.openedDescs) window.state.openedDescs = [];

    if (window.state.openedDescs.includes(id)) {
        window.state.openedDescs = window.state.openedDescs.filter(x => x !== id);
    } else {
        window.state.openedDescs.push(id);
    }
    renderAll();
}

function takeRest(type) {
    const p = getProf();

    if (type === 'long') {
        window.state.hp_cur = window.state.hp_max;
        window.state.hd_cur = window.state.niveau;
        
        if (window.state.spellSlots) {
            for (let lvl in window.state.spellSlots) {
                window.state.spellSlots[lvl].used = 0;
            }
        }

        if (window.state.blessures > 0) {
            window.state.blessures -= 1;
        }
    }

    window.state.capacites.forEach(c => {
        const effectiveMax = c.useProf ? p : (parseInt(c.max) || 0);

        if (effectiveMax > 0) {
            if (type === 'long' || c.reset === 'court') {
                c.current = effectiveMax;
            }
        }
    });

    // On appelle les rendus et la sauvegarde
    renderAll(); // renderAll appelle déjà renderSpellSlots normalement
    saveToSupabase();
    
    // Petit feedback visuel
    const msg = type === 'long' ? "Repos long terminé !" : "Repos court terminé !";
    console.log(msg);
}

function addExtra(type) {
    const val = prompt(type === 'language' ? "Quelle langue maîtrisez-vous ?" : "Quel outil maîtrisez-vous ?");
    if (val) {
        if (type === 'language') window.state.languages.push(val);
        else window.state.tools.push(val);
        saveToSupabase();
        renderExtras();
    }
}

function removeExtra(type, index) {
    if (type === 'language') window.state.languages.splice(index, 1);
    else window.state.tools.splice(index, 1);
    saveToSupabase();
    renderExtras();
}

function changePortrait() {
    const url = prompt("Collez l'URL de l'image de votre personnage :", window.state.portrait);
    if (url !== null) {
        window.state.portrait = url;
        saveToSupabase();
        renderPortrait();
    }
}

function handleImageUpload(input) {
    const file = input.files[0];
    if (file) {
        if (file.size > 1024 * 1024) { // Limite à 1Mo
            alert("L'image est trop lourde (max 1Mo).");
            return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            window.state.portrait = e.target.result;
            renderPortrait();
            saveToSupabase();
        };
        reader.readAsDataURL(file);
    }
}

function addSession() {
    const title = prompt("Nom de la session (ex: Session 1 - La rencontre) :");
    if (title) {
        const newSession = {
            id: Date.now(),
            title: title,
            content: ""
        };
        window.state.notes.sessions.push(newSession);
        window.state.notes.currentSessionId = newSession.id;
        saveToSupabase();
        renderNotes();
    }
}

function switchSession(id) {
    window.state.notes.currentSessionId = id;
    renderNotes();
}

function saveNotes(content) {
    const status = document.getElementById('note-status');
    status.innerText = "Modification...";

    const session = window.state.notes.sessions.find(s => s.id == window.state.notes.currentSessionId);
    if (session) {
        session.content = content;
        // On utilise un petit délai pour ne pas spammer Supabase à chaque lettre
        clearTimeout(window.saveTimeout);
        window.saveTimeout = setTimeout(() => {
            saveToSupabase();
            status.innerText = "Enregistré";
        }, 1000);
    }
}

function deleteCurrentSession() {
    if (window.state.notes.sessions.length <= 1) return alert("Il doit rester au moins une session.");
    if (confirm("Supprimer définitivement cette session ?")) {
        window.state.notes.sessions = window.state.notes.sessions.filter(s => s.id != window.state.notes.currentSessionId);
        window.state.notes.currentSessionId = window.state.notes.sessions[0].id;
        saveToSupabase();
        renderNotes();
    }
}

async function backToSelection() {
    // 1. ANTIM-SPAM : Si on est déjà en train de sortir, on ignore le clic
    if (isBackingToSelection) return;
    isBackingToSelection = true;
    
    try {
        // Feedback visuel optionnel : on change le curseur du body
        document.body.style.cursor = 'wait';
        
        // 2. Sauvegarde une dernière fois avant de quitter
        if (window.currentCharacterId) {
            await saveToSupabase();
        }
        
        // 3. RÉINITIALISATION DU CACHE LOCAL
        window.state = getInitialState(); 
        
        // 4. NETTOYAGE PHYSIQUE DU DOM
        const containers = ['spells-list', 'attacks-list', 'inventory-list', 'capacites-list'];
        containers.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '';
        });

        // 5. Reset des variables de contrôle
        window.currentCharacterId = null;
        
        // 6. Navigation
        document.getElementById('app').classList.add('hidden');
        await loadCharactersList(); // On attend que la liste soit chargée
        
        window.scrollTo(0, 0);
        console.log("Session terminée : État réinitialisé.");
        
    } catch (error) {
        console.error("Erreur lors du retour à la sélection :", error);
    } finally {
        // 7. RÉOUVERTURE DU VERROU
        // On remet le curseur et on autorise à nouveau la fonction
        document.body.style.cursor = 'default';
        isBackingToSelection = false;
    }
}

function toggleInspiration() {
    window.state.inspiration = !state.inspiration;
    renderInspiration();
    saveData(); // Sauvegarde automatique dans Supabase
}

window.deleteSpell = (index) => {
    // On retire l'élément du tableau window.state.spells
    window.state.spells.splice(index, 1);
    
    // On rafraîchit l'affichage
    renderSpellsList();
    
    // On sauvegarde la nouvelle liste dans Supabase
    saveToSupabase();
};

window.resetSpellFilters = () => {
    // On remet les inputs à leurs valeurs initiales
    const searchInput = document.getElementById('spell-search');
    const rankSelect = document.getElementById('spell-filter-rank');
    const actionSelect = document.getElementById('spell-filter-action');
    
    if (searchInput) searchInput.value = "";
    if (rankSelect) rankSelect.value = "all";
    if (actionSelect) actionSelect.value = "all";
    
    filterPreparedOnly = false;
    const btnPrepared = document.getElementById('btn-filter-prepared');
    
    if (btnPrepared) {
        btnPrepared.classList.remove('border-purple-500', 'text-purple-400', 'bg-purple-500/10');
    }
    
    // On relance le rendu pour afficher tous les sorts
    renderSpellsList();
};

window.updateUsedSlot = (lvl, change) => {
    const slot = window.state.spellSlots[lvl];
    if (!slot) return;
    
    // Logique inversée pour correspondre à ton souhait :
    // Si change = 1 (bouton +), on veut ENLEVER 1 aux sorts utilisés pour en redonner un dispo.
    // Si change = -1 (bouton -), on veut AJOUTER 1 aux sorts utilisés pour en consommer un.
    const newVal = slot.used + change;
    
    // On vérifie qu'on reste entre 0 et le max
    if (newVal >= 0 && newVal <= slot.max) {
        window.state.spellSlots[lvl].used = newVal;
        renderSpellSlots(); 
        saveToSupabase();    
    }
};

window.setupMaxSlots = (lvl) => {
    const newMax = prompt(`Total d'emplacements pour le Niveau ${lvl} :`, window.state.spellSlots[lvl].max);
    if (newMax !== null) {
        window.state.spellSlots[lvl].max = parseInt(newMax) || 0;
        renderSpellSlots();
        saveToSupabase();
    }
};

let currentPrepFilter = 'all';

window.filterPrepByRank = (rank) => {
    currentPrepFilter = rank.toString();
    
    document.querySelectorAll('.prep-rank-chip').forEach(btn => {
        btn.classList.toggle('active-chip', btn.getAttribute('data-rank') === currentPrepFilter);
    });
    
    openPrepModal(); 
};

window.togglePreparedFilter = () => {
    filterPreparedOnly = !filterPreparedOnly;
    const btn = document.getElementById('btn-filter-prepared');
    
    // Feedback visuel si le filtre est actif
    if (filterPreparedOnly) {
        btn.classList.add('border-purple-500', 'text-purple-400', 'bg-purple-500/10');
    } else {
        btn.classList.remove('border-purple-500', 'text-purple-400', 'bg-purple-500/10');
    }
    renderSpellsList();
};

// Ouvre la modale et génère la liste
window.openPrepModal = () => {
    const container = document.getElementById('prep-spells-list');
    const counter = document.getElementById('prep-counter');
    if (!container) return;
    
    container.innerHTML = '';
    
    // 1. Filtrage par rang
    let filteredSpells = [...state.spells];
    if (currentPrepFilter !== 'all') {
        filteredSpells = filteredSpells.filter(s => s.niveau.toString() === currentPrepFilter);
    }
    
    // 2. Tri par niveau puis par nom
    filteredSpells.sort((a, b) => a.niveau - b.niveau || a.nom.localeCompare(b.nom));
    
    // 3. Affichage
    filteredSpells.forEach((spell) => {
        // On récupère l'index original dans le window.state global pour la modification
        const realIndex = window.state.spells.findIndex(s => s.nom === spell.nom);
        const isPrepared = spell.prepare === true;
        
        const row = document.createElement('div');
        row.className = `flex items-center justify-between p-3 rounded-lg border transition cursor-pointer ${isPrepared ? 'bg-purple-500/10 border-purple-500/50' : 'bg-black/20 border-zinc-800 hover:border-zinc-700'}`;
        
        row.onclick = () => toggleSpellPrepInList(realIndex);
        
        row.innerHTML = `
        <div class="flex items-center gap-4">
        <div class="w-8 h-8 flex items-center justify-center rounded bg-zinc-800 text-[10px] font-black ${isPrepared ? 'text-purple-400 border-purple-500/50' : 'text-zinc-600 border-zinc-700'} border">
        ${spell.niveau == 0 ? 'C' : spell.niveau}
        </div>
        <div>
        <div class="text-xs font-bold ${isPrepared ? 'text-white' : 'text-zinc-400'} uppercase">${spell.nom}</div>
        <div class="text-[9px] text-zinc-500 uppercase font-bold">${spell.ecole || 'Sort'}</div>
        </div>
        </div>
        <div class="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isPrepared ? 'bg-purple-500 border-purple-400 text-white' : 'border-zinc-800 text-transparent'}">
        <span class="text-[10px] font-black">✓</span>
        </div>
        `;
        container.appendChild(row);
    });
    
    // Mise à jour du compteur
    const totalPrepared = window.state.spells.filter(s => s.prepare).length;
    if(counter) counter.innerText = `${totalPrepared} sort${totalPrepared > 1 ? 's' : ''} préparé${totalPrepared > 1 ? 's' : ''}`;
    
    document.getElementById('modal-prep-spells').classList.remove('hidden');
};

window.toggleSpellPrepInList = (index) => {
    window.state.spells[index].prepare = !state.spells[index].prepare;
    openPrepModal(); // Rafraîchit la vue
};

window.closePrepModal = () => {
    document.getElementById('modal-prep-spells').classList.add('hidden');
    renderSpellsList(); // Rafraîchit la liste principale
    saveToSupabase();   // Sauvegarde les changements
};

window.updateMountStat = function(key, value) {
    // On met à jour la valeur dans le state global
    // Si c'est un nombre (AC, HP, Stats), on le convertit
    const numericFields = ['hp_cur', 'hp_max', 'ac', 'str', 'dex', 'con', 'int', 'wis', 'cha'];
    
    if (numericFields.includes(key)) {
        window.state.mountData[key] = parseInt(value) || 0;
    } else {
        window.state.mountData[key] = value;
    }

    console.log("Update mountData:", key, value);
    
    saveToSupabase(); 
};

window.toggleSpellPreparation = (originalIndex) => {
    const spell = window.state.spells[originalIndex];
    // Alterne entre true et false
    spell.prepare = !spell.prepare;
    
    renderSpellsList();
    saveToSupabase(); // Sauvegarde l'état préparé
};

window.reorderSpells = (fromIndex, toIndex) => {
    // On extrait l'élément déplacé
    const movedSpell = window.state.spells.splice(fromIndex, 1)[0];
    
    // On l'insère à sa nouvelle position
    window.state.spells.splice(toIndex, 0, movedSpell);
    
    // Mise à jour de l'interface et de la base de données
    renderSpellsList();
    saveToSupabase();
};

window.updateField = (path, value) => {
    // 1. Détecter si c'est un nombre pour éviter de stocker "10" au lieu de 10
    const val = (value === "" || isNaN(value)) ? value : parseFloat(value);
    
    // 2. Naviguer dans l'objet window.state (ex: "stats.Force")
    const keys = path.split('.');
    let target = window.state;
    
    // On descend dans les niveaux de l'objet (ex: de state vers stats)
    for (let i = 0; i < keys.length - 1; i++) {
        if (!target[keys[i]]) target[keys[i]] = {};
        target = target[keys[i]];
    }
    
    target[keys[keys.length - 1]] = val;
    
    if (path.startsWith('stats.')) {
        if (window.renderStatsList) window.renderStatsList();
    }
    
    saveToSupabase();
};

window.deleteMountItem = function(type, index) {
    if (!confirm("Supprimer cet objet de la monture ?")) return;
    
    if (type === 'mount-item-left') {
        window.state.mountData.inventoryLeft.splice(index, 1);
    } else {
        window.state.mountData.inventoryRight.splice(index, 1);
    }
    
    saveToSupabase();
    renderAll();
};

window.updateMountSkillUsage = function(index, change) {
    const skill = window.state.mountData.skills[index];
    if (!skill) return;

    let newVal = (parseInt(skill.current) || 0) + change;
    
    // Bornes entre 0 et Max
    if (newVal < 0) newVal = 0;
    if (newVal > skill.max) newVal = skill.max;

    skill.current = newVal;
    saveToSupabase();
    renderMountActions();
};

// Fonction pour ouvrir la modal en mode édition
function editItem(index) {
    const it = window.state.inventaire[index];
    if (!it) return;

    // 1. On prépare les données (IDs vérifiés selon ton index.html)
    document.getElementById('m-type').value = 'item';
    document.getElementById('m-index').value = index;

    document.getElementById('m-name').value = it.nom || "";
    document.getElementById('item-weight').value = it.weight || 0;
    document.getElementById('item-qty').value = it.qty || 1;
    document.getElementById('m-desc').value = it.desc || ""; // Récupère la description

    // 2. On ajuste l'affichage visuel
    document.getElementById('modal-title').innerText = "Modifier l'objet";

    // On affiche l'inventaire et la description
    document.getElementById('m-item-fields').classList.remove('hidden');
    document.getElementById('m-desc').classList.remove('hidden'); // Correction ID ici

    // On cache le reste
    document.getElementById('m-atk-fields').classList.add('hidden');
    document.getElementById('m-spell-fields').classList.add('hidden');
    document.getElementById('m-skill-fields').classList.add('hidden');

    // 3. On affiche la modale
    document.getElementById('modal-ui').classList.remove('hidden');
}

// Fonction pour enregistrer (Ajout ou Edit)
function saveItem() {
    const nom = document.getElementById('m-name').value;
    const weight = parseFloat(document.getElementById('item-weight').value) || 0;
    const qty = parseInt(document.getElementById('item-qty').value) || 1;

    // On utilise le champ générique m-index
    const editIndex = parseInt(document.getElementById('m-index').value);

    if (!nom) return alert("Le nom est obligatoire");

    const itemData = { nom, weight, qty };

    if (editIndex > -1) {
        window.state.inventaire[editIndex] = itemData;
    } else {
        window.state.inventaire.push(itemData);
    }

    closeModal();
    renderAll();

    // Reset du champ générique
    document.getElementById('m-index').value = "-1";
}


function getSortedSpells(criteria) {
    let spells = [...state.spells];
    
    if (criteria === 'niveau') {
        return spells.sort((a, b) => a.niveau - b.niveau);
    }
    if (criteria === 'action') {
        const order = { 'reaction': 1, 'bonus': 2, 'action': 3, 'rituel': 4 };
        return spells.sort((a, b) => order[a.temps] - order[b.temps]);
    }
    // ... autres tris
}

function resetBlessures() {
    window.state.blessures = 0;
    renderAll();
    saveData();
}

function editSpell(index) {
    editingSpellIndex = index;
    const s = window.state.spells[index];
    
    // Champs GÉNÉRIQUES (communs à toutes les modales)
    document.getElementById('m-name').value = s.nom || "";
    document.getElementById('m-desc').value = s.desc || "";
    
    // Champs SPÉCIFIQUES au Grimoire
    document.getElementById('m-spell-rank').value = s.niveau || 0;
    document.getElementById('m-spell-school').value = s.ecole || 'évocation';
    document.getElementById('spell-action-type').value = s.temps || 'action';
    document.getElementById('m-spell-range').value = s.portee || '';
    document.getElementById('m-spell-target').value = s.cible || '';
    document.getElementById('m-spell-duration').value = s.duree || '';
    document.getElementById('m-spell-incantation').value = s.incantation || '';
    
    // Checkboxes
    document.getElementById('comp-v').checked = s.composantes?.v || false;
    document.getElementById('comp-s').checked = s.composantes?.s || false;
    document.getElementById('comp-m').checked = s.composantes?.m || false;
    
    // Configuration de la modale pour le type "spell"
    document.getElementById('m-type').value = 'spell';
    document.getElementById('m-index').value = index;
    
    // On affiche la section des sorts et on cache les autres
    document.getElementById('m-spell-fields').classList.remove('hidden');
    document.getElementById('m-atk-fields').classList.add('hidden');
    document.getElementById('m-skill-fields').classList.add('hidden');
    document.getElementById('m-item-fields').classList.add('hidden');
    
    // On change le titre de la modale
    document.getElementById('modal-title').innerText = "Modifier le sort";
    
    // Affiche la modale (Assure-toi que l'ID est bien modal-ui)
    document.getElementById('modal-ui').classList.remove('hidden');
}
// --- INIT ---
window.onload = checkUser;

// Global Exports
window.handleLogin = handleLogin;
window.editItem = editItem;
window.saveItem = saveItem;
window.getSortedSpells = getSortedSpells;
window.resetBlessures = resetBlessures;
window.editSpell = editSpell;
window.handleSignup = handleSignup;
window.logout = handleLogout;
window.saveData = saveData;
window.closeModal = closeModal;
window.openModal = openModal;
window.switchTab = switchTab;
window.takeRest = takeRest;
window.updateLevel = updateLevel;
window.updateHP = updateHP;
window.toggleSave = toggleSave;
window.toggleSkill = toggleSkill;
window.renderSkills = renderSkillsList;
window.deleteCharacter = deleteCharacter;
window.backToSelection = backToSelection;
window.toggleInspiration = toggleInspiration;
window.updateClassSaves = updateClassSaves;
window.renderStatsList = renderStatsList;
window.renderAll = renderAll;
window.loadUserData = loadUserData;
window.deleteCharacter = deleteCharacter;
window.loadCharactersList = loadCharactersList;
window.createNewCharacter = createNewCharacter;
window.selectCharacter = selectCharacter;
window.loadCharactersList = loadCharactersList;
window.updateHPUI = updateHPUI;
window.renderSavesList = renderSavesList;
window.renderAttaques = renderAttaques;
window.renderCapacites = renderCapacites;
window.renderSpellsList = renderSpellsList;
window.renderInventoryList = renderInventoryList;
window.renderExtras = renderExtras;
window.renderPortrait = renderPortrait;
window.renderNotes = renderNotes;
window.renderInspiration = renderInspiration;
window.renderBlessures = renderBlessures;
window.renderSpellSlots = renderSpellSlots;
window.toggleDesc = toggleDesc;
window.addExtra = addExtra;
window.removeExtra = removeExtra;
window.changePortrait = changePortrait;
window.handleImageUpload = handleImageUpload;
window.addSession = addSession;
window.switchSession = switchSession;
window.saveNotes = saveNotes;
window.deleteCurrentSession = deleteCurrentSession;
window.openMountModal = openMountModal;
window.closeMountModal = closeMountModal;
window.handleMountImageUpload = handleMountImageUpload;
window.renderMountPortrait = renderMountPortrait;
window.renderMountInventory = renderMountInventory;
window.renderMountActions = renderMountActions;
window.renderMount = renderMount;
window.switchTab = switchTab;
window.renderBag = renderBag;
window.subtractMoney = subtractMoney;
window.BAG_TYPES = BAG_TYPES;
window.SKILLS_LIST = SKILLS_LIST;