import { getInitialState, APP_VERSION } from './js/state.js';
import { handleLogin, handleSignup, handleLogout, checkUser } from './js/auth.js';
import { saveToSupabase, loadUserData, deleteCharacter, createNewCharacter, selectCharacter, loadCharactersList } from './js/api.js';
import { renderAll, renderStatsList, renderSavesList, renderSkillsList, renderAttaques, renderCapacites, renderMountActions, renderMount, renderBag, renderSpellsList, renderSpellSlots, renderBlessures, renderInventoryList, renderMountInventory, renderExtras, renderPortrait, renderMountPortrait, renderNotes, renderInspiration, renderTransformationButton, renderWildShapeList } from './js/ui-render.js';
import { openModal, closeModal, closeMountModal, openMountModal, handleMountImageUpload, switchTab, saveData } from './js/ui-modals.js';
import { getProf, SKILLS_LIST, BAG_TYPES, CATALOGUE_SURVIE, subtractMoney, SUBCLASSES_BY_CLASS, TITAN_SPELLS_BY_LEVEL } from './js/utils.js';
import { getEffectiveSkillsAndSaves } from './js/wildshape.js';

// --- DONNÉES DE RÉFÉRENCE & ÉTAT GLOBAL ---
let filterPreparedOnly = false;
let isBackingToSelection = false;
let currentPrepFilter = 'all';

window.currentCharacterId = null;
window.state = getInitialState();

// Dictionnaire des maîtrises par classe
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

// --- CALCULS DES SORTS & COMPÉTENCES ---

window.calculateSpellStats = function() {
    const s = window.state;
    const mastery = Math.ceil(1 + (s.niveau / 4));

    let castingStat = "Charisme"; 
    if (s.classe === "Magicien") castingStat = "Intelligence";
    if (s.classe === "Clerc" || s.classe === "Druide" || s.classe === "Rôdeur") castingStat = "Sagesse";

    const statValue = s.stats[castingStat] || 10;
    const statMod = Math.floor((statValue - 10) / 2);
    const miscBonus = parseInt(s.spellMiscBonus || 0);

    const saveDC = 8 + mastery + statMod + miscBonus;
    const attackBonus = mastery + statMod + miscBonus;

    const dcEl = document.getElementById('display-spell-save-dc');
    const atkEl = document.getElementById('display-spell-attack-bonus');
    const modNameEl = document.getElementById('spell-mod-name');
    const miscEl = document.getElementById('spell-misc-bonus');

    if (dcEl) dcEl.innerText = saveDC;
    if (atkEl) atkEl.innerText = (attackBonus >= 0 ? "+" : "") + attackBonus;
    if (modNameEl) modNameEl.innerText = castingStat.substring(0, 3).toUpperCase();
    if (miscEl) miscEl.value = miscBonus;
};

window.updateSpellMiscBonus = function(val) {
    window.state.spellMiscBonus = parseInt(val) || 0;
    window.calculateSpellStats();
    saveToSupabase();
};

// --- GESTION DU SAC & INVENTAIRE ---

window.promptAddItem = function() {
    const modal = document.getElementById('add-item-modal');
    if (modal) modal.classList.remove('hidden');
};

window.closeAddItemModal = function() {
    const modal = document.getElementById('add-item-modal');
    if (modal) modal.classList.add('hidden');
    document.getElementById('new-item-name').value = '';
    document.getElementById('new-item-desc').value = '';
    document.getElementById('new-item-qty').value = 1;
};

window.confirmAddItem = function() {
    const nom = document.getElementById('new-item-name').value;
    const desc = document.getElementById('new-item-desc').value;
    const taille = parseInt(document.getElementById('new-item-size').value) || 1;
    const qte = parseInt(document.getElementById('new-item-qty').value) || 1;

    if (!nom) {
        alert("L'objet doit avoir un nom !");
        return;
    }

    const inv = window.state.inventory;
    const currentType = inv.type || "CLASSIQUE";
    const capacityMax = BAG_TYPES[currentType].main;
    const usedSlots = inv.pochePrincipale.reduce((sum, item) => sum + (item.taille * item.quantite), 0);
    const encombrementTotal = taille * qte;

    if (usedSlots + encombrementTotal > capacityMax) {
        alert("Pas assez de place dans le sac pour cette quantité !");
        return;
    }

    inv.pochePrincipale.push({ nom, description: desc, taille, quantite: qte, valeur: 0 });
    
    closeAddItemModal();
    renderBag();
    saveToSupabase();
};

window.openBagModal = function() {
    const modal = document.getElementById('bag-modal');
    if (modal) modal.classList.remove('hidden');
    renderBag();
};

window.closeBagModal = function() {
    const modal = document.getElementById('bag-modal');
    if (modal) modal.classList.add('hidden');
};

window.removeItem = function(index, isSurvival) {
    if (isSurvival) window.state.inventory.pocheSurvie.splice(index, 1);
    else window.state.inventory.pochePrincipale.splice(index, 1);
    
    renderBag();
    saveToSupabase();
};

window.updateBagType = function(newType) {
    window.state.inventory.type = newType;
    window.state.inventory.capacityMax = BAG_TYPES[newType].max;
    renderBag();
    saveToSupabase();
};

window.showSurvivalCatalogue = function() {
    const grid = document.getElementById('survival-items-grid');
    if (!grid) return;

    const inv = window.state.inventory;
    const currentType = inv.type || "CLASSIQUE";
    const config = BAG_TYPES[currentType];
    const limits = config.survivalLimits || {};
    
    grid.innerHTML = '';

    const sortedKeys = Object.keys(CATALOGUE_SURVIE).sort((a, b) => {
        const itemA = CATALOGUE_SURVIE[a];
        const itemB = CATALOGUE_SURVIE[b];
        
        const maxA = limits[a] || 0;
        const qteA = (inv.pocheSurvie.find(i => i.key === a))?.quantite || 0;
        const hasSpaceA = maxA > 0 && qteA < maxA;

        const maxB = limits[b] || 0;
        const qteB = (inv.pocheSurvie.find(i => i.key === b))?.quantite || 0;
        const hasSpaceB = maxB > 0 && qteB < maxB;

        if (hasSpaceA && !hasSpaceB) return -1;
        if (!hasSpaceA && hasSpaceB) return 1;
        return itemA.nom.localeCompare(itemB.nom);
    });

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

    document.getElementById('survival-catalogue-modal')?.classList.remove('hidden');
};

window.closeSurvivalCatalogue = function() {
    document.getElementById('survival-catalogue-modal')?.classList.add('hidden');
};

window.addSurvivalItem = function(key) {
    const inv = window.state.inventory;
    const itemTemplate = CATALOGUE_SURVIE[key];
    const currentType = inv.type || "CLASSIQUE";
    const config = BAG_TYPES[currentType];
    
    if (!subtractMoney(window.state.money, itemTemplate.valeur)) {
        alert("Pas assez d'argent !");
        return;
    }

    const limits = config.survivalLimits || {};
    const maxSurvie = limits[key] || 0;
    const itemSurvie = inv.pocheSurvie.find(i => i.key === key);
    const qteSurvie = itemSurvie ? itemSurvie.quantite : 0;

    if (maxSurvie > 0 && qteSurvie < maxSurvie) {
        if (itemSurvie) itemSurvie.quantite += 1;
        else inv.pocheSurvie.push({ ...itemTemplate, key: key, quantite: 1 });
    } else {
        const usedSlots = inv.pochePrincipale.reduce((sum, i) => sum + (i.taille * (i.quantite || 1)), 0);
        if (usedSlots + itemTemplate.taille <= config.main) {
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

    renderBag();
    if (window.renderStats) window.renderStats();
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
        if (!document.getElementById('survival-catalogue-modal')?.classList.contains('hidden')) {
            window.showSurvivalCatalogue();
        }
        saveToSupabase();
    }
};

let draggedItemIndex = null;

window.handleDragStart = function(e, index) {
    draggedItemIndex = index;
    e.dataTransfer.effectAllowed = "move";
    setTimeout(() => {
        e.target.classList.add('opacity-20');
    }, 0);
};

window.handleDragOver = function(e) {
    e.preventDefault();
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
        const [movedItem] = list.splice(draggedItemIndex, 1);
        list.splice(targetIndex, 0, movedItem);

        renderBag();
        saveToSupabase();
    }
    draggedItemIndex = null;
};

window.updateItemQuantity = function(index, delta) {
    const list = window.state.inventory.pochePrincipale;
    const item = list[index];
    const newQty = (parseInt(item.quantite) || 1) + delta;
    
    if (newQty <= 0) {
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
    
    const item = window.state.inventory.pochePrincipale[index];

    if (item && nameInput && descInput) {
        item.nom = nameInput.value;
        item.description = descInput.value;
        if (bonusInput) item.bonusSauvegarde = parseInt(bonusInput.value) || 0;

        renderBag(); 
        if (typeof renderSavesList === "function") renderSavesList();
        saveToSupabase();
    }
};

window.toggleEditMode = function(index) {
    const card = document.getElementById(`item-card-${index}`);
    const editForm = document.getElementById(`edit-form-${index}`);
    const viewContent = document.getElementById(`view-content-${index}`);
    
    if (editForm.classList.contains('hidden')) {
        editForm.classList.remove('hidden');
        viewContent.classList.add('hidden');
        card.setAttribute('draggable', 'false');
        card.classList.remove('cursor-move');
        setTimeout(() => document.getElementById(`edit-name-${index}`).focus(), 50);
    } else {
        renderBag(); 
    }
};

window.editMainItem = function(index) {
    const item = window.state.inventory.pochePrincipale[index];
    const newNom = prompt("Nom de l'objet :", item.nom);
    if (newNom === null) return;

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

// --- MODALES & IMAGES ---

window.editItem = function(index) {
    const it = window.state.inventaire[index];
    if (!it) return;

    document.getElementById('m-type').value = 'item';
    document.getElementById('m-index').value = index;

    document.getElementById('m-name').value = it.nom || "";
    document.getElementById('item-weight').value = it.weight || 0;
    document.getElementById('item-qty').value = it.qty || 1;
    document.getElementById('m-desc').value = it.desc || "";

    document.getElementById('modal-title').innerText = "Modifier l'objet";

    document.getElementById('m-item-fields').classList.remove('hidden');
    document.getElementById('m-desc').classList.remove('hidden');

    document.getElementById('m-atk-fields').classList.add('hidden');
    document.getElementById('m-spell-fields').classList.add('hidden');
    document.getElementById('m-skill-fields').classList.add('hidden');

    document.getElementById('modal-ui').classList.remove('hidden');
};

window.saveItem = function() {
    const nom = document.getElementById('m-name').value;
    const weight = parseFloat(document.getElementById('item-weight').value) || 0;
    const qty = parseInt(document.getElementById('item-qty').value) || 1;
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
    document.getElementById('m-index').value = "-1";
};

window.changePortrait = function() {
    const url = prompt("Collez l'URL de l'image de votre personnage :", window.state.portrait);
    if (url !== null) {
        window.state.portrait = url;
        saveToSupabase();
        renderPortrait();
    }
};

window.handleImageUpload = function(input) {
    const file = input.files[0];
    if (file) {
        if (file.size > 1024 * 1024) {
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
};

// --- GRIMOIRE & SORTS ---

window.deleteSpell = (index) => {
    window.state.spells.splice(index, 1);
    renderSpellsList();
    saveToSupabase();
};

window.resetSpellFilters = () => {
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
    
    renderSpellsList();
};

window.updateUsedSlot = (lvl, change) => {
    const slot = window.state.spellSlots[lvl];
    if (!slot) return;
    
    const newVal = slot.used + change;
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
    if (filterPreparedOnly) {
        btn.classList.add('border-purple-500', 'text-purple-400', 'bg-purple-500/10');
    } else {
        btn.classList.remove('border-purple-500', 'text-purple-400', 'bg-purple-500/10');
    }
    renderSpellsList();
};

window.openPrepModal = () => {
    const container = document.getElementById('prep-spells-list');
    const counter = document.getElementById('prep-counter');
    if (!container) return;
    
    container.innerHTML = '';
    
    let filteredSpells = [...window.state.spells];
    if (currentPrepFilter !== 'all') {
        filteredSpells = filteredSpells.filter(s => s.niveau.toString() === currentPrepFilter);
    }
    
    filteredSpells.sort((a, b) => a.niveau - b.niveau || a.nom.localeCompare(b.nom));
    
    filteredSpells.forEach((spell) => {
        const realIndex = window.state.spells.findIndex(s => s.nom === spell.nom);
        const isPrepared = spell.prepare === true;
        
        const row = document.createElement('div');
        row.className = `flex items-center justify-between p-3 rounded-lg border transition cursor-pointer ${isPrepared ? 'bg-purple-500/10 border-purple-500/50' : 'bg-black/20 border-zinc-800 hover:border-zinc-700'}`;
        row.onclick = () => window.toggleSpellPrepInList(realIndex);
        
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
    
    const totalPrepared = window.state.spells.filter(s => s.prepare).length;
    if (counter) counter.innerText = `${totalPrepared} sort${totalPrepared > 1 ? 's' : ''} préparé${totalPrepared > 1 ? 's' : ''}`;
    
    document.getElementById('modal-prep-spells')?.classList.remove('hidden');
};

window.toggleSpellPrepInList = (index) => {
    window.state.spells[index].prepare = !window.state.spells[index].prepare;
    openPrepModal();
};

window.closePrepModal = () => {
    document.getElementById('modal-prep-spells')?.classList.add('hidden');
    renderSpellsList();
    saveToSupabase();
};

window.editSpell = function(index) {
    const s = window.state.spells[index];
    
    document.getElementById('m-name').value = s.nom || "";
    document.getElementById('m-desc').value = s.desc || "";
    
    document.getElementById('m-spell-rank').value = s.niveau || 0;
    document.getElementById('m-spell-school').value = s.ecole || 'évocation';
    document.getElementById('spell-action-type').value = s.temps || 'action';
    document.getElementById('m-spell-range').value = s.portee || '';
    document.getElementById('m-spell-target').value = s.cible || '';
    document.getElementById('m-spell-duration').value = s.duree || '';
    document.getElementById('m-spell-incantation').value = s.incantation || '';
    
    document.getElementById('comp-v').checked = s.composantes?.v || false;
    document.getElementById('comp-s').checked = s.composantes?.s || false;
    document.getElementById('comp-m').checked = s.composantes?.m || false;
    document.getElementById('m-spell-concentration').checked = s.concentration || false;
    
    document.getElementById('m-type').value = 'spell';
    document.getElementById('m-index').value = index;
    
    document.getElementById('m-spell-fields').classList.remove('hidden');
    document.getElementById('m-atk-fields').classList.add('hidden');
    document.getElementById('m-skill-fields').classList.add('hidden');
    document.getElementById('m-item-fields').classList.add('hidden');
    
    document.getElementById('modal-title').innerText = "Modifier le sort";
    document.getElementById('modal-ui')?.classList.remove('hidden');
};

window.toggleActiveConcentration = function(spellIndex) {
    const state = window.state;
    const spell = state.spells[spellIndex];

    if (!spell.concentration) return;

    state.spells.forEach((s, idx) => {
        if (idx !== spellIndex) s.isActiveCon = false;
    });
    
    spell.isActiveCon = !spell.isActiveCon;
    renderAll(); 
};

window.toggleSpellPreparation = (originalIndex) => {
    const spell = window.state.spells[originalIndex];
    spell.prepare = !spell.prepare;
    renderSpellsList();
    saveToSupabase();
};

window.reorderSpells = (fromIndex, toIndex) => {
    const movedSpell = window.state.spells.splice(fromIndex, 1)[0];
    window.state.spells.splice(toIndex, 0, movedSpell);
    renderSpellsList();
    saveToSupabase();
};

// --- SYSTÈME DE FORME SAUVAGE ---

window.openWildShapeManager = function() {
    const modal = document.getElementById('wildshape-manager-modal');
    if (modal) modal.classList.remove('hidden');
    renderWildShapeList();
};

window.addWildShape = function() {
    const nom = document.getElementById('ws-new-nom')?.value;
    if (!nom) return;

    // Récupère l'image convertie en base64
    const imageBase64 = document.getElementById('ws-new-image-base64')?.value || "";

    const shape = {
        id: Date.now().toString(),
        nom: nom,
        ac: parseInt(document.getElementById('ws-new-ac')?.value) || 10,
        str: parseInt(document.getElementById('ws-new-str')?.value) || 10,
        dex: parseInt(document.getElementById('ws-new-dex')?.value) || 10,
        con: parseInt(document.getElementById('ws-new-con')?.value) || 10,
        speed: document.getElementById('ws-new-speed')?.value || "9m",
        hpMult: Math.min(4, Math.max(1, parseInt(document.getElementById('ws-new-hpmult')?.value) || 4)),
        isTitan: document.getElementById('ws-new-is-titan')?.checked || false,
        image: imageBase64, // Stocke la chaîne base64 de l'image issue du PC
        traits: [],
        attacks: []
    };

    if (!window.state.wildShapes) window.state.wildShapes = [];
    window.state.wildShapes.push(shape);

    // Reset des champs
    document.querySelectorAll('[id^="ws-new-"]').forEach(i => {
        if (i.type === 'checkbox') i.checked = false;
        else i.value = "";
    });
    
    // Réinitialisation spécifique des inputs de fichier
    const fileInput = document.getElementById('ws-new-image-file');
    if (fileInput) fileInput.value = "";
    const base64Input = document.getElementById('ws-new-image-base64');
    if (base64Input) base64Input.value = "";

    if (typeof renderWildShapeList === 'function') renderWildShapeList();
    if (typeof renderTransformationButton === 'function') renderTransformationButton();
    if (typeof saveToSupabase === 'function') saveToSupabase();
};

window.deleteWildShape = function(index) {
    if (!window.state.wildShapes) return;
    window.state.wildShapes.splice(index, 1);
    renderWildShapeList();
    renderTransformationButton();
    if (typeof saveToSupabase === 'function') saveToSupabase();
};

window.toggleTransformation = function(index) {
    const state = window.state;
    if (!state) return;

    if (!state.wildShapeUses) state.wildShapeUses = { current: 2, max: 2 };

    if (state.isTransformed) {
        // --- QUITTER LA FORME SAUVAGE ---
        state.isTransformed = false;
        state.activeShape = null;
        state.activeForm = null;
        state.hp_temp = 0;

        // Restauration de la vitesse de base du personnage
        if (state.baseSpeed !== undefined) {
            state.speed = state.baseSpeed;
        }

    } else {
        // --- PRENDRE LA FORME SAUVAGE ---
        if (index === "" || index === undefined) return;

        if (state.wildShapeUses.current <= 0) {
            alert("Vous n'avez plus d'utilisations de Forme Sauvage disponibles !");
            return;
        }

        const shape = state.wildShapes[index];
        if (!shape) return;

        // 1. Sauvegarde de la vitesse de base du joueur (ex: 9)
        if (state.baseSpeed === undefined) {
            state.baseSpeed = parseFloat(state.speed) || 9;
        }

        state.isTransformed = true;
        state.activeShape = shape;
        state.activeForm = shape; // Nécessaire pour le grisage des sorts non-Titan

        // 2. Extraction numérique de la vitesse de la créature (ex: "12m" -> 12)
        if (shape.speed !== undefined && shape.speed !== null) {
            const numericSpeed = parseFloat(shape.speed.toString().replace(',', '.'));
            state.speed = !isNaN(numericSpeed) ? numericSpeed : state.baseSpeed;
        }

        // Consomme 1 charge
        state.wildShapeUses.current -= 1;

        // Calcul des PV temporaires
        const mult = shape.hpMult || 4;
        const druidLevel = parseInt(state.niveau) || 1;
        state.hp_temp = Math.max(parseInt(state.hp_temp) || 0, mult * druidLevel);
    }

    // 3. Mise à jour directe de l'input HTML #speed
    const speedInput = document.getElementById('speed');
    if (speedInput) {
        speedInput.value = state.speed;
    }

    // 4. Mise à jour immédiate du portrait
    if (typeof renderPortrait === 'function') {
        renderPortrait();
    }

    if (typeof renderAll === 'function') renderAll(true);
};

window.syncTitanSpells = function() {
    const state = window.state;
    if (!state) return;

    const isTitanCircle = state.classe?.toLowerCase().includes('druide') && state.subclasse === "Cercle des titans";
    
    // Si pas Druide des Titans, on retire les sorts de titan injectés automatiquement
    if (!isTitanCircle) {
        state.spells = state.spells.filter(s => !s.isTitanSpell);
        return;
    }

    const druidLevel = parseInt(state.niveau) || 1;

    // Pour chaque palier de niveau (3, 5, 7, 9)
    Object.keys(TITAN_SPELLS_BY_LEVEL).forEach(reqLevel => {
        if (druidLevel >= parseInt(reqLevel)) {
            TITAN_SPELLS_BY_LEVEL[reqLevel].forEach(titanSpell => {
                const alreadyHas = state.spells.some(s => s.nom === titanSpell.nom);
                if (!alreadyHas) {
                    state.spells.push({ ...titanSpell });
                }
            });
        }
    });
};

// --- AUTRES DYNAMIQUES (MONTURE, NOTES, REPOS) ---

window.updateMountStat = function(key, value) {
    const state = window.state;
    if (!state.mountData) state.mountData = {};

    const isNumeric = ['hp', 'hpMax', 'ac', 'str', 'dex', 'con', 'int', 'wis', 'cha', 'perceptionPassive'].includes(key);
    const val = isNumeric ? (parseInt(value) || 0) : value;

    state.mountData[key] = val;

    const statsBase = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    if (statsBase.includes(key)) {
        const mod = Math.floor((val - 10) / 2);
        const modText = mod >= 0 ? `+${mod}` : mod;
        const modEl = document.getElementById(`mod-mount-${key}`);
        if (modEl) {
            modEl.innerText = modText;
            modEl.classList.add('text-amber-600');
        }
    }
    saveToSupabase();
};

window.updateMountSpeed = function(type, value) {
    if (!window.state.mountData) window.state.mountData = {};
    if (typeof window.state.mountData.speed !== 'object' || window.state.mountData.speed === null) {
        window.state.mountData.speed = { sol: "0m", vol: "0m", nage: "0m", escalade: "0m" };
    }
    window.state.mountData.speed[type] = value;
    saveToSupabase();
};

window.updateMountSave = function(stat, value) {
    if (!window.state.mountData.saves) window.state.mountData.saves = {};
    window.state.mountData.saves[stat] = parseInt(value) || 0;
    saveToSupabase();
};

window.updateMountSkillUsage = function(index, change) {
    const skill = window.state.mountData.skills[index];
    if (!skill) return;

    let newVal = (parseInt(skill.current) || 0) + change;
    if (newVal < 0) newVal = 0;
    if (newVal > skill.max) newVal = skill.max;

    skill.current = newVal;
    saveToSupabase();
    renderMountActions();
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

window.updateField = (path, value) => {
    // Conversion propre : si la chaîne est vide ou non numérique, on garde la valeur brute, sinon on cast en Nombre
    const trimmed = typeof value === 'string' ? value.trim() : value;
    const numericValue = Number(trimmed);
    const val = (trimmed === '' || isNaN(numericValue)) ? value : numericValue;

    const keys = path.split('.');
    let target = window.state;
    
    // Traitement sécurisé des clés imbriquées (ex: stats.force)
    for (let i = 0; i < keys.length - 1; i++) {
        if (!target[keys[i]] || typeof target[keys[i]] !== 'object') {
            target[keys[i]] = {};
        }
        target = target[keys[i]];
    }

    target[keys[keys.length - 1]] = val;
    
    // Dérivation spéciale si la propriété modifiée est le niveau
    if (path === 'niveau') {
        const lvl = parseInt(val, 10) || 1;
        window.state.hd_cur = lvl;
        
        if (typeof window.calculateSpellStats === 'function') {
            window.calculateSpellStats();
        }
    }
    
    // Si une statistique ou le niveau change, on rafraîchit toute l'UI
    if (path.startsWith('stats.') || path === 'niveau') {
        if (typeof window.renderAll === 'function') {
            // Passer true si c'est le niveau pour garantir la sauvegarde complète et le rendu du sous-classement
            window.renderAll(path === 'niveau'); 
        }
    }
    
    saveToSupabase();
};

window.takeRest = function(type) {
    const p = getProf();
    const ws = window.state.wildShapeUses || { current: 2, max: 2 };

    if (type === 'long') {
        window.state.hp_cur = window.state.hp_max;
        window.state.hd_cur = window.state.niveau;
        
        // Repos Long : Récupère TOUTES les utilisations de Forme Sauvage
        ws.current = ws.max;

        if (window.state.spellSlots) {
            for (let lvl in window.state.spellSlots) {
                window.state.spellSlots[lvl].used = 0;
            }
        }
        if (window.state.blessures > 0) window.state.blessures -= 1;

    } else if (type === 'court') {
        // Repos Court : Récupère 1 utilisation de Forme Sauvage (jusqu'au max)
        ws.current = Math.min(ws.max, ws.current + 1);
    }

    window.state.wildShapeUses = ws;

    // Réinitialisation des autres capacités
    window.state.capacites.forEach(c => {
        const effectiveMax = c.useProf ? p : (parseInt(c.max) || 0);
        if (effectiveMax > 0) {
            if (type === 'long' || c.reset === 'court') c.current = effectiveMax;
        }
    });

    renderAll();
    saveToSupabase();
};

window.updateLevel = function(v) {
    window.updateField('niveau', v);
};

window.updateHP = function(t, v) { 
    const val = parseInt(v) || 0;

    if (t === 'cur') {
        window.state.hp_cur = val; 
    } else if (t === 'max') {
        window.state.hp_max = Math.max(1, val); 
    } else if (t === 'temp') {
        window.state.hp_temp = Math.max(0, val);
    }

    if (typeof window.updateHPUI === 'function') {
        window.updateHPUI();
    }

    renderAll(); 
};

window.updateHPUI = function() {
    const state = window.state;
    if (!state) return;

    const hpCurEl = document.getElementById('hp-cur');
    const hpMaxEl = document.getElementById('hp-max');
    const hpTempEl = document.getElementById('hp-temp');
    const hpFill = document.getElementById('hp-bar-fill');
    const hpBg = document.getElementById('hp-bar-bg');

    const cur = state.hp_cur || 0;
    const max = state.hp_max || 1;
    const temp = state.hp_temp || 0;

    if (hpCurEl) hpCurEl.value = cur;
    if (hpMaxEl) hpMaxEl.value = max;
    if (hpTempEl) hpTempEl.value = temp;

    // Mise à jour du pourcentage de la barre de PV
    const percent = Math.min(100, Math.max(0, (cur / max) * 100));
    
    if (hpFill) hpFill.style.width = `${percent}%`;
    if (hpBg) hpBg.style.width = `${percent}%`;
};

window.resetBlessures = function() {
    window.state.blessures = 0;
    renderAll();
    saveData();
};

window.toggleSave = function(s) {
    if (window.state.m_saves.includes(s)) {
        window.state.m_saves = window.state.m_saves.filter(x => x !== s);
    } else {
        window.state.m_saves.push(s);
    }
    renderAll();
};

window.toggleSkill = function(n) {
    if (Array.isArray(window.state.m_skills)) {
        const legacy = [...window.state.m_skills];
        window.state.m_skills = {};
        legacy.forEach(name => window.state.m_skills[name] = 1);
    }

    const current = window.state.m_skills[n] || 0;
    const next = (current + 1) % 3;

    if (next === 0) delete window.state.m_skills[n];
    else window.state.m_skills[n] = next;

    renderAll();
};

window.toggleDesc = function(id) {
    if (!window.state.openedDescs) window.state.openedDescs = [];
    if (window.state.openedDescs.includes(id)) {
        window.state.openedDescs = window.state.openedDescs.filter(x => x !== id);
    } else {
        window.state.openedDescs.push(id);
    }
    renderAll();
};

window.toggleSpellDesc = function(spellName) {
    if (!window.state.openedDescs) window.state.openedDescs = [];

    const index = window.state.openedDescs.indexOf(spellName);
    if (index === -1) {
        window.state.openedDescs.push(spellName);
    } else {
        window.state.openedDescs.splice(index, 1);
    }

    // Relance le rendu pour afficher/masquer la description
    if (typeof renderSpellsList === 'function') {
        renderSpellsList();
    }
};

window.addExtra = function(type) {
    const val = prompt(type === 'language' ? "Quelle langue maîtrisez-vous ?" : "Quel outil maîtrisez-vous ?");
    if (val) {
        if (type === 'language') window.state.languages.push(val);
        else window.state.tools.push(val);
        saveToSupabase();
        renderExtras();
    }
};

window.removeExtra = function(type, index) {
    if (type === 'language') window.state.languages.splice(index, 1);
    else window.state.tools.splice(index, 1);
    saveToSupabase();
    renderExtras();
};

window.addSession = function() {
    const title = prompt("Nom de la session :");
    if (title) {
        const newSession = { id: Date.now(), title, content: "" };
        window.state.notes.sessions.push(newSession);
        window.state.notes.currentSessionId = newSession.id;
        saveToSupabase();
        renderNotes();
    }
};

window.switchSession = function(id) {
    window.state.notes.currentSessionId = id;
    renderNotes();
};

window.saveNotes = function(content) {
    const status = document.getElementById('note-status');
    if (status) status.innerText = "Modification...";

    const session = window.state.notes.sessions.find(s => s.id == window.state.notes.currentSessionId);
    if (session) {
        session.content = content;
        clearTimeout(window.saveTimeout);
        window.saveTimeout = setTimeout(() => {
            saveToSupabase();
            if (status) status.innerText = "Enregistré";
        }, 1000);
    }
};

window.deleteCurrentSession = function() {
    if (window.state.notes.sessions.length <= 1) return alert("Il doit rester au moins une session.");
    if (confirm("Supprimer définitivement cette session ?")) {
        window.state.notes.sessions = window.state.notes.sessions.filter(s => s.id != window.state.notes.currentSessionId);
        window.state.notes.currentSessionId = window.state.notes.sessions[0].id;
        saveToSupabase();
        renderNotes();
    }
};

window.toggleInspiration = function() {
    window.state.inspiration = !window.state.inspiration;
    renderInspiration();
    saveData();
};

window.onClassChange = function(newClass) {
    const state = window.state;
    if (!state) return;

    const oldClass = state.classe;

    // 1. Mise à jour de la classe dans le state
    state.classe = newClass;

    // 2. Traitement en cas de changement effectif de classe
    if (oldClass !== newClass) {
        // Reset de la sous-classe
        state.subclasse = "";

        // Purge des sorts de Titan enregistrés
        if (Array.isArray(state.spells)) {
            state.spells = state.spells.filter(s => !s.isTitanSpell);
        }

        // Reset de la valeur de l'input HTML de la sous-classe
        const subSelect = document.getElementById('char-subclass');
        if (subSelect) {
            subSelect.value = "";
        }

        // Réinitialisation de la métamorphose si le personnage n'est plus Druide
        const isDruid = newClass.toLowerCase().includes('druide');
        if (!isDruid && state.isTransformed) {
            state.isTransformed = false;
            state.activeShape = null;
            state.activeForm = null;
            state.hp_temp = 0;
            if (state.baseSpeed !== undefined) {
                state.speed = state.baseSpeed;
            }
        }
    }

    // 3. Recalculs dépendants de la classe
    if (typeof updateClassSaves === 'function') updateClassSaves(newClass);
    if (typeof calculateSpellStats === 'function') calculateSpellStats();

    // 4. Rendu global immédiat (met à jour le grimoire, la liste de sous-classes et l'UI)
    if (typeof renderAll === 'function') {
        renderAll(true);
    }
};

window.onSubclassChange = function(newSubclass) {
    const state = window.state;
    if (!state) return;

    // 1. Mise à jour de la valeur dans le state (via updateField ou directement)
    if (typeof window.updateField === 'function') {
        window.updateField('subclasse', newSubclass);
    } else {
        state.subclasse = newSubclass;
    }

    // 2. Si on choisit autre chose que le Cercle des Titans, on nettoie les sorts de Titan
    const isTitan = newSubclass && newSubclass.toLowerCase().includes('titan');
    if (!isTitan && Array.isArray(state.spells)) {
        state.spells = state.spells.filter(s => !s.isTitanSpell);
    }

    // 3. Re-rendu complet immédiat (déclenche renderSpellsList et charge les sorts quel que soit le niveau)
    if (typeof renderAll === 'function') {
        renderAll(true);
    }
};

window.updateClassSaves = function(className) {
    const normalizedClass = Object.keys(CLASS_SAVES).find(
        k => k.toLowerCase() === className.toLowerCase().trim()
    );

    if (normalizedClass) {
        window.state.m_saves = [...CLASS_SAVES[normalizedClass]];
        renderAll();
    }
};

window.backToSelection = async function() {
    if (isBackingToSelection) return;
    isBackingToSelection = true;
    
    try {
        document.body.style.cursor = 'wait';
        if (window.currentCharacterId) await saveToSupabase();
        
        window.state = getInitialState(); 
        
        const containers = ['spells-list', 'attacks-list', 'inventory-list', 'capacites-list'];
        containers.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '';
        });

        window.currentCharacterId = null;
        document.getElementById('app')?.classList.add('hidden');
        await loadCharactersList();
        
        window.scrollTo(0, 0);
    } catch (error) {
        console.error("Erreur lors du retour :", error);
    } finally {
        document.body.style.cursor = 'default';
        isBackingToSelection = false;
    }
};

// --- INITIALISATION AU CHARGEMENT DE LA PAGE ---

document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('btn-login');
    if (loginBtn) loginBtn.addEventListener('click', handleLogin);
    
    const appVersionEl = document.getElementById('app-version');
    if (appVersionEl) appVersionEl.innerText = `v${APP_VERSION}`;
    
    checkUser(loadCharactersList);
});

// --- ATTACHEMENTS GLOBAUX SUR WINDOW ---

// Functions principales UI & Data
window.renderAll = renderAll;
window.saveData = saveData;
window.saveToSupabase = saveToSupabase;

// Navigation & Modales
window.openModal = openModal;
window.closeModal = closeModal;
window.switchTab = switchTab;

// Authentification & Session
window.handleLogin = handleLogin;
window.handleSignup = handleSignup;
window.logout = handleLogout;
window.checkUser = checkUser;

// Gestion des Personnages & API
window.loadUserData = loadUserData;
window.loadCharactersList = loadCharactersList;
window.createNewCharacter = createNewCharacter;
window.selectCharacter = selectCharacter;
window.deleteCharacter = deleteCharacter;
window.backToSelection = backToSelection;

// Rendu des composantes
window.renderStatsList = renderStatsList;
window.renderSavesList = renderSavesList;
window.renderSkills = renderSkillsList;
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
window.renderBag = renderBag;

// Formes Sauvages
window.renderTransformationButton = renderTransformationButton;
window.renderWildShapeList = renderWildShapeList;

// Monture
window.openMountModal = openMountModal;
window.closeMountModal = closeMountModal;
window.handleMountImageUpload = handleMountImageUpload;
window.renderMountPortrait = renderMountPortrait;
window.renderMountInventory = renderMountInventory;
window.renderMountActions = renderMountActions;
window.renderMount = renderMount;

// Utilitaires
window.BAG_TYPES = BAG_TYPES;
window.SKILLS_LIST = SKILLS_LIST;
window.subtractMoney = subtractMoney;
window.SUBCLASSES_BY_CLASS = SUBCLASSES_BY_CLASS;
window.TITAN_SPELLS_BY_LEVEL = TITAN_SPELLS_BY_LEVEL;