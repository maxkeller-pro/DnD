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

export const supabaseClient = supabase.createClient(currentConfig.URL, currentConfig.KEY);