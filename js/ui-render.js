// js/ui-render.js
import { getMod, getProf, SKILLS_LIST, statsOrder } from './utils.js';
import { saveToSupabase } from './api.js';

/**
 * Fonction maîtresse qui rafraîchit l'intégralité de la fiche
 * @param {boolean} shouldSave - Si vrai, lance une sauvegarde auto sur Supabase
 */

export function renderAll(shouldSave = true) {
    const state = window.state;
    if (!state) return;

    const p = getProf();

    // --- 1. INPUTS DE BASE (TEXTE & NOMBRES) ---
    const basicInputs = {
        'char-name': state.nom,
        'char-race': state.race || "Humain",
        'char-class': state.classe,
        'char-level': state.niveau,
        'char-ac': state.ac,
        'hp-cur': state.hp_cur,
        'hp-max': state.hp_max,
        'hd-cur': state.hd_cur,
        'gold-pp': state.money.pp,
        'gold-po': state.money.po,
        'gold-pa': state.money.pa,
        'gold-pc': state.money.pc
    };

    for (const [id, val] of Object.entries(basicInputs)) {
        const el = document.getElementById(id);
        if (el) el.value = val;
    }

    // Cas spécifique : Speed
    const speedEl = document.getElementById('speed');
    if (speedEl) speedEl.value = state.speed || 9;

    // --- 2. TEXTES CALCULÉS (BONUS) ---
    const profBonusEl = document.getElementById('prof-bonus');
    if (profBonusEl) profBonusEl.innerText = `+${p}`;

    const hdMaxEl = document.getElementById('hd-max');
    if (hdMaxEl) hdMaxEl.innerText = state.niveau;

    // --- 3. CALCULS COMPLEXES (INITIATIVE & PERCEPTION) ---
    // Initiative
    const init = getMod(state.stats.Dextérité);
    const initEl = document.getElementById('init-bonus');
    if (initEl) initEl.innerText = (init >= 0 ? '+' : '') + init;

    // Perception Passive
    let perceptionLevel = 0;
    if (state.m_skills) {
        if (Array.isArray(state.m_skills)) {
            perceptionLevel = state.m_skills.includes("Perception") ? 1 : 0;
        } else {
            perceptionLevel = parseInt(state.m_skills["Perception"]) || 0;
        }
    }
    const wisdomMod = getMod(state.stats.Sagesse || 10);
    const passiveValue = 10 + wisdomMod + (perceptionLevel * p);
    
    const passiveEl = document.getElementById('passive-perception');
    if (passiveEl) passiveEl.innerText = passiveValue;

    // --- 4. APPELS DES RENDUS DE LISTES ---
    // On s'assure que ces fonctions existent avant de les appeler
    if (window.updateHPUI) window.updateHPUI();
    
    // Listes dynamiques (doivent être exportées sur window ou présentes dans ce fichier)
    renderStatsList();
    renderSavesList();
    renderSkillsList();
    renderAttaques();
    renderBlessures();
    renderCapacites();
    renderSpellsList();
    renderSpellSlots();
    renderInventoryList();
    renderExtras();
    renderPortrait();
    renderMountPortrait();
    renderMountInventory();
    renderMount();
    renderNotes();
    renderInspiration();
    renderMountActions();

    // --- 5. SAUVEGARDE ---
    if (shouldSave) saveToSupabase();
}

export function renderStatsList() {
    const container = document.getElementById('stats-area');
    if (!container || !window.state.stats) return;

    // L'ordre d'affichage des statistiques

    container.innerHTML = statsOrder.map(k => {
        const v = window.state.stats[k] || 10;
        const mod = getMod(v);
        
        return `
            <div class="flex justify-between items-center bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
                <span class="text-[10px] uppercase font-bold text-zinc-500">${k}</span>
                <div class="flex items-center gap-3">
                    <input type="number" value="${v}" 
                        oninput="window.updateField('stats.${k}', this.value)" 
                        class="w-12 text-center bg-transparent !border-none font-bold outline-none text-white">
                    
                    <span class="text-white font-black text-base w-8 text-right">
                        ${(mod >= 0 ? '+' : '') + mod}
                    </span>
                </div>
            </div>`;
    }).join('');
}

export function renderSavesList() {
    const container = document.getElementById('saves-area');
    const state = window.state;
    if (!container || !state) return;

    const p = getProf();
    const statsOrder = ["Force", "Dextérité", "Constitution", "Intelligence", "Sagesse", "Charisme"];

    container.innerHTML = statsOrder.map(s => {
        // On vérifie si la sauvegarde est maîtrisée (présente dans le tableau m_saves)
        const isChecked = state.m_saves && state.m_saves.includes(s);
        
        // Calcul du modificateur : Mod de Stat + (Bonus de Maîtrise si coché)
        const baseMod = getMod(state.stats[s] || 10);
        const totalMod = baseMod + (isChecked ? p : 0);

        return `
            <div class="stat-row-layout hover:bg-white/5 transition-colors">
                <input type="checkbox" 
                       class="custom-checkbox" 
                       ${isChecked ? 'checked' : ''} 
                       onchange="window.toggleSave('${s}')">
                
                <span class="text-[11px] font-bold uppercase tracking-tight text-zinc-400">${s}</span>
                
                <span class="text-right font-black text-amber-500 text-xs">
                    ${(totalMod >= 0 ? '+' : '') + totalMod}
                </span>
            </div>`;
    }).join('');
}

export function renderSkillsList() {
    const state = window.state;
    const container = document.getElementById('skills-area');
    if (!container || !state) return;

    const p = getProf();
    const search = (document.getElementById('skill-search')?.value || "").toLowerCase();
    
    // --- 1. Sécurité & Migration (Si m_skills est encore un tableau) ---
    if (Array.isArray(state.m_skills)) {
        const legacy = [...state.m_skills];
        state.m_skills = {};
        legacy.forEach(name => state.m_skills[name] = 1);
    }

    const skills = SKILLS_LIST || [];

    container.innerHTML = skills
        .filter(s => s.n.toLowerCase().includes(search))
        .map(s => {
            const level = state.m_skills[s.n] || 0; // 0: rien, 1: Maîtrise, 2: Expertise
            const baseStatMod = getMod(state.stats[s.s] || 10);
            const totalMod = baseStatMod + (level * p);
            
            // --- 3. Gestion Visuelle ---
            let dotClass = "border-zinc-700 bg-black/20"; 
            let content = "";
            
            if (level === 1) {
                dotClass = "bg-purple-500 border-purple-400"; // Maîtrise
            } else if (level === 2) {
                dotClass = "bg-amber-500 border-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.4)]"; // Expertise
                content = '<span class="text-[7px] text-black font-black">E</span>';
            }

            return `
                <div class="stat-row-layout hover:bg-white/5 transition-colors cursor-pointer" 
                     onclick="window.toggleSkill('${s.n}')">
                    <div class="w-3 h-3 rounded-full border flex items-center justify-center transition-all ${dotClass}">
                        ${content}
                    </div>
                    <span class="text-[11px] font-medium text-zinc-400">${s.n}</span>
                    <span class="text-right font-black text-amber-500/80 text-xs">
                        ${(totalMod >= 0 ? '+' : '') + totalMod}
                    </span>
                </div>`;
        }).join('');
}

export function renderAttaques() {
    const state = window.state;
    const container = document.getElementById('attacks-list');
    const template = document.getElementById('template-attaque');
    
    if (!container || !template || !state.attaques) return;
    
    container.innerHTML = '';
    const p = getProf();

    state.attaques.forEach((a, i) => {
        const id = `atk-${i}`;
        const clone = template.content.cloneNode(true);
        const root = clone.querySelector('.item-card');

        // 1. Calculs des bonus
        const statMod = (a.stat === 'Aucune') ? 0 : getMod(state.stats[a.stat] || 10);
        const hitBonus = statMod + (a.prof ? p : 0) + (parseInt(a.misc) || 0);
        const dmgBonus = statMod + (parseInt(a.misc) || 0);

        // 2. Injection Nom et Toucher
        root.querySelector('.atk-nom').innerText = a.nom;
        root.querySelector('.atk-hit-bonus').innerText = (hitBonus >= 0 ? '+' : '') + hitBonus;

        // 3. Gestion des dégâts
        const dmgDisplay = root.querySelector('.atk-dmg-display');
        const bonusStr = dmgBonus !== 0 ? (dmgBonus > 0 ? '+' : '') + dmgBonus : '';
        
        let dmgHTML = `<span>${a.dice}${bonusStr}</span>`;
        if (a.hasSecondary && a.dice2) {
            dmgHTML += ` <span class="text-zinc-600 text-[10px] mx-0.5">+</span> <span class="text-amber-600/80">${a.dice2}</span>`;
        }
        dmgDisplay.innerHTML = dmgHTML;

        // 4. Gestion du type de dégâts
        const typeBadge = root.querySelector('.atk-type-badge');
        if (typeBadge) {
            if (a.damageType) {
                typeBadge.classList.remove('hidden');
                let typeHTML = `<span>${a.damageType}</span>`;
                if (a.hasSecondary && a.damageType2) {
                    typeHTML += ` <span class="text-zinc-600 mx-1">/</span> <span>${a.damageType2}</span>`;
                }
                typeBadge.innerHTML = typeHTML;

                // Coloration dynamique
                if (a.damageType === 'Feu') typeBadge.style.color = '#ef4444';
                else if (a.damageType === 'Froid') typeBadge.style.color = '#60a5fa';
                else typeBadge.style.color = ''; 
            } else {
                typeBadge.classList.add('hidden');
            }
        }

        root.querySelector('.atk-desc-text').innerText = a.desc || "";

        // 5. État déplié/plié
        if (state.openedDescs.includes(id)) {
            root.querySelector('.atk-desc-container').classList.add('open');
        }

        // 6. Événements (Utilisation des fonctions sur window)
        root.querySelector('[data-action="toggle"]').onclick = (e) => {
            if (e.target.tagName !== 'BUTTON' && window.toggleDesc) window.toggleDesc(id);
        };

        root.querySelector('.atk-edit').onclick = () => {
            if (window.openModal) window.openModal('attack', i);
        };

        root.querySelector('.atk-delete').onclick = () => { 
            if (confirm('Supprimer ?')) { 
                state.attaques.splice(i, 1); 
                window.renderAll(); 
            } 
        };

        // 7. Drag & Drop
        root.ondragstart = (e) => e.dataTransfer.setData('idx', i);
        root.ondragover = (e) => e.preventDefault();
        root.ondrop = (e) => {
            const from = e.dataTransfer.getData('idx');
            const moved = state.attaques.splice(from, 1)[0];
            state.attaques.splice(i, 0, moved);
            window.renderAll();
        };

        container.appendChild(clone);
    });
}

export function renderCapacites() {
    const state = window.state;
    const container = document.getElementById('skills-list'); // Note: ton ID est skills-list dans le HTML original
    const template = document.getElementById('template-capacite');
    
    if (!container || !template || !state.capacites) return;
    
    container.innerHTML = '';
    const p = getProf();

    state.capacites.forEach((c, i) => {
        const id = `cap-${i}`;
        const clone = template.content.cloneNode(true);
        const root = clone.querySelector('.item-card');

        // --- LOGIQUE DU MAXIMUM ---
        const effectiveMax = c.useProf ? p : (parseInt(c.max) || 0);

        // Sécurité : ajustement si le niveau change
        if (c.current > effectiveMax) c.current = effectiveMax;

        // --- AFFICHAGE TEXTES ---
        root.querySelector('.cap-nom').innerText = c.nom;
        root.querySelector('.cap-desc-text').innerText = c.desc || "";

        // --- GESTION DU BADGE (REPOS) ---
        const badge = root.querySelector('.cap-badge');
        if (c.reset && c.reset !== 'none') {
            badge.classList.remove('hidden');
            badge.innerText = c.reset === 'court' ? 'R. Court' : 'R. Long';
        } else {
            badge.classList.add('hidden');
        }

        // --- GESTION DES UTILISATIONS ---
        const usageBox = root.querySelector('.cap-usage-box');
        if (effectiveMax > 0) {
            usageBox.classList.remove('hidden');
            root.querySelector('.cap-max').innerText = effectiveMax;

            const input = root.querySelector('.cap-current');
            input.value = c.current;

            // Mise à jour de la valeur
            input.onchange = (e) => {
                let val = parseInt(e.target.value) || 0;
                if (val > effectiveMax) val = effectiveMax;
                if (val < 0) val = 0;

                e.target.value = val;

                window.state.capacites[i].current = val;
                
                if (window.saveToSupabase) {
                    saveToSupabase(); 
                }
            };
        } else {
            usageBox.classList.add('hidden');
        }

        // --- ÉTAT DÉPLIÉ ---
        if (state.openedDescs.includes(id)) {
            root.querySelector('.cap-desc-container').classList.add('open');
        }

        // --- ÉVÉNEMENTS ---
        root.querySelector('[data-action="toggle"]').onclick = (e) => {
            // Empêche de fermer/ouvrir si on clique sur l'input ou un bouton
            if (e.target.tagName !== 'INPUT' && !e.target.closest('button')) {
                if (window.toggleDesc) window.toggleDesc(id);
            }
        };

        root.querySelector('.cap-edit').onclick = () => {
            if (window.openModal) window.openModal('skill', i);
        };

        root.querySelector('.cap-delete').onclick = () => {
            if (confirm('Supprimer cette capacité ?')) {
                state.capacites.splice(i, 1);
                renderAll();
            }
        };

        // --- DRAG & DROP ---
        root.ondragstart = (e) => e.dataTransfer.setData('idx', i);
        root.ondragover = (e) => e.preventDefault();
        root.ondrop = (e) => {
            const from = e.dataTransfer.getData('idx');
            const moved = state.capacites.splice(from, 1)[0];
            state.capacites.splice(i, 0, moved);
            renderAll();
        };

        container.appendChild(clone);
    });
}

/**
 * Rendu de la liste des sorts avec filtres et catégories
 */
export function renderSpellsList() {
    const state = window.state;
    const container = document.getElementById('spells-list');
    if (!container || !state.spells) return;

    const searchTerm = document.getElementById('spell-search')?.value.toLowerCase() || "";
    const filterRank = document.getElementById('spell-filter-rank')?.value || "all";
    const filterAction = document.getElementById('spell-filter-action')?.value || "all";
    const filterPreparedOnly = window.filterPreparedOnly || false;

    container.innerHTML = '';
    container.className = "space-y-6";

    // Map pour garder l'index original malgré le filtrage/tri
    let spellsWithIndexes = state.spells.map((spell, originalIndex) => ({
        ...spell,
        originalIndex: originalIndex
    }));

    if (!state.openedDescs) state.openedDescs = [];

    let filtered = spellsWithIndexes
        .filter(s => s.nom.toLowerCase().includes(searchTerm))
        .filter(s => filterRank === "all" || s.niveau.toString() === filterRank)
        .filter(s => filterAction === "all" || s.temps === filterAction);

    // 1. Les Cantrips (Niveau 0)
    const cantrips = filtered.filter(s => s.niveau == 0);

    // 2. Les Sorts Préparés (Niveau 1+)
    const preparedSpells = filtered.filter(s => s.niveau > 0 && s.prepare === true);

    // 3. Le Grimoire (Niveau 1+ non préparés)
    const grimoireSpells = filtered.filter(s => s.niveau > 0 && s.prepare !== true)
                                   .sort((a, b) => a.niveau - b.niveau);

    // --- RENDU DES SECTIONS ---
    if (cantrips.length > 0) {
        renderSpellSection(container, "Sorts Mineurs (Cantrips)", cantrips, "text-amber-500");
    }

    if (preparedSpells.length > 0) {
        renderSpellSection(container, "Sorts Préparés", preparedSpells, "text-purple-500");
    }

    if (grimoireSpells.length > 0 && !filterPreparedOnly) {
        renderSpellSection(container, "Grimoire (Non préparés)", grimoireSpells, "text-zinc-600");
    }
}

export function renderSpellSlots() {
    const state = window.state;
    const container = document.getElementById('spell-slots-container');
    
    if (!container || !state.spellSlots) return;

    container.innerHTML = '';
    
    // On boucle de 1 à 9 (les niveaux de sorts)
    for (let lvl = 1; lvl <= 9; lvl++) {
        const slot = state.spellSlots[lvl];
        if (!slot) continue; // Sécurité si un niveau manque dans le state

        const div = document.createElement('div');
        div.className = "bg-zinc-900/60 border border-zinc-800 rounded-lg p-2 flex flex-col items-center gap-1 min-w-0 w-full";
        
        const dispo = slot.max - slot.used;

        div.innerHTML = `
            <div class="flex justify-between w-full items-center mb-1">
                <span class="text-[9px] font-black text-zinc-500 uppercase italic">Niv. ${lvl}</span>
                <button onclick="window.setupMaxSlots(${lvl})" 
                        class="text-[10px] hover:text-purple-500 text-zinc-700 transition-colors" 
                        title="Configurer le maximum">
                    ⚙️
                </button>
            </div>
            <div class="flex items-center gap-2">
                <button onclick="window.updateUsedSlot(${lvl}, 1)" 
                        class="text-zinc-500 hover:text-white font-bold w-4 h-4 flex items-center justify-center">-</button>
                
                <span class="text-xs font-black ${dispo <= 0 && slot.max > 0 ? 'text-red-500' : 'text-purple-400'}">
                    ${slot.max > 0 ? dispo : '--'}
                </span>
                
                <button onclick="window.updateUsedSlot(${lvl}, -1)" 
                        class="text-zinc-500 hover:text-white font-bold w-4 h-4 flex items-center justify-center">+</button>
            </div>
            <div class="w-full flex gap-0.5 mt-1">
                ${slot.max > 0 ? Array.from({ length: slot.max }).map((_, i) => `
                    <div class="h-1 flex-1 rounded-full ${i < dispo ? 'bg-purple-600 shadow-[0_0_5px_rgba(147,51,234,0.5)]' : 'bg-zinc-800'}"></div>
                `).join('') : '<div class="h-1 w-full bg-zinc-800/30 rounded-full"></div>'}
            </div>
        `;
        container.appendChild(div);
    }
}

export function renderBlessures() {
    const state = window.state;
    const container = document.getElementById('blessures-container');
    const statusLabel = document.getElementById('death-status');
    
    if (!container) return;

    container.innerHTML = '';

    // Initialisation si inexistant
    if (state.blessures === undefined) state.blessures = 0;

    for (let i = 1; i <= 6; i++) {
        const isFilled = i <= state.blessures;
        const bolt = document.createElement('div');

        // Style de la "case" éclair
        bolt.className = `cursor-pointer transition-all duration-300 transform ${
            isFilled ? 'scale-110' : 'hover:scale-110 opacity-50'
        }`;

        bolt.innerHTML = `
            <svg width="24" height="30" viewBox="0 0 24 30" fill="none" xmlns="http://www.w3.org/2000/svg" 
                 style="filter: ${isFilled ? 'drop-shadow(0 0 8px rgba(220, 38, 38, 0.8))' : 'none'}">
                <path d="M13 1L1 16H11L9 29L23 11H13L15 1H13Z" 
                      stroke="${isFilled ? '#ef4444' : '#3f3f46'}" 
                      stroke-width="2" 
                      fill="${isFilled ? '#ef4444' : 'transparent'}" 
                      stroke-linejoin="round"/>
            </svg>
        `;

        bolt.onclick = () => {
            // Logique de toggle : si on clique sur le dernier éclair rempli, on l'enlève
            state.blessures = (state.blessures === i) ? i - 1 : i;
            
            // On rafraîchit tout (pour mettre à jour le label et sauvegarder)
            if (window.renderAll) window.renderAll();
        };

        container.appendChild(bolt);
    }

    // Mise à jour du texte de statut
    if (statusLabel) {
        if (state.blessures >= 6) { 
            statusLabel.innerText = "DÉCÉDÉ"; 
            statusLabel.style.color = "#ef4444"; 
        } else if (state.blessures >= 4) { 
            statusLabel.innerText = "AGONISANT"; 
            statusLabel.style.color = "#f97316"; 
        } else if (state.blessures > 0) { 
            statusLabel.innerText = "BLESSÉ"; 
            statusLabel.style.color = "#fbbf24"; 
        } else { 
            statusLabel.innerText = "STABLE"; 
            statusLabel.style.color = "#71717a"; 
        }
    }
}

/**
 * Rendu de la liste d'inventaire avec template
 */
export function renderInventoryList() {
    // On met à jour la barre de charge d'abord
    updateWeightUI();

    const container = document.getElementById('inventory-list');
    const template = document.getElementById('template-item-inventaire');

    if (!container || !template || !window.state.inventaire) return;

    container.innerHTML = ''; 

    window.state.inventaire.forEach((it, i) => {
        const clone = template.content.cloneNode(true);
        const root = clone.querySelector('.item-card') || clone.firstElementChild;

        // Sécurité quantité
        if (!it.qty) it.qty = 1;

        // Remplissage des textes
        clone.querySelector('.item-name').textContent = it.nom;
        clone.querySelector('.item-weight').textContent = `${(it.weight * it.qty).toFixed(1)}kg (${it.weight}kg/u)`;
        clone.querySelector('.item-qty').textContent = it.qty;

        // --- ACTIONS ---
        
        // Plus (+)
        clone.querySelector('.btn-plus').onclick = (e) => {
            e.stopPropagation();
            window.state.inventaire[i].qty++;
            if (window.renderAll) window.renderAll();
        };

        // Moins (-)
        clone.querySelector('.btn-minus').onclick = (e) => {
            e.stopPropagation();
            if (window.state.inventaire[i].qty > 1) {
                window.state.inventaire[i].qty--;
                if (window.renderAll) window.renderAll();
            }
        };

        // Éditer (Note: vérifie si ta fonction est editItem ou openModal)
        clone.querySelector('.btn-edit').onclick = (e) => {
            e.stopPropagation();
            if (window.openModal) {
                window.openModal('item', i);
            } else if (window.editItem) {
                window.editItem(i);
            }
        };

        // Supprimer
        clone.querySelector('.btn-delete').onclick = (e) => {
            e.stopPropagation();
            if (confirm(`Supprimer ${it.nom} ?`)) {
                window.state.inventaire.splice(i, 1);
                if (window.renderAll) window.renderAll();
            }
        };

        container.appendChild(clone);
    });
}

/**
 * Rendu des listes de langues et de maîtrise d'outils (Extras)
 */
export function renderExtras() {
    const state = window.state;
    const langContainer = document.getElementById('languages-list');
    const toolContainer = document.getElementById('tools-list');

    if (!langContainer || !toolContainer) return;

    // Rendu des Langues (utilisation de window.removeExtra pour l'action)
    langContainer.innerHTML = (state.languages || []).map((l, i) => `
        <span class="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-[11px] text-zinc-300 flex items-center gap-2 group hover:border-zinc-700 transition-colors">
            ${l}
            <button onclick="window.removeExtra('language', ${i})" 
                    class="text-zinc-600 hover:text-red-500 transition-colors" 
                    title="Supprimer">✕</button>
        </span>
    `).join('') || '<span class="text-[10px] italic text-zinc-700">Aucune langue</span>';

    // Rendu des Outils
    toolContainer.innerHTML = (state.tools || []).map((t, i) => `
        <span class="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-[11px] text-zinc-300 flex items-center gap-2 group hover:border-zinc-700 transition-colors">
            ${t}
            <button onclick="window.removeExtra('tool', ${i})" 
                    class="text-zinc-600 hover:text-red-500 transition-colors" 
                    title="Supprimer">✕</button>
        </span>
    `).join('') || '<span class="text-[10px] italic text-zinc-700">Aucun outil</span>';
}

export function renderPortrait() {
    const state = window.state;
    const img = document.getElementById('char-portrait');
    const placeholder = document.getElementById('portrait-placeholder');

    if (!img || !placeholder) return;

    if (state.portrait && state.portrait.trim() !== "") {
        img.src = state.portrait;
        img.classList.remove('hidden');
        placeholder.classList.add('hidden');
    } else {
        img.src = "";
        img.classList.add('hidden');
        placeholder.classList.remove('hidden');
    }
}

/**
 * Met à jour l'affichage du portrait de la monture
 */
export function renderMountPortrait() {
    const state = window.state;
    const img = document.getElementById('mount-img');
    const placeholder = document.getElementById('mount-placeholder');

    if (!img || !placeholder || !state.mountData) return;

    if (state.mountData.image && state.mountData.image.startsWith('data:image')) {
        img.src = state.mountData.image;
        img.classList.remove('hidden');
        placeholder.classList.add('hidden');
    } else {
        img.classList.add('hidden');
        placeholder.classList.remove('hidden');
    }
}

export function renderMountInventory() {
    const state = window.state;
    if (!state.mountData) return;

    const renderSide = (items, containerId, type) => {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = ""; // On vide

        if (!items || items.length === 0) {
            container.innerHTML = `<div class="text-[10px] text-zinc-600 text-center py-4 italic">Sacoche vide</div>`;
            return;
        }

        items.forEach((item, index) => {
            const itemEl = document.createElement('div');
            itemEl.className = "group bg-black/40 border border-zinc-800 hover:border-amber-600/50 p-2 rounded-lg transition-all cursor-pointer relative";
            
            // Au clic, on ouvre la modale en mode édition
            itemEl.onclick = () => window.openModal(type, index);

            itemEl.innerHTML = `
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <div class="text-[11px] font-black uppercase text-zinc-300 group-hover:text-amber-500 transition-colors">${item.nom}</div>
                        <div class="text-[9px] text-zinc-500 line-clamp-1">${item.desc || 'Pas de description'}</div>
                    </div>
                    <div class="text-[10px] font-bold text-amber-600/70 ml-2">${item.weight || 0}kg</div>
                </div>
                
                <button onclick="event.stopPropagation(); window.deleteMountItem('${type}', ${index})" 
                    class="absolute -top-1 -right-1 w-4 h-4 bg-red-900/80 text-white text-[8px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    ✕
                </button>
            `;
            container.appendChild(itemEl);
        });
    };

    renderSide(state.mountData.inventoryLeft, 'mount-inv-left', 'mount-item-left');
    renderSide(state.mountData.inventoryRight, 'mount-inv-right', 'mount-item-right');
}

export function renderMount() {
    const mount = window.state.mountData;
    if (!mount) return;

    // On remplit les champs HTML avec les données du state
    document.getElementById('mount-name').value = mount.name || "";
    document.getElementById('mount-ac').value = mount.ac || 10;
    document.getElementById('mount-hp').value = mount.hp_cur || 0;
    document.getElementById('mount-speed').value = mount.speed || "18m";
    document.getElementById('mount-fly-speed').value = mount.fly_speed || "0m";
    
    // Stats
    document.getElementById('mount-str').value = mount.str || 10;
    document.getElementById('mount-dex').value = mount.dex || 10;
    document.getElementById('mount-con').value = mount.con || 10;
    document.getElementById('mount-int').value = mount.int || 10;
    document.getElementById('mount-wis').value = mount.wis || 10;
    document.getElementById('mount-cha').value = mount.cha || 10;

    // N'oublie pas de vider et re-remplir tes listes d'attaques/capacités ici aussi
};

export function renderMountActions() {
    const state = window.state;
    if (!state || !state.mountData) return;

    if (!state.mountData.attacks) state.mountData.attacks = [];
    if (!state.mountData.skills) state.mountData.skills = [];

    const actionsContainer = document.getElementById('mount-actions-list');
    const skillsContainer = document.getElementById('mount-skills-list');

    // --- 1. RENDU DES ATTAQUES ---
    if (actionsContainer) {
        actionsContainer.innerHTML = state.mountData.attacks.map((atk, i) => {
            // Calcul des bonus (For ou Dex de la monture + Prof si coché)
            const statMod = Math.floor(((state.mountData[atk.stat] || 10) - 10) / 2);
            const profBonus = atk.prof ? 2 : 0; // Tu peux remplacer 2 par une variable de niveau si besoin
            const hitBonus = statMod + profBonus + (atk.misc || 0);
            const dmgBonus = statMod + (atk.misc || 0);

            return `
                <div class="group bg-white/5 border-l-2 border-amber-600 mb-2 overflow-hidden transition-all shadow-sm">
                    <div onclick="this.parentElement.classList.toggle('is-expanded')" 
                         class="flex justify-between items-center p-2 cursor-pointer hover:bg-white/10">
                        <div class="flex flex-col">
                            <span class="text-[10px] font-black uppercase text-amber-800 tracking-wider">${atk.nom}</span>
                            <div class="flex gap-2 mt-1">
                                <span class="text-[9px] bg-amber-900/10 px-1 rounded text-amber-900 font-bold">
                                    +${hitBonus} touché
                                </span>
                                <span class="text-[9px] bg-zinc-900/10 px-1 rounded text-zinc-700 font-bold">
                                    ${atk.dice}${dmgBonus >= 0 ? '+' : ''}${dmgBonus} dégâts
                                </span>
                            </div>
                        </div>
                        <button onclick="event.stopPropagation(); openModal('mount-attack', ${i})" class="text-[10px] text-zinc-400 hover:text-amber-600">✎</button>
                    </div>
                    <div class="description-content px-2 pb-2 text-[9px] text-zinc-600 italic border-t border-amber-900/5 mt-1 hidden">
                        ${atk.desc || 'Pas de description.'}
                    </div>
                </div>
            `;
        }).join('');
    }

    // --- 2. RENDU DES CAPACITÉS ---
    if (skillsContainer) {
        skillsContainer.innerHTML = state.mountData.skills.map((sk, i) => {
            const dots = sk.max > 0 ? `
                <div class="flex items-center gap-1 bg-black/5 px-2 py-1 rounded-full">
                    <button onclick="event.stopPropagation(); window.updateMountSkillUsage(${i}, -1)" class="text-[10px] font-bold text-zinc-500 hover:text-red-600">-</button>
                    <span class="text-[9px] font-black text-zinc-800 min-w-[25px] text-center">${sk.current} / ${sk.max}</span>
                    <button onclick="event.stopPropagation(); window.updateMountSkillUsage(${i}, 1)" class="text-[10px] font-bold text-zinc-500 hover:text-green-600">+</button>
                </div>
            ` : '';

            const resetLabel = sk.reset === 'long' ? 'Repos Long' : sk.reset === 'court' ? 'Repos Court' : '';
            const resetClass = sk.reset === 'long' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700';

            return `
                <div class="group bg-white/5 border-l-2 border-zinc-400 mb-2 overflow-hidden transition-all shadow-sm">
                    <div onclick="this.parentElement.classList.toggle('is-expanded')" 
                         class="p-2 cursor-pointer hover:bg-white/10">
                        <div class="flex justify-between items-center mb-1">
                            <div class="flex flex-col">
                                <span class="text-[10px] font-black uppercase text-zinc-800">${sk.nom}</span>
                                ${resetLabel ? `<span class="text-[7px] font-bold uppercase ${resetClass} self-start px-1 mt-0.5 rounded">${resetLabel}</span>` : ''}
                            </div>
                            ${dots}
                        </div>
                    </div>
                    <div class="description-content px-2 pb-2 text-[9px] text-zinc-600 border-t border-zinc-900/5 mt-1 hidden">
                        ${sk.desc || 'Pas de description.'}
                        <div class="mt-2 text-right">
                             <button onclick="event.stopPropagation(); openModal('mount-skill', ${i})" class="text-[8px] uppercase font-black text-zinc-400 hover:text-zinc-800 underline">Modifier</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
}

export function renderNotes() {
    const state = window.state;
    const selector = document.getElementById('session-selector');
    const textarea = document.getElementById('session-notes');
    
    if (!selector || !textarea) return;

    // Sécurité : Initialisation si les notes sont absentes du state
    if (!state.notes) {
        state.notes = { sessions: [{ id: Date.now(), title: "Session 1", content: "" }], currentSessionId: null };
        state.notes.currentSessionId = state.notes.sessions[0].id;
    }

    // 1. Remplir le sélecteur (Dropdown)
    selector.innerHTML = state.notes.sessions.map(s =>
        `<option value="${s.id}" ${s.id == state.notes.currentSessionId ? 'selected' : ''}>
            ${s.title}
        </option>`
    ).join('');

    // 2. Charger le contenu de la session active
    const current = state.notes.sessions.find(s => s.id == state.notes.currentSessionId) 
                 || state.notes.sessions[0];

    if (current) {
        textarea.value = current.content;
        state.notes.currentSessionId = current.id;
    }
}

export function renderInspiration() {
    const state = window.state;
    const btn = document.getElementById('inspiration-btn');
    const star = document.getElementById('inspiration-star');
    const status = document.getElementById('inspiration-status');

    if (!btn || !star || !status) return;

    if (state.inspiration) {
        // État Actif : Doré et brillant
        btn.classList.replace('border-zinc-800', 'border-amber-500/50');
        btn.classList.add('bg-amber-500/10', 'shadow-[0_0_15px_rgba(245,158,11,0.2)]');
        
        star.classList.add('animate-pulse', 'text-amber-500');
        star.classList.remove('text-zinc-700');
        
        status.innerText = "Actif";
        status.classList.replace('text-zinc-600', 'text-amber-500');
    } else {
        // État Inactif : Sombre
        btn.classList.replace('border-amber-500/50', 'border-zinc-800');
        btn.classList.remove('bg-amber-500/10', 'shadow-[0_0_15px_rgba(245,158,11,0.2)]');
        
        star.classList.remove('animate-pulse', 'text-amber-500');
        star.classList.add('text-zinc-700');
        
        status.innerText = "Inactif";
        status.classList.replace('text-amber-500', 'text-zinc-600');
    }
}

/**
 * Fonction auxiliaire pour générer une section (Titre + Grille)
 */
function renderSpellSection(parentContainer, title, spells, titleColorClass) {
    const state = window.state;
    const section = document.createElement('div');
    section.className = "space-y-4";

    const header = document.createElement('div');
    header.className = "flex items-center gap-4 px-1";
    header.innerHTML = `
        <h3 class="text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap ${titleColorClass}">
            ${title} (${spells.length})
        </h3>
        <div class="h-px w-full bg-zinc-800/50"></div>
    `;
    section.appendChild(header);

    const grid = document.createElement('div');
    grid.className = "grid grid-cols-1 md:grid-cols-2 gap-3 items-start";
    
    spells.forEach(spell => {
        const uniqueKey = `spell-${spell.originalIndex}`;
        const isOpened = state.openedDescs.includes(uniqueKey);
        const isPrepared = spell.prepare === true;
        const isCantrip = spell.niveau == 0;

        const card = document.createElement('div');

        // --- CONFIGURATION DRAG & DROP ---
        card.draggable = true;
        card.dataset.index = spell.originalIndex;

        card.ondragstart = (e) => {
            e.dataTransfer.setData("text/plain", spell.originalIndex);
            card.classList.add('opacity-50', 'scale-95');
        };

        card.ondragend = () => {
            card.classList.remove('opacity-50', 'scale-95');
        };

        card.ondragover = (e) => {
            e.preventDefault();
            card.classList.add('border-purple-500');
        };

        card.ondragleave = () => {
            card.classList.remove('border-purple-500');
        };

        card.ondrop = (e) => {
            e.preventDefault();
            card.classList.remove('border-purple-500');
            const fromIndex = parseInt(e.dataTransfer.getData("text/plain"));
            const toIndex = spell.originalIndex;
            
            if (fromIndex !== toIndex && window.reorderSpells) {
                window.reorderSpells(fromIndex, toIndex);
            }
        };
        
        let borderColor = 'border-zinc-800';
        if (isCantrip) borderColor = 'border-amber-500/30';
        else if (isPrepared) borderColor = 'border-purple-500/30';

        card.className = `bg-zinc-900/40 border ${borderColor} rounded-xl p-3 hover:border-purple-500/50 transition cursor-pointer group relative h-fit`;

        card.onclick = (e) => {
            if (e.target.closest('button')) return;
            if (window.toggleDesc) window.toggleDesc(uniqueKey);
        };

        const prepButton = isCantrip ? '' : `
            <button onclick="event.stopPropagation(); window.toggleSpellPreparation(${spell.originalIndex})" 
                title="${isPrepared ? 'Désélectionner' : 'Préparer ce sort'}"
                class="text-lg transition-all transform hover:scale-110 ${isPrepared ? 'grayscale-0 opacity-100' : 'grayscale opacity-20 hover:opacity-100'}">
                📖
            </button>`;

        card.innerHTML = `
        <div class="flex justify-between items-start mb-3">
            <div class="flex items-center gap-3">
                ${prepButton}
                <div>
                    <h4 class="text-[13px] font-black uppercase text-white tracking-wide">${spell.nom}</h4>
                    <span class="text-[10px] font-bold ${isCantrip ? 'text-amber-500' : 'text-purple-500'} uppercase tracking-widest">
                        ${isCantrip ? 'Cantrip' : 'Niveau ' + spell.niveau}
                    </span>
                </div>
            </div>
            
            <div class="flex gap-3 relative z-10">
                <button onclick="event.stopPropagation(); window.openModal('spell', ${spell.originalIndex})" class="text-zinc-500 hover:text-white text-[12px] p-1">✎</button>
                <button onclick="event.stopPropagation(); window.deleteSpell(${spell.originalIndex})" class="text-zinc-500 hover:text-red-500 text-[12px] p-1">✕</button>
            </div>
        </div>

        <div class="flex flex-wrap gap-2 mb-3">
            <span class="px-2 py-1 rounded text-[9px] font-black uppercase bg-purple-900/30 border border-purple-800/40 text-purple-300">
                ${spell.ecole || '-'}
            </span>
            <span class="px-2 py-1 rounded text-[9px] font-black uppercase bg-zinc-800 text-zinc-200">
                ⚡ ${spell.temps || '-'}
            </span>
            <span class="px-2 py-1 rounded text-[9px] font-black uppercase bg-purple-900/20 border border-purple-800/30 text-purple-400">
                ${spell.portee || '-'}
            </span>
        </div>

        <div class="${isOpened ? 'block' : 'hidden'} mt-4 pt-4 border-t border-zinc-800 animate-in fade-in duration-300">
            <div class="grid grid-cols-2 gap-y-3 gap-x-4 mb-4">
                <div class="flex flex-col">
                    <span class="text-[8px] uppercase text-zinc-500 font-black tracking-tighter">Cible / Zone</span>
                    <span class="text-[11px] text-zinc-200 font-medium">${spell.cible || '—'}</span>
                </div>
                <div class="flex flex-col">
                    <span class="text-[8px] uppercase text-zinc-500 font-black tracking-tighter">Durée</span>
                    <span class="text-[11px] text-zinc-200 font-medium">${spell.duree || '—'}</span>
                </div>
                <div class="flex flex-col col-span-2">
                    <span class="text-[8px] uppercase text-zinc-500 font-black tracking-tighter">Composantes</span>
                    <span class="text-[11px] text-zinc-200 font-medium">
                        ${[
                            spell.composantes?.v ? 'V' : '',
                            spell.composantes?.s ? 'S' : '',
                            spell.composantes?.m ? 'M' : ''
                        ].filter(Boolean).join(', ') || 'Aucune'}
                    </span>
                </div>
            </div>

            <div class="grid border-t border-zinc-800/50 pt-2">
                <span class="text-[8px] uppercase text-zinc-500 font-black tracking-tighter mb-1">Description</span>
                <span class="text-[11px] text-zinc-200 font-medium whitespace-pre-line">${spell.desc || '—'}</span>
            </div>
        </div>
        `;
        grid.appendChild(card);
    });

    section.appendChild(grid);
    parentContainer.appendChild(section);
}

function calculateTotalWeight() {
    return (window.state.inventaire || []).reduce((total, it) => {
        const w = parseFloat(it.weight) || 0;
        const q = parseInt(it.qty) || 1;
        return total + (w * q);
    }, 0);
}

function updateWeightUI() {
    const totalW = calculateTotalWeight();
    const bagSelect = document.getElementById('bag-type');
    const maxW = bagSelect ? parseInt(bagSelect.value) : (window.state.maxWeight || 14);
    
    const bar = document.getElementById('charge-bar');
    const label = document.getElementById('charge-label');
    
    if (!bar || !label) return;

    const percent = Math.min(100, (totalW / maxW) * 100);
    bar.style.width = percent + '%';
    label.innerText = `${totalW.toFixed(1)} / ${maxW} kg`;

    // Couleurs
    bar.className = "progress-fill transition-all duration-500 ";
    if (percent >= 100) bar.classList.add("bg-red-600");
    else if (percent >= 80) bar.classList.add("bg-orange-500");
    else bar.classList.add("bg-emerald-600");
}