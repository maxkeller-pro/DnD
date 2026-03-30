// js/api.js
import { supabaseClient } from './config.js';
import { getInitialState } from './state.js';

/**
 * Sauvegarde l'état actuel du personnage (Update ou Insert via upsert)
 */
export async function saveToSupabase() {
    // On vérifie d'abord si l'utilisateur est connecté
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

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

    const { data, error } = await supabaseClient
        .from('personnages')
        .upsert(payload)
        .select(); 

    if (error) {
        console.error("Erreur sauvegarde:", error.message);
    } else if (data && data[0]) {
        // On met à jour l'ID global si c'était un nouveau perso
        window.currentCharacterId = data[0].id; 
        console.log("Sauvegarde réussie.");
    }
}

export async function loadUserData(user) {
    const { data, error } = await supabaseClient
        .from('personnages')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false }) // Assurez-vous que la colonne 'updated_at' existe dans Supabase
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error("Erreur lors du chargement auto:", error);
        return;
    }

    if (data) {
        // On met à jour l'ID global et le State
        window.currentCharacterId = data.id;
        window.state = { ...getInitialState(), ...data.data, mountData: { ...getInitialState().mountData, ...(data.data.mountData || {}) } };

        // On affiche l'application et on cache la sélection
        document.getElementById('char-selection-overlay').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');

        // On lance le rendu global
        window.renderAll();
    } else {
        // Si aucun personnage n'existe, on reste sur l'écran de sélection
        console.log("Aucun personnage trouvé pour cet utilisateur.");
        window.renderAll(true);
    }
}

export async function deleteCharacter(charId, charName) {
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
            if (window.currentCharacterId === charId) {
                window.currentCharacterId = null;
            }
        }
    }
}

export async function createNewCharacter() {
    const name = prompt("Nom du héros ?");
    if (!name) return;

    const { data: { user } } = await supabaseClient.auth.getUser();

    // On utilise ton objet de base défini au dessus
    const initialData = { ...getInitialState(), nom: name };

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
            nom: row.nom || row.data.nom || baseState.nom 
        };

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
    const { data: characters, error } = await supabaseClient
        .from('personnages')
        .select('id, nom, data');

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

            // On lie le bouton supprimer à la fonction deleteCharacter
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