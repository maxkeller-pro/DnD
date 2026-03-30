import { supabaseClient } from './config.js';

export async function handleLogin() {
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

export async function handleSignup() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

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
    location.reload(); // Force le retour à l'écran de login
}

/**
 * Vérifie l'état de l'utilisateur
 * @param {Function} onAuthenticated - La fonction à appeler si on est connecté
 */
export async function checkUser(onAuthenticated) {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (error) {
        console.error("Erreur session:", error.message);
        return;
    }

    const authOverlay = document.getElementById('auth-overlay');
    const charSelection = document.getElementById('char-selection');

    if (session) {
        console.log("Session détectée pour:", session.user.email);
        
        // On cache le login, on montre la sélection
        if (authOverlay) authOverlay.style.setProperty('display', 'none', 'important');
        if (charSelection) charSelection.classList.remove('hidden');

        // On lance le chargement des persos si une fonction a été fournie
        if (onAuthenticated && typeof onAuthenticated === 'function') {
            onAuthenticated();
        }
    } else {
        console.log("Aucune session active.");
        if (authOverlay) authOverlay.style.display = 'flex';
        if (charSelection) charSelection.classList.add('hidden');
    }
}

