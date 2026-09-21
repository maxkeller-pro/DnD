// js/api.js
import { supabaseClient } from './config.js';
import { getInitialState } from './state.js';
import { switchTab } from './ui-modals.js';

/**
 * Sauvegarde l'état actuel du personnage (Update ou Insert via upsert)
 */
export async function saveToSupabase() {
    // On vérifie d'abord si l'utilisateur est connecté
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    if (!window.currentCharacterId) {
        return;
    }

    // window.state est global, on l'utilise pour le payload
    const payload = {
        user_id: user.id,
        nom: window.state.nom,
        data: window.state
    };

    // Si on a déjà un ID de perso, on l'ajoute pour faire un UPDATE
    if (window.currentCharacterId) {
        payload.id = window.currentCharacterId;
    }

    const { error } = await supabaseClient
        .from('personnages')
        .upsert(payload);

    if (error) {
        console.error("Erreur sauvegarde :", error.message);
    } else {
        console.log("Sauvegarde réussie.");
    }
}

export function sanitizeState(state) {
    if (!state || typeof state !== 'object') return false;
    let modified = false;

    const arrayKeys = ['spells', 'attaques', 'capacites', 'm_saves', 'languages', 'tools', 'openedDescs', 'wildShapes', 'inventaire'];
    arrayKeys.forEach(key => {
        if (Array.isArray(state[key])) {
            const origLength = state[key].length;
            state[key] = state[key].filter(item => item != null && typeof item === 'object');
            if (state[key].length !== origLength) modified = true;
        } else if (state[key] === null || state[key] === undefined) {
            state[key] = [];
            modified = true;
        }
    });

    if (state.inventory) {
        if (Array.isArray(state.inventory.pochePrincipale)) {
            const orig = state.inventory.pochePrincipale.length;
            state.inventory.pochePrincipale = state.inventory.pochePrincipale.filter(item => item != null);
            if (state.inventory.pochePrincipale.length !== orig) modified = true;
        }
        if (Array.isArray(state.inventory.pocheSurvie)) {
            const orig = state.inventory.pocheSurvie.length;
            state.inventory.pocheSurvie = state.inventory.pocheSurvie.filter(item => item != null);
            if (state.inventory.pocheSurvie.length !== orig) modified = true;
        }
    }

    if (state.mountData) {
        ['inventoryLeft', 'inventoryRight', 'attacks', 'skills'].forEach(key => {
            if (Array.isArray(state.mountData[key])) {
                const orig = state.mountData[key].length;
                state.mountData[key] = state.mountData[key].filter(item => item != null);
                if (state.mountData[key].length !== orig) modified = true;
            }
        });
    }

    return modified;
}

export async function loadUserData(user) {
    const { data, error } = await supabaseClient
        .from('personnages')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true) // <-- Filtre pour ignorer les personnages archivés
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error("Erreur lors du chargement auto:", error);
        return;
    }

    if (data) {
        // On met à jour l'ID global et le State
        window.currentCharacterId = data.id;
        window.state = { 
            ...getInitialState(), 
            ...data.data, 
            mountData: { ...getInitialState().mountData, ...(data.data?.mountData || {}) } 
        };
        const wasCleaned = sanitizeState(window.state);
        if (wasCleaned) {
            saveToSupabase();
        }

        // On affiche l'application et on cache la sélection
        document.getElementById('char-selection-overlay')?.classList.add('hidden');
        document.getElementById('app')?.classList.remove('hidden');

        // On lance le rendu global sans forcer de re-sauvegarde immédiate
        if (window.switchTab) switchTab('actions');
        if (window.renderAll) window.renderAll(false);
    } else {
        // Si aucun personnage actif n'existe, on affiche la liste des personnages
        console.log("Aucun personnage actif trouvé pour cet utilisateur.");
        loadCharactersList();
    }
}

window.getInventorySaveBonus = function() {
    const inv = window.state.inventory.pochePrincipale || [];
    // On additionne les bonus de tous les objets qui possèdent la propriété bonusSauvegarde
    return inv.reduce((total, item) => {
        const bonus = parseInt(item.bonusSauvegarde) || 0;
        const qte = parseInt(item.quantite) || 1;
        return total + (bonus * qte);
    }, 0);
};

export async function deleteCharacter(charId, charName) {
    const confirmDelete = confirm(`Es-tu sûr de vouloir envoyer ${charName} au Valhalla définitivement ?`);

    if (confirmDelete) {
        // Soft delete : On met à jour is_active à false au lieu de supprimer la ligne
        const { error } = await supabaseClient
            .from('personnages')
            .update({ is_active: false })
            .eq('id', charId);

        if (error) {
            alert("Erreur lors de la suppression : " + error.message);
        } else {
            // Réinitialisation de l'ID si le perso était ouvert
            if (window.currentCharacterId === charId) {
                window.currentCharacterId = null;
            }

            // Rafraîchissement de la liste filtrée (qui masque les is_active = false)
            loadCharactersList();
        }
    }
}

export async function createNewCharacter() {
    const name = prompt("Nom du héros ?");
    if (!name || !name.trim()) return;

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        alert("Vous devez être connecté pour créer un personnage.");
        return;
    }

    const cleanName = name.trim();
    // 1. Génération de l'état initial propre avec le nom saisi
    const initialState = { ...getInitialState(), nom: cleanName };

    // 2. Création dans Supabase
    const { data, error } = await supabaseClient
        .from('personnages')
        .insert([{
            nom: cleanName,
            user_id: user.id,
            data: initialState
        }])
        .select();

    if (error) {
        console.error("Erreur création personnage :", error.message);
        alert("Impossible de créer le personnage : " + error.message);
        return;
    }

    if (data && data[0]) {
        const newChar = data[0];

        // 3. Définition immédiate de l'ID global pour débloquer saveToSupabase
        window.currentCharacterId = newChar.id;
        window.state = { ...initialState, ...newChar.data };

        // 4. Masquer l'écran de sélection et afficher la fiche du héros
        const overlay = document.getElementById('char-selection-overlay');
        const app = document.getElementById('app');

        if (overlay) overlay.classList.add('hidden');
        if (app) app.classList.remove('hidden');

        // 5. Initialisation des onglets et premier rendu sans forcer de re-sauvegarde
        if (window.switchTab) window.switchTab('actions');
        if (window.renderAll) window.renderAll(false);

        // 6. Rafraîchir la liste en arrière-plan
        loadCharactersList();
    }
}

export async function selectCharacter(charId) {
    // 1. On récupère la structure de base propre
    const baseState = getInitialState();

    const { data: row, error } = await supabaseClient
        .from('personnages')
        .select('*')
        .eq('id', charId)
        .single();

    if (error) return console.error("Erreur de chargement:", error);

    if (row) {
        // 2. Mise à jour des identifiants globaux
        window.currentCharacterId = row.id;

        // 3. Fusion des données : Base + Données Supabase
        // On s'assure que si des nouvelles clés ont été ajoutées au code depuis la dernière save, 
        // elles existent (grâce au spread de baseState)
        window.state = { 
            ...baseState, 
            ...row.data,
            mountData: { ...baseState.mountData, ...(row.data?.mountData || {}) },
            nom: row.nom || row.data?.nom || baseState.nom 
        };

        const wasCleaned = sanitizeState(window.state);
        if (wasCleaned) {
            saveToSupabase();
        }

        // Sécurité pour les emplacements de sorts si absents de la sauvegarde
        if (!window.state.spellSlots) {
            window.state.spellSlots = baseState.spellSlots;
        }

        // 4. Gestion de l'affichage
        const overlay = document.getElementById('char-selection-overlay');
        const app = document.getElementById('app');
        
        if (overlay) overlay.classList.add('hidden');
        if (app) app.classList.remove('hidden');

        // 5. Lancement du rendu global (doit être sur window)
        if (window.renderAll) {
            window.renderAll();
        }

        // 6. Gestion de l'historique pour le bouton "Précédent" du téléphone
        window.history.pushState({ charId: charId }, "");
    }
}

export async function loadCharactersList() {
    // Ajout du filtre .eq('is_active', true) pour ne récupérer que les héros actifs
    const { data: characters, error } = await supabaseClient
        .from('personnages')
        .select('id, nom, data')
        .eq('is_active', true);

    if (error) {
        console.error("Erreur lors du chargement de la liste :", error.message);
        return;
    }

    const container = document.getElementById('characters-list');
    if (!container) return;
    
    container.innerHTML = '';

    if (!characters || characters.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12 border border-dashed border-zinc-800 rounded-2xl text-zinc-600 uppercase font-bold text-[10px] tracking-widest">
                Aucun personnage trouvé au Valhalla
            </div>`;
    } else {
        characters.forEach(char => {
            const level = char.data?.niveau || 1;
            const card = document.createElement('div');
            card.className = "bg-zinc-900 border border-zinc-800 p-6 rounded-2xl hover:border-emerald-500/50 cursor-pointer transition group relative overflow-hidden";

            // Évènement au clic sur la carte (chargement du perso)
            card.onclick = (e) => {
                // On empêche le clic si on a cliqué sur le bouton supprimer
                if (e.target.closest('.btn-delete-char')) return;
                selectCharacter(char.id);
            };

            card.innerHTML = `
                <div class="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-30 transition pointer-events-none">
                    <span class="text-4xl">🐉</span>
                </div>
                <div class="text-emerald-500 text-[10px] font-black uppercase mb-1 tracking-widest">Niveau ${level}</div>
                <div class="text-xl font-bold text-white group-hover:text-emerald-400 transition">${char.nom}</div>
                
                <button class="btn-delete-char mt-4 text-[9px] font-black text-zinc-600 hover:text-red-500 uppercase tracking-tighter flex items-center gap-1 transition relative z-10">
                    <span class="text-xs">✕</span> Supprimer le personnage
                </button>
            `;

            // On lie le bouton supprimer à la fonction deleteCharacter (soft delete)
            const deleteBtn = card.querySelector('.btn-delete-char');
            deleteBtn.onclick = (e) => {
                e.stopPropagation(); // Sécurité supplémentaire
                deleteCharacter(char.id, char.nom);
            };

            container.appendChild(card);
        });
    }

    // On affiche l'overlay de sélection
    const overlay = document.getElementById('char-selection-overlay');
    if (overlay) overlay.classList.remove('hidden');
}