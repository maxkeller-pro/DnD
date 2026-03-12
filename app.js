// --- CONFIGURATION SUPABASE ---
const isProduction = window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1" && window.location.hostname !== "";

const CONFIG = {
    production: {
        URL: 'https://hklyemyhgkjxfqgmwfqb.supabase.co',
        KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrbHllbXloZ2tqeGZxZ213ZnFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMTcwODAsImV4cCI6MjA4ODU5MzA4MH0.ADzQ2uRdHRDlmjvinnK4YZa8FzOrQV6zq45Af5mlJpw'
    },
    development: {
        URL: 'https://tvxjluljhclpjmydgfbn.supabase.co',
        KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2eGpsdWxqaGNscGpteWRnZmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNTQ1MDYsImV4cCI6MjA4ODgzMDUwNn0.qSUaesu9ULIsWkyL6aWURfGxtcxPEmlBBK7CInD5_eo'
    }
};

const currentConfig = isProduction ? CONFIG.production : CONFIG.development;

const supabaseClient = supabase.createClient(currentConfig.URL, currentConfig.KEY);

// --- DONNÉES DE RÉFÉRENCE ---
const SKILLS_LIST = [
    { n: "Athlétisme", s: "Force" }, { n: "Acrobaties", s: "Dextérité" }, { n: "Escroquerie", s: "Dextérité" }, { n: "Discrétion", s: "Dextérité" },
    { n: "Arcanes", s: "Intelligence" }, { n: "Histoire", s: "Intelligence" }, { n: "Investigation", s: "Intelligence" }, { n: "Nature", s: "Intelligence" }, { n: "Religion", s: "Intelligence" },
    { n: "Dressage", s: "Sagesse" }, { n: "Médecine", s: "Sagesse" }, { n: "Perception", s: "Sagesse" }, { n: "Perspicacité", s: "Sagesse" }, { n: "Survie", s: "Sagesse" },
    { n: "Tromperie", s: "Charisme" }, { n: "Intimidation", s: "Charisme" }, { n: "Performance", s: "Charisme" }, { n: "Persuasion", s: "Charisme" }
];
const statsOrder = ["Force", "Dextérité", "Constitution", "Intelligence", "Sagesse", "Charisme"];

let currentCharacterId = null;

// --- ÉTAT INITIAL ---
let state = {
    nom: "Nouveau Héros", race: "Humain", classe: "Barbare", niveau: 1,
    hp_cur: 10, 
    hp_max: 10, 
    hd_cur: 1, 
    maxWeight: 14, 
    ac: 10,
    speed: 9,
    stats: { Force: 10, Dextérité: 10, Constitution: 10, Intelligence: 10, Sagesse: 10, Charisme: 10 },
    m_saves: [], m_skills: [], attaques: [], capacites: [], inventaire: [], spells: [],
    inspiration: false,
    blessures: 0,
    spell_slots: Array(9).fill().map(() => ({ cur: 0, max: 0 })),
    money: { pp: 0, po: 0, pa: 0, pc: 0 },
    languages: [],
    tools: [],
    portrait: "",
    notes: {
        currentSessionId: 0,
        sessions: [
            { id: Date.now(), title: "Session Initiale", content: "" }
        ]
    },
    openedDescs: []
};

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

// --- LOGIQUE AUTH ---

async function checkUser() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        document.getElementById('auth-overlay').style.display = 'none';
        loadCharactersList(); // Nouvelle étape
    } else {
        document.getElementById('auth-overlay').style.display = 'flex';
        document.getElementById('char-selection-overlay').classList.add('hidden');
    }
}

async function loadCharactersList() {
    const { data: characters, error } = await supabaseClient
        .from('personnages')
        .select('id, nom, data');

    const container = document.getElementById('characters-list');
    container.innerHTML = '';

    if (!characters || characters.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center py-12 border border-dashed border-zinc-800 rounded-2xl text-zinc-600 uppercase font-bold text-xs">Aucun personnage trouvé</div>`;
    } else {
        characters.forEach(char => {
            const level = char.data?.niveau || 1;
            const card = document.createElement('div');
            card.className = "bg-zinc-900 border border-zinc-800 p-6 rounded-2xl hover:border-red-500/50 cursor-pointer transition group relative overflow-hidden";

            // On ajoute un évènement au clic sur la carte, SAUF si on clique sur supprimer
            card.onclick = (e) => {
                if (e.target.closest('.btn-delete-char')) return;
                selectCharacter(char.id);
            };

            card.innerHTML = `
        <div class="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-30 transition">
            <span class="text-4xl">🐉</span>
        </div>
        <div class="text-emerald-500 text-[10px] font-black uppercase mb-1 tracking-widest">Niveau ${level}</div>
        <div class="text-xl font-bold text-white group-hover:text-emerald-400 transition">${char.nom}</div>
        
        <button class="btn-delete-char mt-4 text-[9px] font-black text-zinc-600 hover:text-red-500 uppercase tracking-tighter flex items-center gap-1 transition">
            <span class="text-xs">✕</span> Supprimer le personnage
        </button>
    `;

            // Attacher l'évènement de suppression au bouton
            const deleteBtn = card.querySelector('.btn-delete-char');
            deleteBtn.onclick = () => deleteCharacter(char.id, char.nom);

            container.appendChild(card);
        });
    }
    document.getElementById('char-selection-overlay').classList.remove('hidden');
}

async function createNewCharacter() {
    const name = prompt("Nom du héros ?");
    if (!name) return;

    const { data: { user } } = await supabaseClient.auth.getUser();

    // On utilise ton objet de base défini au dessus
    const initialData = { ...state, nom: name };

    const { data, error } = await supabaseClient
        .from('personnages')
        .insert([{
            nom: name,
            user_id: user.id,
            data: initialData
        }])
        .select();

    if (!error) loadCharactersList();
}

// Pour charger les données dans ton state
async function selectCharacter(charId) {
    const { data: row, error } = await supabaseClient
        .from('personnages')
        .select('*')
        .eq('id', charId)
        .single();

    if (error) return console.error("Erreur de chargement:", error);

    if (row) {
        const baseState = {
            nom: "Nouveau Héros", race: "Humain", classe: "Barbare", niveau: 1,
            hp_cur: 10, hp_max: 10, hd_cur: 1, maxWeight: 14, ac: 10,
            stats: { Force: 10, Dextérité: 10, Constitution: 10, Intelligence: 10, Sagesse: 10, Charisme: 10 },
            m_saves: [], m_skills: [], attaques: [], capacites: [], inventaire: [], spells: [],
            spell_slots: Array(9).fill().map(() => ({ cur: 0, max: 0 })),
            money: { pp: 0, po: 0, pa: 0, pc: 0 },
            languages: [], tools: [], portrait: "",
            notes: { currentSessionId: 0, sessions: [{ id: Date.now(), title: "Session Initiale", content: "" }] },
            openedDescs: []
        };

        state = { ...baseState, ...row.data };

        state.nom = row.nom || state.nom;
        currentCharacterId = row.id;

        document.getElementById('char-selection-overlay').classList.add('hidden');
        
        document.getElementById('app').classList.remove('hidden'); 
        
        renderAll();
    }

    window.history.pushState({ charId: id }, "");

    window.onpopstate = function(event) {
        if (document.getElementById('char-selection-overlay').classList.contains('hidden')) {
            backToSelection();
        }
    };
}

async function deleteCharacter(charId, charName) {
    const confirmDelete = confirm(`Es-tu sûr de vouloir envoyer ${charName} au Valhalla définitivement ?`);
    
    if (confirmDelete) {
        const { error } = await supabaseClient
            .from('personnages')
            .delete()
            .eq('id', charId);

        if (error) {
            alert("Erreur lors de la suppression : " + error.message);
        } else {
            // On rafraîchit la liste
            loadCharactersList();
            
            // Si on vient de supprimer le perso qui était actif, on reset l'ID
            if (currentCharacterId === charId) {
                currentCharacterId = null;
            }
        }
    }
}

async function handleLogin() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const errBox = document.getElementById('auth-error');

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
        errBox.innerText = error.message;
        errBox.classList.remove('hidden');
    } else {
        errBox.classList.add('hidden');
        await checkUser();
    }
}

async function handleSignup() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const { error } = await supabaseClient.auth.signUp({ email, password });

    if (error) {
        alert("Erreur : " + error.message);
    } else {
        alert("Inscription réussie ! Vous pouvez maintenant vous connecter.");
    }
}

async function handleLogout() {
    await supabaseClient.auth.signOut();
    window.location.reload();
}

async function saveToSupabase() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    const payload = {
        user_id: user.id,
        nom: state.nom,
        data: state
    };

    // Si on a déjà un ID de perso, on l'ajoute pour faire un UPDATE et non un INSERT
    if (currentCharacterId) payload.id = currentCharacterId;

    const { data, error } = await supabaseClient
        .from('personnages')
        .upsert(payload)
        .select(); // On récupère la ligne créée/modifiée

    if (error) console.error("Erreur:", error.message);
    else if (data && data[0]) currentCharacterId = data[0].id; // On mémorise l'ID
}

// --- CHARGEMENT DES DONNÉES ---
async function loadUserData(user) {
    const { data, error } = await supabaseClient
        .from('personnages')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false }) // Le plus récent en premier
        .limit(1)
        .maybeSingle();

    if (data) {
        currentCharacterId = data.id; // On garde l'ID pour la suite
        state = { ...state, ...data.data };
        renderAll(false);
    } else {
        renderAll(true); // Crée la première fiche si aucune n'existe
    }
}

// --- INITIALISATION ---
// On utilise 'DOMContentLoaded' pour être sûr que l'ID 'auth-overlay' existe dans le DOM
document.addEventListener('DOMContentLoaded', () => {
    checkUser();
});

// --- CALCULS ---
function getMod(v) { return Math.floor(((v || 10) - 10) / 2); }
function getProf() { return Math.floor(1 + Math.ceil((state.niveau || 1) / 4)); }

// --- UI HELPERS ---
function updateHPUI() {
    const p = Math.min(100, Math.max(0, (state.hp_cur / state.hp_max) * 100));
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
            label.innerText = "Sain";
            label.classList.add('text-emerald-500');
            fill.classList.add('bg-emerald-500');
        }
    }

    if (bg) bg.style.width = p + '%';
}

function updateWeightUI() {
    const totalW = state.inventaire.reduce((sum, item) => sum + (parseFloat(item.weight) || 0), 0);

    // On récupère le poids max directement depuis le select du HTML
    const bagSelect = document.getElementById('bag-type');
    const maxW = bagSelect ? parseInt(bagSelect.value) : (state.maxWeight || 14);

    const bar = document.getElementById('charge-bar');
    const label = document.getElementById('charge-label');
    if (!bar || !label) return;

    // Calcul du pourcentage de remplissage
    const percent = Math.min(100, (totalW / maxW) * 100);
    bar.style.width = percent + '%';
    label.innerText = `${totalW.toFixed(1)} / ${maxW} kg`;

    // Changement de couleur dynamique (proportionnel au sac choisi)
    if (percent >= 100) {
        bar.className = "progress-fill bg-red-600"; // Surcharge
    } else if (percent >= 80) {
        bar.className = "progress-fill bg-orange-500"; // Presque plein
    } else if (percent >= 50) {
        bar.className = "progress-fill bg-yellow-500"; // Moitié
    } else {
        bar.className = "progress-fill bg-emerald-600"; // Léger
    }
}

// --- RENDU GLOBAL ---
function renderAll(shouldSave = true) {
    const p = getProf();

    // Inputs de base
    document.getElementById('char-name').value = state.nom;
    document.getElementById('char-race').value = state.race || "Humain";
    document.getElementById('char-class').value = state.classe;
    document.getElementById('char-level').value = state.niveau;
    document.getElementById('char-ac').value = state.ac;
    if(document.getElementById('speed')) document.getElementById('speed').value = state.speed || 9;
    document.getElementById('prof-bonus').innerText = `+${p}`;

    // Stats & Init
    const init = getMod(state.stats.Dextérité);
    document.getElementById('init-bonus').innerText = (init >= 0 ? '+' : '') + init;
    document.getElementById('passive-perception').innerText = 10 + getMod(state.stats.Sagesse) + (state.m_skills.includes("Perception") ? p : 0);

    // HP
    document.getElementById('hp-cur').value = state.hp_cur;
    document.getElementById('hp-max').value = state.hp_max;
    document.getElementById('hd-cur').value = state.hd_cur;
    document.getElementById('hd-max').innerText = state.niveau;
    updateHPUI();

    // Argent
    document.getElementById('gold-pp').value = state.money.pp;
    document.getElementById('gold-po').value = state.money.po;
    document.getElementById('gold-pa').value = state.money.pa;
    document.getElementById('gold-pc').value = state.money.pc;

    // Listes
    renderStatsList();
    renderSavesList();
    renderSkillsList();
    renderAttaques();
    renderCapacites();
    renderSpellsList();
    renderInventoryList();
    renderExtras();
    renderPortrait();
    renderNotes();
    renderInspiration();
    renderBlessures();

    if (shouldSave) saveToSupabase();
}

// --- MÉTHODES DE RENDU DÉTAILLÉES ---

function renderStatsList() {
    document.getElementById('stats-area').innerHTML = statsOrder.map(k => {
        const v = state.stats[k] || 10;
        return `
            <div class="flex justify-between items-center bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
                <span class="text-[10px] uppercase font-bold text-zinc-500">${k}</span>
                <div class="flex items-center gap-3">
                    <input type="number" value="${v}" 
                        onchange="state.stats['${k}']=parseInt(this.value)||10; renderAll(); saveData();" 
                        class="w-12 text-center bg-transparent !border-none font-bold outline-none">
                    
                    <span class="text-white font-black text-base w-8 text-right">
                        ${(getMod(v) >= 0 ? '+' : '') + getMod(v)}
                    </span>
                </div>
            </div>`;
    }).join('');
}

function renderSavesList() {
    const p = getProf();
    document.getElementById('saves-area').innerHTML = statsOrder.map(s => {
        const isChecked = state.m_saves.includes(s);
        const mod = getMod(state.stats[s] || 10) + (isChecked ? p : 0);
        return `
            <div class="stat-row-layout hover:bg-white/5 transition-colors">
                <input type="checkbox" class="custom-checkbox" ${isChecked ? 'checked' : ''} onchange="toggleSave('${s}')">
                <span class="text-[11px] font-bold uppercase tracking-tight text-zinc-400">${s}</span>
                <span class="text-right font-black text-amber-500 text-xs">${(mod >= 0 ? '+' : '') + mod}</span>
            </div>`;
    }).join('');
}

function renderSkillsList() {
    const p = getProf();
    const search = (document.getElementById('skill-search')?.value || "").toLowerCase();
    document.getElementById('skills-area').innerHTML = SKILLS_LIST
        .filter(s => s.n.toLowerCase().includes(search))
        .map(s => {
            const isChecked = state.m_skills.includes(s.n);
            const mod = getMod(state.stats[s.s] || 10) + (isChecked ? p : 0);
            return `
                <div class="stat-row-layout hover:bg-white/5 transition-colors">
                    <input type="checkbox" class="custom-checkbox" ${isChecked ? 'checked' : ''} onchange="toggleSkill('${s.n}')">
                    <span class="text-[11px] font-medium text-zinc-400">${s.n}</span>
                    <span class="text-right font-black text-amber-500/80 text-xs">${(mod >= 0 ? '+' : '') + mod}</span>
                </div>`;
        }).join('');
}

function renderAttaques() {
    const container = document.getElementById('attacks-list');
    const template = document.getElementById('template-attaque');
    if (!container || !template) return;
    container.innerHTML = '';
    const p = getProf();

    state.attaques.forEach((a, i) => {
        const id = `atk-${i}`;
        const clone = template.content.cloneNode(true);
        const root = clone.querySelector('.item-card');

        // Calculs des bonus
        const statMod = (a.stat === 'Aucune') ? 0 : getMod(state.stats[a.stat] || 10);
        const hitBonus = statMod + (a.prof ? p : 0) + (parseInt(a.misc) || 0);
        const dmgBonus = statMod + (parseInt(a.misc) || 0);

        // Injection des textes de base
        root.querySelector('.atk-nom').innerText = a.nom;
        root.querySelector('.atk-hit-bonus').innerText = (hitBonus >= 0 ? '+' : '') + hitBonus;
        root.querySelector('.atk-dmg-display').innerText = `${a.dice}${dmgBonus !== 0 ? (dmgBonus > 0 ? '+' : '') + dmgBonus : ''}`;
        root.querySelector('.atk-desc-text').innerText = a.desc || "";

        // --- GESTION DU TYPE DE DÉGÂTS ---
        const typeBadge = root.querySelector('.atk-type-badge');
        if (typeBadge) {
            if (a.damageType) {
                typeBadge.innerText = a.damageType;
                typeBadge.classList.remove('hidden');
                // Optionnel : Coloration dynamique simple
                if (a.damageType === 'Feu') typeBadge.style.color = '#ef4444';
                if (a.damageType === 'Froid') typeBadge.style.color = '#60a5fa';
            } else {
                typeBadge.classList.add('hidden');
            }
        }

        // État déplié/plié
        if (state.openedDescs.includes(id)) root.querySelector('.atk-desc-container').classList.add('open');

        // Événements
        root.querySelector('[data-action="toggle"]').onclick = (e) => {
            if (e.target.tagName !== 'BUTTON') toggleDesc(id);
        };
        root.querySelector('.atk-edit').onclick = () => openModal('attack', i);
        root.querySelector('.atk-delete').onclick = () => { if (confirm('Supprimer ?')) { state.attaques.splice(i, 1); renderAll(); } };

        // Drag Drop
        root.ondragstart = (e) => e.dataTransfer.setData('idx', i);
        root.ondragover = (e) => e.preventDefault();
        root.ondrop = (e) => {
            const from = e.dataTransfer.getData('idx');
            const moved = state.attaques.splice(from, 1)[0];
            state.attaques.splice(i, 0, moved);
            renderAll();
        };

        container.appendChild(clone);
    });
}

function renderCapacites() {
    const container = document.getElementById('skills-list');
    const template = document.getElementById('template-capacite');
    if (!container || !template) return;
    container.innerHTML = '';

    // On récupère le bonus de maîtrise actuel (+2, +3, etc.)
    const p = getProf();

    state.capacites.forEach((c, i) => {
        const id = `cap-${i}`;
        const clone = template.content.cloneNode(true);
        const root = clone.querySelector('.item-card');

        // --- LOGIQUE DU MAXIMUM ---
        const effectiveMax = c.useProf ? p : (parseInt(c.max) || 0);

        // Sécurité : si le niveau change et que le max baisse, on ajuste le courant
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

            // Mise à jour de la valeur quand on change le chiffre
            input.oninput = (e) => {
                let val = parseInt(e.target.value) || 0;
                // On empêche de dépasser le max
                if (val > effectiveMax) val = effectiveMax;
                if (val < 0) val = 0;

                state.capacites[i].current = val;
                saveToSupabase(); // Sauvegarde auto en DB
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
            if (e.target.tagName !== 'INPUT' && !e.target.closest('button')) {
                toggleDesc(id);
            }
        };

        root.querySelector('.cap-edit').onclick = () => openModal('skill', i);

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

function renderSpellsList() {
    document.getElementById('spells-list').innerHTML = state.spells.map((s, i) => {
        const id = `spell-${i}`;
        const isOpen = state.openedDescs.includes(id);
        return `
        <div class="item-card spell-card p-4 rounded-xl mb-2">
            <div class="flex justify-between items-center cursor-pointer" onclick="toggleDesc('${id}')">
                <div class="flex items-center gap-4">
                    <div class="w-8 h-8 rounded-lg bg-purple-900/20 flex items-center justify-center text-[10px] font-black text-purple-400 border border-purple-900/30">${s.rank}</div>
                    <div class="font-black text-white text-sm uppercase">${s.nom}</div>
                </div>
                <div class="flex gap-3">
                    <button onclick="event.stopPropagation(); openModal('spell',${i})" class="text-zinc-600 hover:text-white">✎</button>
                    <button onclick="event.stopPropagation(); state.spells.splice(${i},1);renderAll()" class="text-zinc-800 hover:text-red-500">✕</button>
                </div>
            </div>
            <div class="desc-collapse ${isOpen ? 'open' : ''} text-zinc-400 text-xs mt-2 italic whitespace-pre-wrap">${s.desc || ""}</div>
        </div>`}).join('');

    document.getElementById('spell-slots').innerHTML = state.spell_slots.map((s, i) => `
        <div class="stat-box !p-2 border-purple-900/30">
            <div class="text-[8px] font-black text-purple-500 uppercase">N${i + 1}</div>
            <input type="number" value="${s.cur}" class="w-full text-center bg-transparent !border-none font-black text-sm" oninput="state.spell_slots[${i}].cur=parseInt(this.value)||0;renderAll()">
        </div>`).join('');
}

function renderInventoryList() {
    updateWeightUI();
    const container = document.getElementById('inventory-list');
    const template = document.getElementById('template-item-inventaire');

    if (!container || !template) return;

    container.innerHTML = ''; // On vide la liste

    state.inventaire.forEach((it, i) => {
        const clone = template.content.cloneNode(true);

        // On s'assure qu'une quantité existe
        if (!it.qty) it.qty = 1;

        // Remplissage des textes
        clone.querySelector('.item-name').textContent = it.nom;
        clone.querySelector('.item-weight').textContent = `${(it.weight * it.qty).toFixed(1)}kg (${it.weight}kg/u)`;
        clone.querySelector('.item-qty').textContent = it.qty;
        clone.querySelector('.btn-edit').onclick = () => editItem(i);

        // Actions des boutons
        clone.querySelector('.btn-plus').onclick = () => { it.qty++; renderAll(); };
        clone.querySelector('.btn-minus').onclick = () => {
            if (it.qty > 1) it.qty--;
            renderAll();
        };
        clone.querySelector('.btn-delete').onclick = () => {
            state.inventaire.splice(i, 1);
            renderAll();
        };

        container.appendChild(clone);
    });
}

function calculateTotalWeight() {
    return state.inventaire.reduce((total, it) => {
        return total + (parseFloat(it.weight) * (it.qty || 1));
    }, 0);
}

// --- MODALES ---
function openModal(type, index = -1) {
    document.getElementById('m-type').value = type;
    document.getElementById('m-index').value = index;

    // Reset fields visibility
    ['m-atk-fields', 'm-spell-fields', 'm-skill-fields', 'm-item-fields'].forEach(id => document.getElementById(id).classList.add('hidden'));

    if (type === 'attack') document.getElementById('m-atk-fields').classList.remove('hidden');
    if (type === 'spell') document.getElementById('m-spell-fields').classList.remove('hidden');
    if (type === 'skill') document.getElementById('m-skill-fields').classList.remove('hidden');
    if (type === 'item') document.getElementById('m-item-fields').classList.remove('hidden');

    if (index !== -1) {
        let item = (type === 'attack') ? state.attaques[index] : (type === 'skill') ? state.capacites[index] : (type === 'spell') ? state.spells[index] : state.inventaire[index];
        document.getElementById('m-name').value = item.nom;
        document.getElementById('m-desc').value = item.desc || "";
        if (type === 'attack') {
            document.getElementById('m-atk-stat').value = item.stat;
            document.getElementById('m-atk-prof').checked = item.prof;
            document.getElementById('m-atk-dice').value = item.dice;
            document.getElementById('m-atk-type').value = item.damageType || "";
            document.getElementById('m-atk-misc').value = item.misc;
        }
        if (type === 'skill') {
            const isProf = item.useProf || false;
            document.getElementById('m-skill-use-prof').checked = isProf;
            document.getElementById('m-skill-max').value = isProf ? "" : item.max;
            document.getElementById('m-skill-max').disabled = isProf;
            document.getElementById('m-skill-reset').value = item.reset;
        }
        if (type === 'spell') {
            document.getElementById('m-spell-rank').value = item.rank;
            document.getElementById('m-spell-school').value = item.school;
        }
        if (type === 'item') {
            document.getElementById('m-item-weight').value = item.weight;
        }
    } else {
        document.getElementById('m-name').value = "";
        document.getElementById('m-desc').value = "";
        document.getElementById('m-skill-max').disabled = false;
        document.getElementById('m-skill-use-prof').checked = false;
        document.getElementById('m-skill-reset').value = "none";
        document.getElementById('m-skill-max').value = 0;
    }
    document.getElementById('modal-ui').classList.remove('hidden');
}

function updateClassSaves(className) {
    const normalizedClass = Object.keys(CLASS_SAVES).find(
        k => k.toLowerCase() === className.toLowerCase().trim()
    );

    if (normalizedClass) {
        state.m_saves = [...CLASS_SAVES[normalizedClass]];
        renderAll();
    }
}

function closeModal() { document.getElementById('modal-ui').classList.add('hidden'); }

function saveData() {
    const type = document.getElementById('m-type').value;
    const index = parseInt(document.getElementById('m-index').value);
    let data = {
        nom: document.getElementById('m-name').value,
        desc: document.getElementById('m-desc').value
    };

    if (type === 'attack') {
        data = {
            ...data,
            stat: document.getElementById('m-atk-stat').value,
            prof: document.getElementById('m-atk-prof').checked,
            dice: document.getElementById('m-atk-dice').value,
            damageType: document.getElementById('m-atk-type').value,
            misc: parseInt(document.getElementById('m-atk-misc').value) || 0
        };
        if (index === -1) state.attaques.push(data); else state.attaques[index] = data;
    }

    if (type === 'skill') {
        const useProfValue = document.getElementById('m-skill-use-prof').checked;
        const maxVal = useProfValue ? -1 : (parseInt(document.getElementById('m-skill-max').value) || 0);

        data = {
            ...data,
            max: maxVal,
            current: index === -1 ? (useProfValue ? getProf() : maxVal) : state.capacites[index].current,
            useProf: useProfValue,
            reset: document.getElementById('m-skill-reset').value
        };

        if (index === -1) state.capacites.push(data); else state.capacites[index] = data;
    }

    if (type === 'spell') {
        data = {
            ...data,
            rank: parseInt(document.getElementById('m-spell-rank').value) || 0,
            school: document.getElementById('m-spell-school').value
        };
        if (index === -1) state.spells.push(data); else state.spells[index] = data;
    }

    // --- CORRECTION POUR L'INVENTAIRE ---
    if (type === 'item') {
        data = {
            ...data,
            // On utilise les IDs exacts du HTML (sans le préfixe "m-")
            weight: parseFloat(document.getElementById('item-weight').value) || 0,
            qty: parseInt(document.getElementById('item-qty').value) || 1
        };

        if (index === -1) {
            state.inventaire.push(data);
        } else {
            state.inventaire[index] = data;
        }
    }

    closeModal();
    saveToSupabase();
    renderAll();
}

function toggleSave(s) {
    if (state.m_saves.includes(s)) state.m_saves = state.m_saves.filter(x => x !== s);
    else state.m_saves.push(s);
    renderAll();
}
function toggleSkill(n) {
    if (state.m_skills.includes(n)) state.m_skills = state.m_skills.filter(x => x !== n);
    else state.m_skills.push(n);
    renderAll();
}
function updateLevel(v) { state.niveau = parseInt(v) || 1; state.hd_cur = state.niveau; renderAll(); }
function updateHP(t, v) { if (t === 'cur') state.hp_cur = parseInt(v) || 0; else state.hp_max = parseInt(v) || 1; renderAll(); }
function toggleDesc(id) {
    if (state.openedDescs.includes(id)) state.openedDescs = state.openedDescs.filter(x => x !== id);
    else state.openedDescs.push(id);
    renderAll();
}
function takeRest(type) {
    const p = getProf();

    if (type === 'long') {
        state.hp_cur = state.hp_max;
        state.hd_cur = state.niveau;
        state.spell_slots.forEach(s => s.cur = s.max);

        if (state.blessures > 0) {
            state.blessures -= 1;
        } else {
        }
    }

    // --- CORRECTION DES CAPACITÉS ---
    state.capacites.forEach(c => {
        const effectiveMax = c.useProf ? p : (parseInt(c.max) || 0);

        if (effectiveMax > 0) {
            if (type === 'long' || c.reset === 'court') {
                c.current = effectiveMax;
            }
        }
    });

    saveToSupabase();
    renderAll();
}

function renderExtras() {
    const langContainer = document.getElementById('languages-list');
    const toolContainer = document.getElementById('tools-list');

    if (!langContainer || !toolContainer) return;

    // Rendu des Langues
    langContainer.innerHTML = state.languages.map((l, i) => `
        <span class="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-[11px] text-zinc-300 flex items-center gap-2">
            ${l}
            <button onclick="removeExtra('language', ${i})" class="text-zinc-600 hover:text-red-500">✕</button>
        </span>
    `).join('') || '<span class="text-[10px] italic text-zinc-700">Aucune langue</span>';

    // Rendu des Outils
    toolContainer.innerHTML = state.tools.map((t, i) => `
        <span class="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-[11px] text-zinc-300 flex items-center gap-2">
            ${t}
            <button onclick="removeExtra('tool', ${i})" class="text-zinc-600 hover:text-red-500">✕</button>
        </span>
    `).join('') || '<span class="text-[10px] italic text-zinc-700">Aucun outil</span>';
}

function addExtra(type) {
    const val = prompt(type === 'language' ? "Quelle langue maîtrisez-vous ?" : "Quel outil maîtrisez-vous ?");
    if (val) {
        if (type === 'language') state.languages.push(val);
        else state.tools.push(val);
        saveToSupabase();
        renderExtras();
    }
}

function removeExtra(type, index) {
    if (type === 'language') state.languages.splice(index, 1);
    else state.tools.splice(index, 1);
    saveToSupabase();
    renderExtras();
}

function renderPortrait() {
    const img = document.getElementById('char-portrait');
    const placeholder = document.getElementById('portrait-placeholder');

    if (state.portrait) {
        img.src = state.portrait;
        img.classList.remove('hidden');
        placeholder.classList.add('hidden');
    } else {
        img.classList.add('hidden');
        placeholder.classList.remove('hidden');
    }
}

function changePortrait() {
    const url = prompt("Collez l'URL de l'image de votre personnage :", state.portrait);
    if (url !== null) {
        state.portrait = url;
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
            state.portrait = e.target.result;
            renderPortrait();
            saveToSupabase();
        };
        reader.readAsDataURL(file);
    }
}

function renderNotes() {
    const selector = document.getElementById('session-selector');
    const textarea = document.getElementById('session-notes');
    if (!selector || !textarea) return;

    // Remplir le sélecteur
    selector.innerHTML = state.notes.sessions.map(s =>
        `<option value="${s.id}" ${s.id == state.notes.currentSessionId ? 'selected' : ''}>${s.title}</option>`
    ).join('');

    // Charger le contenu de la session active
    const current = state.notes.sessions.find(s => s.id == state.notes.currentSessionId) || state.notes.sessions[0];
    if (current) {
        textarea.value = current.content;
        state.notes.currentSessionId = current.id;
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
        state.notes.sessions.push(newSession);
        state.notes.currentSessionId = newSession.id;
        saveToSupabase();
        renderNotes();
    }
}

function switchSession(id) {
    state.notes.currentSessionId = id;
    renderNotes();
}

function saveNotes(content) {
    const status = document.getElementById('note-status');
    status.innerText = "Modification...";

    const session = state.notes.sessions.find(s => s.id == state.notes.currentSessionId);
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
    if (state.notes.sessions.length <= 1) return alert("Il doit rester au moins une session.");
    if (confirm("Supprimer définitivement cette session ?")) {
        state.notes.sessions = state.notes.sessions.filter(s => s.id != state.notes.currentSessionId);
        state.notes.currentSessionId = state.notes.sessions[0].id;
        saveToSupabase();
        renderNotes();
    }
}

// Fonction pour ouvrir la modal en mode édition
function editItem(index) {
    const it = state.inventaire[index];
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
        state.inventaire[editIndex] = itemData;
    } else {
        state.inventaire.push(itemData);
    }

    closeModal();
    renderAll();

    // Reset du champ générique
    document.getElementById('m-index').value = "-1";
}


function switchTab(t) {
    document.getElementById('section-actions').classList.toggle('hidden', t !== 'actions');
    document.getElementById('section-spells').classList.toggle('hidden', t !== 'spells');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + t).classList.add('active');
}

async function backToSelection() {
    if (currentCharacterId) await saveToSupabase();

    currentCharacterId = null;

    document.getElementById('app').classList.add('hidden');
    loadCharactersList();

    window.scrollTo(0, 0);
}

function toggleInspiration() {
    state.inspiration = !state.inspiration;
    renderInspiration();
    saveData(); // Sauvegarde automatique dans Supabase
}

function renderInspiration() {
    const btn = document.getElementById('inspiration-btn');
    const star = document.getElementById('inspiration-star');
    const status = document.getElementById('inspiration-status');

    if (state.inspiration) {
        // État Actif : Doré et brillant
        btn.classList.remove('border-zinc-800', 'bg-transparent');
        btn.classList.add('border-amber-500/50', 'bg-amber-500/10', 'shadow-[0_0_15px_rgba(245,158,11,0.2)]');
        star.classList.add('animate-pulse');
        status.innerText = "Actif";
        status.classList.remove('text-zinc-600');
        status.classList.add('text-amber-500');
    } else {
        // État Inactif : Sombre
        btn.classList.add('border-zinc-800', 'bg-transparent');
        btn.classList.remove('border-amber-500/50', 'bg-amber-500/10', 'shadow-[0_0_15px_rgba(245,158,11,0.2)]');
        star.classList.remove('animate-pulse');
        status.innerText = "Inactif";
        status.classList.add('text-zinc-600');
        status.classList.remove('text-amber-500');
    }
}

function renderBlessures() {
    const container = document.getElementById('blessures-container');
    if (!container) return; // Sécurité si l'élément n'existe pas encore
    
    const statusLabel = document.getElementById('death-status');
    container.innerHTML = '';

    // Si blessures n'existe pas dans le state, on l'initialise
    if (state.blessures === undefined) state.blessures = 0;

    for (let i = 1; i <= 6; i++) {
        const isFilled = i <= state.blessures;
        const bolt = document.createElement('div');
        
        // Style de la "case" éclair
        bolt.className = `cursor-pointer transition-all duration-300 transform ${isFilled ? 'scale-110' : 'hover:scale-110 opacit-50'}`;
        
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
            state.blessures = (state.blessures === i) ? i - 1 : i;
            renderAll();
            saveData(); // Sauvegarde sur Supabase
        };
        
        container.appendChild(bolt);
    }
    
    // Mise à jour du texte
    if (state.blessures >= 6) { statusLabel.innerText = "DÉCÉDÉ"; statusLabel.style.color = "#ef4444"; }
    else if (state.blessures >= 4) { statusLabel.innerText = "AGONISANT"; statusLabel.style.color = "#f97316"; }
    else if (state.blessures > 0) { statusLabel.innerText = "BLESSÉ"; statusLabel.style.color = "#fbbf24"; }
    else { statusLabel.innerText = "STABLE"; statusLabel.style.color = "#71717a"; }
}

function resetBlessures() {
    state.blessures = 0;
    renderAll();
    saveData();
}

// --- INIT ---
window.onload = checkUser;

// Global Exports
window.handleLogin = handleLogin;
window.handleSignup = handleSignup;
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
