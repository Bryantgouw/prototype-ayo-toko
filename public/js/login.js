// Supabase URL & Key
const SUPABASE_URL = "YOUR URL";
const SUPABASE_ANON_KEY = "YOUR KEY";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =========================================================================
// LOGIN PAGE
// =========================================================================

// Ambil elemen DOM dari HTML
const loginForm = document.getElementById('login-form');
const phoneInput = document.getElementById('phone-input');

// Event Listener saat Form disubmit
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Mencegah reload halaman

        let phoneNumber = phoneInput.value.trim();
        
        // Bersihkan angka '0' di awal jika user tidak sengaja masukin
        if (phoneNumber.startsWith('0')) {
            phoneNumber = phoneNumber.substring(1);
        }

        // Gabungkan dengan kode negara Indonesia
        const fullPhoneNumber = '+62' + phoneNumber;

        // Simpan sementara di LocalStorage browser
        localStorage.setItem('temp_phone_number', fullPhoneNumber);

        try {
            // Ambil data dan sort tabel 'users' pada kolom 'nomor_ponsel'
            const { data, error } = await supabaseClient
                .from('users')
                .select('nomor_ponsel')
                .eq('nomor_ponsel', fullPhoneNumber)
                .single(); 

            // Handle error dari Supabase
            if (error && error.code !== 'PGRST116') {
                console.error('Terjadi kesalahan database:', error.message);
                alert('Gagal memproses permintaan. Silakan coba lagi.');
                return;
            }

            // Jalankan redirect jika data ditemukan
            if (data) {
                alert('Nomor terdaftar! Mengalihkan halaman...');
                window.location.href = 'auth.html'; 
            } else {
                alert('Nomor tidak terdaftar. Silakan daftar terlebih dahulu.');
            }

        } catch (err) {
            console.error('Error saat melakukan autentikasi:', err);
        }
    });
}

// =========================================================================
// KODE KEAMANAN PAGE
// =========================================================================
const pinForm = document.getElementById('pin-form');
if (pinForm) {
    const pinInputs = document.querySelectorAll('.pin-input');

    // Otomatis pindah kotak input saat mengetik PIN
    pinInputs.forEach((input, index) => {
        // Deteksi input angka
        input.addEventListener('input', (e) => {
            const currentInput = e.target;
            // Pastikan hanya karakter angka yang masuk
            currentInput.value = currentInput.value.replace(/[^0-9]/g, '');

            if (currentInput.value.length === 1 && index < pinInputs.length - 1) {
                // Pindah ke kotak input berikutnya
                pinInputs[index + 1].focus();
            }

            // Jika semua kotak sudah terisi penuh, otomatis submit form
            checkAndSubmitPin();
        });

        // Deteksi tombol backspace untuk mundur ke kotak sebelumnya
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && input.value.length === 0 && index > 0) {
                pinInputs[index - 1].focus();
            }
        });
    });

    // Fungsi untuk mengumpulkan PIN dan validasi ke Supabase
    async function checkAndSubmitPin() {
        // Ambil isi dari setiap kotak input lalu gabungkan
        let pinValue = '';
        pinInputs.forEach(input => {
            pinValue += input.value;
        });

        // Jika panjang PIN sudah tepat 6 digit, eksekusi pencocokan database
        if (pinValue.length === 6) {
            // Ambil nomor ponsel yang disimpan sementara dari halaman login sebelumnya
            const savedPhoneNumber = localStorage.getItem('temp_phone_number');

            if (!savedPhoneNumber) {
                alert('Sesi habis atau nomor ponsel tidak ditemukan. Silakan masuk kembali.');
                window.location.href = 'login.html';
                return;
            }

            try {
                // Jalankan query dengan 2 kondisi filter: nomor_ponsel DAN kode_keamanan
                const { data, error } = await supabaseClient
                    .from('users')
                    .select('*')
                    .eq('nomor_ponsel', savedPhoneNumber)
                    .eq('kode_keamanan', pinValue)
                    .single();

                if (error && error.code !== 'PGRST116') {
                    console.error('Database Error:', error.message);
                    alert('Terjadi kendala pada server.');
                    return;
                }

                if (data) {
                    alert('Kode keamanan cocok! Selamat datang.');
                    // Redirect ke home page
                    window.location.href = 'home.html'; 
                } else {
                    alert('Kode keamanan salah. Silakan coba lagi.');
                    // Bersihkan semua kotak input PIN jika salah agar user bisa isi ulang
                    pinInputs.forEach(input => input.value = '');
                    pinInputs[0].focus(); // Kembalikan kursor ke kotak pertama
                }

            } catch (err) {
                console.error('Error validasi PIN:', err);
            }
        }
    }
}