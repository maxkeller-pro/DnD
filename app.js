const APP_VERSION = "1.2.2";

// --- CONFIGURATION SUPABASE ---
const isProduction = window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1" && window.location.hostname !== "";
let filterPreparedOnly = false;

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
    { n: "Athlétisme", s: "Force" }, { n: "Acrobaties", s: "Dextérité" }, { n: "Escamotage", s: "Dextérité" }, { n: "Discrétion", s: "Dextérité" },
    { n: "Arcanes", s: "Intelligence" }, { n: "Histoire", s: "Intelligence" }, { n: "Investigation", s: "Intelligence" }, { n: "Nature", s: "Intelligence" }, { n: "Religion", s: "Intelligence" },
    { n: "Dressage", s: "Sagesse" }, { n: "Médecine", s: "Sagesse" }, { n: "Perception", s: "Sagesse" }, { n: "Perspicacité", s: "Sagesse" }, { n: "Survie", s: "Sagesse" },
    { n: "Tromperie", s: "Charisme" }, { n: "Intimidation", s: "Charisme" }, { n: "Performance", s: "Charisme" }, { n: "Persuasion", s: "Charisme" }
];
const statsOrder = ["Force", "Dextérité", "Constitution", "Intelligence", "Sagesse", "Charisme"];

let currentCharacterId = null;

function getInitialState() {
    return {
        nom: "Nouveau Héros", race: "Humain", classe: "Barbare", niveau: 1,
        hp_cur: 10, hp_max: 10, hd_cur: 1, maxWeight: 14, ac: 10, speed: 9,
        stats: { Force: 10, Dextérité: 10, Constitution: 10, Intelligence: 10, Sagesse: 10, Charisme: 10 },
        m_saves: [], m_skills: {}, attaques: [], capacites: [], inventaire: [], spells: [],
        spellSlots: { 
            1: { max: 0, used: 0 }, 2: { max: 0, used: 0 }, 3: { max: 0, used: 0 },
            4: { max: 0, used: 0 }, 5: { max: 0, used: 0 }, 6: { max: 0, used: 0 },
            7: { max: 0, used: 0 }, 8: { max: 0, used: 0 }, 9: { max: 0, used: 0 } 
        },
        inspiration: false, blessures: 0, money: { pp: 0, po: 0, pa: 0, pc: 0 },
        languages: [], tools: [], portrait: "", openedDescs: [],
        notes: {
            currentSessionId: Date.now(),
            sessions: [{ id: Date.now(), title: "Session Initiale", content: "" }]
        }
    };
}

// Au chargement initial de la page
let state = getInitialState();
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
    state = getInitialState();

    const { data: row, error } = await supabaseClient
        .from('personnages')
        .select('*')
        .eq('id', charId)
        .single();

    if (error) return console.error("Erreur de chargement:", error);

    if (row) {
        currentCharacterId = row.id;
        state.nom = row.nom || state.nom;


        const baseState = {
            nom: "Nouveau Héros", race: "Humain", classe: "Barbare", niveau: 1,
            hp_cur: 10, hp_max: 10, hd_cur: 1, maxWeight: 14, ac: 10,
            stats: { Force: 10, Dextérité: 10, Constitution: 10, Intelligence: 10, Sagesse: 10, Charisme: 10 },
            m_saves: [], m_skills: [], attaques: [], capacites: [], inventaire: [], spells: [],
            spellSlots: {
                1: { max: 0, used: 0 },
                2: { max: 0, used: 0 },
                3: { max: 0, used: 0 },
                4: { max: 0, used: 0 },
                5: { max: 0, used: 0 },
                6: { max: 0, used: 0 },
                7: { max: 0, used: 0 },
                8: { max: 0, used: 0 },
                9: { max: 0, used: 0 }
            },
            money: { pp: 0, po: 0, pa: 0, pc: 0 },
            languages: [], tools: [], portrait: "",
            notes: { currentSessionId: 0, sessions: [{ id: Date.now(), title: "Session Initiale", content: "" }] },
            openedDescs: []
        };

        state = { ...baseState, ...row.data };

        if (!state.spellSlots) {
            state.spellSlots = baseState.spellSlots;
        }


        document.getElementById('char-selection-overlay').classList.add('hidden');

        document.getElementById('app').classList.remove('hidden');

        renderAll();

        window.history.pushState({ charId: charId }, "");
    }


    window.onpopstate = function (event) {
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
    document.getElementById('app-version').innerText = `v${APP_VERSION}`;
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
            label.innerText = "En forme";
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
    if (document.getElementById('speed')) document.getElementById('speed').value = state.speed || 9;
    document.getElementById('prof-bonus').innerText = `+${p}`;

    // Stats & Init
    const init = getMod(state.stats.Dextérité);
    document.getElementById('init-bonus').innerText = (init >= 0 ? '+' : '') + init;
    // 2. Extraire le niveau de perception (Objet ou Tableau pour la compatibilité)
    let perceptionLevel = 0;
    if (state.m_skills) {
        if (Array.isArray(state.m_skills)) {
            perceptionLevel = state.m_skills.includes("Perception") ? 1 : 0;
        } else {
            perceptionLevel = parseInt(state.m_skills["Perception"]) || 0;
        }
    }

    // 3. Calculer et afficher
    const wisdomMod = getMod(state.stats.Sagesse || 10);
    const passiveValue = 10 + wisdomMod + (perceptionLevel * p);

    document.getElementById('passive-perception').innerText = passiveValue;

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
    renderSpellSlots();

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
    
    // Sécurité : s'assurer que m_skills est utilisable
    if (Array.isArray(state.m_skills)) {
        const legacy = [...state.m_skills];
        state.m_skills = {};
        legacy.forEach(name => state.m_skills[name] = 1);
    }

    document.getElementById('skills-area').innerHTML = SKILLS_LIST
        .filter(s => s.n.toLowerCase().includes(search))
        .map(s => {
            const level = state.m_skills[s.n] || 0; // 0, 1 ou 2
            const mod = getMod(state.stats[s.s] || 10) + (level * p);
            
            // Classes CSS pour le visuel de la pastille
            let dotClass = "border-zinc-700 bg-black/20"; // Défaut
            let content = "";
            
            if (level === 1) {
                dotClass = "bg-purple-500 border-purple-400"; // Maîtrise
            } else if (level === 2) {
                dotClass = "bg-amber-500 border-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.4)]"; // Expertise
                content = '<span class="text-[7px] text-black font-black">E</span>';
            }

            return `
                <div class="stat-row-layout hover:bg-white/5 transition-colors cursor-pointer" onclick="toggleSkill('${s.n}')">
                    <div class="w-3 h-3 rounded-full border flex items-center justify-center transition-all ${dotClass}">
                        ${content}
                    </div>
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

        // Injection du nom et du bonus au toucher
        root.querySelector('.atk-nom').innerText = a.nom;
        root.querySelector('.atk-hit-bonus').innerText = (hitBonus >= 0 ? '+' : '') + hitBonus;

        // --- GESTION DES DÉGÂTS (Ligne 1 + Ligne 2) ---
        const dmgDisplay = root.querySelector('.atk-dmg-display');
        const bonusStr = dmgBonus !== 0 ? (dmgBonus > 0 ? '+' : '') + dmgBonus : '';
        
        // On construit le HTML pour permettre des styles différents sur la 2ème ligne
        let dmgHTML = `<span>${a.dice}${bonusStr}</span>`;
        
        if (a.hasSecondary && a.dice2) {
            dmgHTML += ` <span class="text-zinc-600 text-[10px] mx-0.5">+</span> <span class="text-amber-600/80">${a.dice2}</span>`;
        }
        dmgDisplay.innerHTML = dmgHTML;

        // --- GESTION DU TYPE DE DÉGÂTS (Badges cumulés) ---
        const typeBadge = root.querySelector('.atk-type-badge');
        if (typeBadge) {
            if (a.damageType) {
                typeBadge.classList.remove('hidden');
                
                let typeHTML = `<span>${a.damageType}</span>`;
                
                // Si secondaire, on ajoute un séparateur et le deuxième type
                if (a.hasSecondary && a.damageType2) {
                    typeHTML += ` <span class="text-zinc-600 mx-1">/</span> <span>${a.damageType2}</span>`;
                }
                
                typeBadge.innerHTML = typeHTML;

                // Coloration dynamique simple (s'applique au premier type)
                if (a.damageType === 'Feu') typeBadge.style.color = '#ef4444';
                else if (a.damageType === 'Froid') typeBadge.style.color = '#60a5fa';
                else typeBadge.style.color = ''; // Reset si autre
            } else {
                typeBadge.classList.add('hidden');
            }
        }

        root.querySelector('.atk-desc-text').innerText = a.desc || "";

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
    const container = document.getElementById('spells-list');
    if (!container) return;

    const searchTerm = document.getElementById('spell-search')?.value.toLowerCase() || "";
    const filterRank = document.getElementById('spell-filter-rank')?.value || "all";
    const filterAction = document.getElementById('spell-filter-action')?.value || "all";

    container.innerHTML = '';
    container.className = "space-y-6";

    let spellsWithIndexes = state.spells.map((spell, originalIndex) => ({
        ...spell,
        originalIndex: originalIndex
    }));

    if (!state.openedDescs) state.openedDescs = [];

    let filtered = spellsWithIndexes
        .filter(s => s.nom.toLowerCase().includes(searchTerm))
        .filter(s => filterRank === "all" || s.niveau.toString() === filterRank)
        .filter(s => filterAction === "all" || s.temps === filterAction);

    // --- LOGIQUE DE SÉPARATION EN 3 GROUPES ---
    
    // 1. Les Cantrips (Niveau 0) - Toujours affichés en haut
    const cantrips = filtered.filter(s => s.niveau == 0);

    // 2. Les Sorts Préparés (Niveau 1+)
    const preparedSpells = filtered.filter(s => s.niveau > 0 && s.prepare === true);

    // 3. Le Grimoire (Niveau 1+ non préparés)
    const grimoireSpells = filtered.filter(s => s.niveau > 0 && s.prepare !== true)
                                   .sort((a, b) => a.niveau - b.niveau);

    // --- RENDU DES SECTIONS ---

    // Section Cantrips
    if (cantrips.length > 0) {
        renderSpellSection(container, "Sorts Mineurs (Cantrips)", cantrips, "text-amber-500");
    }

    // Section Préparés
    if (preparedSpells.length > 0) {
        renderSpellSection(container, "Sorts Préparés", preparedSpells, "text-purple-500");
    }

    // Section Grimoire (masquée si le filtre "préparés uniquement" est actif)
    if (grimoireSpells.length > 0 && !filterPreparedOnly) {
        renderSpellSection(container, "Grimoire (Non préparés)", grimoireSpells, "text-zinc-600");
    }
}

// Fonction auxiliaire pour générer une section (Titre + Grille)
function renderSpellSection(parentContainer, title, spells, titleColorClass) {
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
    // Ajout de items-start pour empêcher l'étirement vertical automatique
    grid.className = "grid grid-cols-1 md:grid-cols-2 gap-3 items-start";
    
    spells.forEach(spell => {
        const uniqueKey = `spell-${spell.originalIndex}`;
        const isOpened = state.openedDescs.includes(uniqueKey);
        const isPrepared = spell.prepare === true;
        const isCantrip = spell.niveau == 0;

        const card = document.createElement('div');

        // --- CONFIGURATION DRAG & DROP ---
        card.draggable = true;
        card.dataset.index = spell.originalIndex; // On stocke l'index réel

        card.ondragstart = (e) => {
            e.dataTransfer.setData("text/plain", spell.originalIndex);
            card.classList.add('opacity-50', 'scale-95');
        };

        card.ondragend = () => {
            card.classList.remove('opacity-50', 'scale-95');
        };

        card.ondragover = (e) => {
            e.preventDefault(); // Autorise le drop
            card.classList.add('border-purple-500'); // Feedback visuel
        };

        card.ondragleave = () => {
            card.classList.remove('border-purple-500');
        };

        card.ondrop = (e) => {
            e.preventDefault();
            card.classList.remove('border-purple-500');
            const fromIndex = parseInt(e.dataTransfer.getData("text/plain"));
            const toIndex = spell.originalIndex;
            
            if (fromIndex !== toIndex) {
                reorderSpells(fromIndex, toIndex);
            }
        };
        
        let borderColor = 'border-zinc-800';
        if (isCantrip) borderColor = 'border-amber-500/30';
        else if (isPrepared) borderColor = 'border-purple-500/30';

        // AJOUT de h-fit : la carte ne prend que la hauteur dont elle a besoin
        card.className = `bg-zinc-900/40 border ${borderColor} rounded-xl p-3 hover:border-purple-500/50 transition cursor-pointer group relative h-fit`;

        card.onclick = (e) => {
            if (e.target.closest('button')) return;
            toggleDesc(uniqueKey);
        };

        const prepButton = isCantrip ? '' : `
            <button onclick="event.stopPropagation(); toggleSpellPreparation(${spell.originalIndex})" 
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
                <button onclick="event.stopPropagation(); editSpell(${spell.originalIndex})" class="text-zinc-500 hover:text-white text-[12px] p-1">✎</button>
                <button onclick="event.stopPropagation(); deleteSpell(${spell.originalIndex})" class="text-zinc-500 hover:text-red-500 text-[12px] p-1">✕</button>
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

function renderSpellSlots() {
    const container = document.getElementById('spell-slots-container');
    if (!container) return;

    container.innerHTML = '';
    
    // On boucle de 1 à 9
    for (let lvl = 1; lvl <= 9; lvl++) {
        const slot = state.spellSlots[lvl];
        
        const div = document.createElement('div');
        div.className = "bg-zinc-900/60 border border-zinc-800 rounded-lg p-2 flex flex-col items-center gap-1 min-w-0 w-full";
        const dispo = slot.max - slot.used;
        

        div.innerHTML = `
            <div class="flex justify-between w-full items-center mb-1">
                <span class="text-[9px] font-black text-zinc-500 uppercase">Niv. ${lvl}</span>
                <button onclick="setupMaxSlots(${lvl})" class="text-[10px] hover:text-purple-500 text-zinc-700">⚙️</button>
            </div>
            <div class="flex items-center gap-2">
                <button onclick="updateUsedSlot(${lvl}, -1)" class="text-zinc-500 hover:text-white">-</button>
                <span class="text-xs font-bold ${dispo <= 0 && slot.max > 0 ? 'text-red-500' : 'text-purple-400'}">
                    ${slot.max > 0 ? dispo : '--'}
                </span>
                <button onclick="updateUsedSlot(${lvl}, 1)" class="text-zinc-500 hover:text-white">+</button>
            </div>
            <div class="w-full flex gap-1 mt-1">
                ${slot.max > 0 ? Array.from({ length: slot.max }).map((_, i) => `
                    <div class="h-1 flex-1 rounded-full ${i < dispo ? 'bg-purple-600' : 'bg-zinc-800'}"></div>
                `).join('') : '<div class="h-1 w-full bg-zinc-800/30 rounded-full"></div>'}
            </div>
        `;
        container.appendChild(div);
    }
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
            document.getElementById('m-spell-rank').value = s.niveau || 0;
            document.getElementById('m-spell-school').value = s.ecole || 'abjuration';
            document.getElementById('spell-action-type').value = s.temps || 'action';
            document.getElementById('m-spell-range').value = s.portee || '';
            document.getElementById('m-spell-target').value = s.cible || '';
            document.getElementById('m-spell-duration').value = s.duree || '';

            document.getElementById('comp-v').checked = s.composantes?.v || false;
            document.getElementById('comp-s').checked = s.composantes?.s || false;
            document.getElementById('comp-m').checked = s.composantes?.m || false;
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
            hasSecondary: document.getElementById('m-atk-has-secondary').checked,
            dice2: document.getElementById('m-atk-dice2').value,
            damageType2: document.getElementById('m-atk-type2').value,
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
            niveau: parseInt(document.getElementById('m-spell-rank').value) || 0,
            ecole: document.getElementById('m-spell-school').value,
            temps: document.getElementById('spell-action-type').value,
            portee: document.getElementById('m-spell-range').value,
            cible: document.getElementById('m-spell-target').value,
            duree: document.getElementById('m-spell-duration').value,
            incantation: document.getElementById('m-spell-incantation').value,

            composantes: {
                v: document.getElementById('comp-v').checked,
                s: document.getElementById('comp-s').checked,
                m: document.getElementById('comp-m').checked
            },
            prepare: true
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
    // Initialisation si m_skills est un tableau (compatibilité ancienne version)
    if (Array.isArray(state.m_skills)) {
        const legacy = [...state.m_skills];
        state.m_skills = {};
        legacy.forEach(name => state.m_skills[name] = 1);
    }

    const current = state.m_skills[n] || 0;
    // Cycle : 0 (Rien) -> 1 (Maîtrise) -> 2 (Expertise) -> 0
    state.m_skills[n] = (current + 1) % 3;
    
    renderAll();
}
function updateLevel(v) { state.niveau = parseInt(v) || 1; state.hd_cur = state.niveau; renderAll(); }
function updateHP(t, v) { if (t === 'cur') state.hp_cur = parseInt(v) || 0; else state.hp_max = parseInt(v) || 1; renderAll(); }

function toggleDesc(id) {
    if (!state.openedDescs) state.openedDescs = [];

    if (state.openedDescs.includes(id)) {
        state.openedDescs = state.openedDescs.filter(x => x !== id);
    } else {
        state.openedDescs.push(id);
    }
    renderAll();
}

function takeRest(type) {
    const p = getProf();

    if (type === 'long') {
        state.hp_cur = state.hp_max;
        state.hd_cur = state.niveau;
        
        if (state.spellSlots) {
            for (let lvl in state.spellSlots) {
                state.spellSlots[lvl].used = 0;
            }
        }

        if (state.blessures > 0) {
            state.blessures -= 1;
        }
    }

    state.capacites.forEach(c => {
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
    // 1. ANTIM-SPAM : Si on est déjà en train de sortir, on ignore le clic
    if (isBackingToSelection) return;
    isBackingToSelection = true;

    try {
        // Feedback visuel optionnel : on change le curseur du body
        document.body.style.cursor = 'wait';

        // 2. Sauvegarde une dernière fois avant de quitter
        if (currentCharacterId) {
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
        currentCharacterId = null;

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
    state.blessures = 0;
    renderAll();
    saveData();
}

function editSpell(index) {
    editingSpellIndex = index;
    const s = state.spells[index];

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

window.deleteSpell = (index) => {
    // On retire l'élément du tableau state.spells
    state.spells.splice(index, 1);

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
    const slot = state.spellSlots[lvl];
    if (!slot) return;

    const consumption = -change; // On inverse le signe pour la logique "used"
    const newVal = slot.used + consumption;
    
    // On vérifie qu'on reste entre 0 et le max
    if (newVal >= 0 && newVal <= slot.max) {
        state.spellSlots[lvl].used = newVal;
        renderSpellSlots(); 
        saveToSupabase();    
    }
};

window.setupMaxSlots = (lvl) => {
    const newMax = prompt(`Total d'emplacements pour le Niveau ${lvl} :`, state.spellSlots[lvl].max);
    if (newMax !== null) {
        state.spellSlots[lvl].max = parseInt(newMax) || 0;
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
        // On récupère l'index original dans le state global pour la modification
        const realIndex = state.spells.findIndex(s => s.nom === spell.nom);
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
    const totalPrepared = state.spells.filter(s => s.prepare).length;
    if(counter) counter.innerText = `${totalPrepared} sort${totalPrepared > 1 ? 's' : ''} préparé${totalPrepared > 1 ? 's' : ''}`;

    document.getElementById('modal-prep-spells').classList.remove('hidden');
};

window.toggleSpellPrepInList = (index) => {
    state.spells[index].prepare = !state.spells[index].prepare;
    openPrepModal(); // Rafraîchit la vue
};

window.closePrepModal = () => {
    document.getElementById('modal-prep-spells').classList.add('hidden');
    renderSpellsList(); // Rafraîchit la liste principale
    saveToSupabase();   // Sauvegarde les changements
};

window.toggleSpellPreparation = (originalIndex) => {
    const spell = state.spells[originalIndex];
    // Alterne entre true et false
    spell.prepare = !spell.prepare;
    
    renderSpellsList();
    saveToSupabase(); // Sauvegarde l'état préparé
};

window.reorderSpells = (fromIndex, toIndex) => {
    // On extrait l'élément déplacé
    const movedSpell = state.spells.splice(fromIndex, 1)[0];
    
    // On l'insère à sa nouvelle position
    state.spells.splice(toIndex, 0, movedSpell);

    // Mise à jour de l'interface et de la base de données
    renderSpellsList();
    saveToSupabase();
};

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
