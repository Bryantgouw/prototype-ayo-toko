// Supabase URL & Key
const SUPABASE_URL = "YOUR URL"; 
const SUPABASE_ANON_KEY = "YOUR KEY"; 

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =========================================================================
// BAGIAN SIGN UP
// =========================================================================

// Mulai
const signupForm = document.getElementById('signup-form');

// Event Listener saat tombol Submit ditekan
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Mencegah reload halaman otomatis

    // Ambil semua data dari input HTML berdasarkan ID yang sudah diperbaiki
    const nama = document.getElementById('nama-pemilik-input').value;
    const namaToko = document.getElementById('nama-toko-input').value;
    const nomorPonsel = "+62" + document.getElementById('phone-input').value; 
    const kodeToko = document.getElementById('kode-toko-input').value;
    const kodeKeamanan = document.getElementById('kode-keamanan-input').value;
    const kodeReferral = document.getElementById('kode-referral-input').value;

    try {
        // Tampilan loading stat atau disable button jika diperlukan
        const submitBtn = signupForm.querySelector('button[type="submit"]');
        submitBtn.innerText = "MENYIMPAN...";
        submitBtn.disabled = true;

        // Insert data ke tabel Supabase
        const { data, error } = await supabaseClient
            .from('users') 
            .insert([
                { 
                    nama_pemilik_toko: nama, 
                    nama_toko: namaToko, 
                    nomor_ponsel: nomorPonsel, 
                    kode_toko: kodeToko || null, 
                    kode_keamanan: kodeKeamanan, 
                    kode_referral: kodeReferral || null // Mengirim null jika kosong
                }
            ]);

        // Penanganan Response
        if (error) {
            throw error;
        }

        // Jika berhasil
        M.toast({html: 'Pendaftaran berhasil!', classes: 'green rounded'}); // Toast bawaan Materialize
        
        // Reset form setelah berhasil
        signupForm.reset();
        
        // Redirect ke halaman login setelah 2 detik
        setTimeout(() => {
            window.location.href = "../pages/login.html";
        }, 2000);

    } catch (error) {
        console.error("Error inserting data:", error.message);
        M.toast({html: 'Gagal mendaftar: ' + error.message, classes: 'red rounded'});
    } finally {
        // Kembalikan status tombol ke semula
        const submitBtn = signupForm.querySelector('button[type="submit"]');
        submitBtn.innerText = "DAFTAR";
        submitBtn.disabled = false;
    }
});