import { supabaseClient } from './config.js';
import { loadUserData, loadCharactersList } from './api.js';

// Variable d'état pour bloquer checkUser pendant la récupération
let isResettingPassword = false;

/**
 * Affiche la modale pour saisir le nouveau mot de passe
 */
function showNewPasswordModal() {
    isResettingPassword = true;

    // Masquer l'écran de login
    const authOverlay = document.getElementById('auth-overlay');
    if (authOverlay) authOverlay.style.setProperty('display', 'none', 'important');

    // Masquer la demande d'email et afficher la modale de saisie du nouveau pass
    document.getElementById('reset-password-modal')?.classList.add('hidden');
    document.getElementById('new-password-modal')?.classList.remove('hidden');
}

// 1. DÉTECTION SUPABASE (événement de sécurité)
supabaseClient.auth.onAuthStateChange(async (event) => {
    if (event === 'PASSWORD_RECOVERY') {
        showNewPasswordModal();
    }
});

// 2. DÉTECTION IMMÉDIATE DU HASH (sécurité si l'événement arrive en retard)
if (window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery')) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', showNewPasswordModal);
    } else {
        showNewPasswordModal();
    }
}

export async function handleLogin() {
    const email = document.getElementById('auth-email')?.value?.trim();
    const password = document.getElementById('auth-password')?.value;
    const errBox = document.getElementById('auth-error');

    if (!email || !password) {
        if (errBox) {
            errBox.innerText = "Veuillez remplir tous les champs.";
            errBox.classList.remove('hidden');
        }
        return;
    }

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
        if (errBox) {
            errBox.innerText = error.message;
            errBox.classList.remove('hidden');
        }
    } else {
        if (errBox) errBox.classList.add('hidden');
        await checkUser();
    }
}

export async function handleSignup() {
    const email = document.getElementById('auth-email')?.value?.trim();
    const password = document.getElementById('auth-password')?.value;

    if (!email || !password) return alert("Remplis tous les champs !");

    const { error } = await supabaseClient.auth.signUp({ email, password });
    if (error) {
        alert("Erreur d'inscription : " + error.message);
    } else {
        alert("Inscription réussie ! Vérifie tes emails (ou connecte-toi si activé).");
    }
}

export async function handleLogout() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) alert(error.message);
    location.reload();
}

/**
 * Vérifie l'état de l'utilisateur
 * @param {Function} onAuthenticated - La fonction à appeler si on est connecté
 */
export async function checkUser(onAuthenticated) {
    // Si l'utilisateur clique sur un lien de récupération, on stoppe la redirection automatique
    if (isResettingPassword || window.location.hash.includes('type=recovery')) {
        return;
    }

    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (error) {
        console.error("Erreur session:", error.message);
        return;
    }

    const authOverlay = document.getElementById('auth-overlay');

    if (session) {
        console.log("Session détectée pour:", session.user.email);
        
        if (authOverlay) authOverlay.style.setProperty('display', 'none', 'important');

        if (onAuthenticated && typeof onAuthenticated === 'function') {
            onAuthenticated();
        } else {
            await loadCharactersList();
        }
    } else {
        console.log("Aucune session active.");
        if (authOverlay) authOverlay.style.display = 'flex';
        
        document.getElementById('app')?.classList.add('hidden');
        document.getElementById('char-selection-overlay')?.classList.add('hidden');
    }
}

export function openResetPasswordModal() {
    document.getElementById('reset-password-modal')?.classList.remove('hidden');
}

export function closeResetPasswordModal() {
    document.getElementById('reset-password-modal')?.classList.add('hidden');
}

export async function handleSendResetEmail() {
    const emailInput = document.getElementById('reset-email-input');
    const email = emailInput?.value?.trim();

    if (!email) {
        alert("Veuillez entrer une adresse e-mail valide.");
        return;
    }

    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + window.location.pathname,
    });

    if (error) {
        alert("Erreur : " + error.message);
    } else {
        alert("Un e-mail de réinitialisation vous a été envoyé !");
        closeResetPasswordModal();
        if (emailInput) emailInput.value = '';
    }
}

export async function handleUpdatePassword() {
    const passwordInput = document.getElementById('update-password-input');
    const newPassword = passwordInput?.value?.trim();

    if (!newPassword || newPassword.length < 6) {
        alert("Le mot de passe doit contenir au moins 6 caractères.");
        return;
    }

    const { error } = await supabaseClient.auth.updateUser({
        password: newPassword
    });

    if (error) {
        alert("Erreur lors de la mise à jour : " + error.message);
    } else {
        alert("Mot de passe mis à jour avec succès !");
        document.getElementById('new-password-modal')?.classList.add('hidden');
        
        // Purge le hash de l'URL pour débloquer les rechargements futurs
        window.history.replaceState(null, null, window.location.pathname);
        isResettingPassword = false;

        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user) await loadUserData(user);
    }
}