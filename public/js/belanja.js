// Supabase URL & Key
const SUPABASE_URL = "YOUR URL"; 
const SUPABASE_ANON_KEY = "YOUR KEY"; 

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Ambil nomor telepon dari Local Storage
const tempPhoneNumber = localStorage.getItem('temp_phone_number');

// =========================================================================
// HOME PAGE
// =========================================================================

async function loadDashboardData() {
    // Validasi apakah data nomor telepon di local storage ada
    if (!tempPhoneNumber) {
        console.error("Nomor telepon tidak ditemukan di localStorage!");
        return;
    }

    try {
        // Tarik data dari tabel 'users' dan join otomatis ke tabel 'wholesalers' 
        // melalui foreign key kode_mitra_langganan
        const { data: user, error } = await supabaseClient
            .from('users')
            .select(`
                nama_pemilik_toko,
                jumlah_koin,
                jumlah_poin_mitra,
                wholesalers (
                    nama_mitra
                )
            `)
            .eq('nomor_ponsel', tempPhoneNumber) // Cari row based on nomor telepon
            .single(); // Mengambil 1 objek row data secara langsung

        if (error) throw error;

        // Jika data user ditemukan, eksekusi perubahan komponen di Frontend HTML
        if (user) {
            
            // Ganti info nama greeting (Hallo, [Nama Pemilik Toko])
            const greetingElement = document.getElementById('user-greeting');
            if (greetingElement) {
                greetingElement.textContent = `Hallo, ${user.nama_pemilik_toko} !`;
            }

            // KONDISI 2: Ganti nominal Rupiah, Koin, dan Poin Mitra
            const rupiahElement = document.getElementById('display-rupiah');
            const koinElement = document.getElementById('display-koin');
            const poinElement = document.getElementById('display-poin');

            if (rupiahElement) {
                // Mengubah angka koin menjadi format rupiah (Contoh: Rp 50.000)
                rupiahElement.textContent = `Rp ${Number(user.jumlah_koin).toLocaleString('id-ID')}`;
            }
            if (koinElement) {
                koinElement.textContent = `${user.jumlah_koin} Koin`;
            }
            if (poinElement) {
                poinElement.textContent = `${user.jumlah_poin_mitra} Poin`;
            }

            // Ganti nama Mitra Langganan dari relasi tabel wholesalers
            const mitraElement = document.getElementById('display-mitra');
            if (mitraElement) {
                // Mengambil nama_mitra dari objek wholesalers hasil join. Jika kosong, beri fallback text.
                const namaMitra = user.wholesalers?.nama_mitra || 'Belum ada mitra';
                mitraElement.textContent = namaMitra;
            }
        }

    } catch (error) {
        console.error("Gagal memuat data dashboard:", error.message);
    }
}

// =========================================================================
// PILIH TOKO PAGE (BELANJA)
// =========================================================================

// Variabel global untuk menyimpan data wholesalers agar bisa difilter saat search
let allWholesalers = []; 
let userMitraLanggananId = null;

async function initPilihTokoPage() {
    const storeContainer = document.getElementById('store-list-container');
    const searchInput = document.getElementById('search-input');
    
    // Cegah error jika script ini terpanggil di halaman yang tidak punya container store
    if (!storeContainer) return; 

    const tempPhoneNumber = localStorage.getItem('temp_phone_number');
    if (!tempPhoneNumber) {
        console.error("Nomor telepon tidak ditemukan di localStorage!");
        return;
    }

    try {
        // Ambil data user saat ini untuk tahu siapa mitra langganannya
        const { data: user, error: userError } = await supabaseClient
            .from('users')
            .select('kode_mitra_langganan')
            .eq('nomor_ponsel', tempPhoneNumber)
            .single();

        if (userError) throw userError;
        if (user) {
            userMitraLanggananId = user.kode_mitra_langganan;
        }

        // Tarik seluruh baris data toko dari tabel wholesalers
        const { data: wholesalers, error: wsError } = await supabaseClient
            .from('wholesalers')
            .select('*');

        if (wsError) throw wsError;

        if (wholesalers) {
            allWholesalers = wholesalers; // Simpan ke variabel global
            renderStoreCards(allWholesalers); // Tampilkan ke HTML
        }

        // Search toko berdasarkan input nama toko (Live Search)
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const keyword = e.target.value.toLowerCase();
                
                // Filter array berdasarkan nama_mitra
                const filteredStores = allWholesalers.filter(store => 
                    store.nama_mitra.toLowerCase().includes(keyword)
                );
                
                // Cetak ulang kartu yang cocok saja
                renderStoreCards(filteredStores);
            });
        }

    } catch (error) {
        console.error("Gagal memuat halaman pilih toko:", error.message);
    }
}

// Generator Element Card HTML Dinamis
function renderStoreCards(stores) {
    const storeContainer = document.getElementById('store-list-container');
    if (!storeContainer) return;

    // Bersihkan isi container (menghapus data lama)
    storeContainer.innerHTML = '';

    if (stores.length === 0) {
        storeContainer.innerHTML = `<p class="center-align grey-text" style="padding: 20px;">Toko tidak ditemukan</p>`;
        return;
    }

    // Looping data untuk dipetakan jadi komponen Card
    stores.forEach(store => {
        // Cek apakah id toko saat ini sama dengan kode_mitra_langganan milik user
        const isMitra = store.kode_mitra === userMitraLanggananId;
        // Racik badge "Mitra" jika kondisinya true
        const badgeHTML = isMitra ? `<div class="mitra-badge">Mitra</div>` : '';

        // Template string HTML
        const cardHTML = `
            <div class="store-card" style="position: relative;">
                <a href="selectbelanja.html" class="store-link" data-nama="${store.nama_mitra}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1;"></a>
                <div class="store-image-wrapper">
                    ${badgeHTML}
                    <img src="../assets/images/foto_toko.png" class="store-image">
                </div>
                <div class="store-info">
                    <div class="store-name">${store.nama_mitra}</div>
                    <div class="store-address">${store.lokasi_mitra || 'Lokasi tidak tersedia'}</div>
                </div>
            </div>
        `;

        // Seluruh elemen card dimasukkan ke dalam container
        storeContainer.insertAdjacentHTML('beforeend', cardHTML);
    });

    // Simpan nama_mitra ke localStorage saat kartu ditekan
    const storeLinks = storeContainer.querySelectorAll('.store-link');
    storeLinks.forEach(link => {
        link.addEventListener('click', function() {
            const namaMitraTerpilih = this.getAttribute('data-nama');
            if (namaMitraTerpilih) {
                localStorage.setItem('selected_nama_mitra', namaMitraTerpilih);
                console.log(`Berhasil menyimpan toko terpilih ke LocalStorage: ${namaMitraTerpilih}`);
            }
        });
    });
}

// =========================================================================
// CHAT TOKO PAGE
// =========================================================================
async function initChatStorePage() {
    const chatStoreName = document.getElementById('chat-store-name');
    const chatStoreAddress = document.getElementById('chat-store-address');

    // Ambil kata kunci nama_mitra dari LocalStorage
    const selectedNamaMitra = localStorage.getItem('selected_nama_mitra');

    if (!selectedNamaMitra) {
        console.error("Nama mitra tidak ditemukan di localStorage!");
        if (chatStoreName) chatStoreName.textContent = "Toko Tidak Diketahui";
        return;
    }

    try {
        console.log(`Mengambil data lengkap untuk toko: ${selectedNamaMitra}`);

        // Query ke database untuk mendapatkan detail alamat/lokasi dari toko tersebut
        const { data: storeData, error } = await supabaseClient
            .from('wholesalers')
            .select('nama_mitra, lokasi_mitra')
            .eq('nama_mitra', selectedNamaMitra)
            .single();

        if (error) throw error;

        // Masukkan data ke komponen Header HTML secara dinamis
        if (storeData) {
            if (chatStoreName) {
                chatStoreName.textContent = storeData.nama_mitra;
            }
            if (chatStoreAddress) {
                let alamatText = storeData.lokasi_mitra || 'Lokasi tidak tersedia';
                
                // Tambahkan efek potong (...) jika alamat terlalu panjang (Max 35 karakter)
                const maxAlamatLength = 35;
                if (alamatText.length > maxAlamatLength) {
                    alamatText = alamatText.substring(0, maxAlamatLength) + '...';
                }
                chatStoreAddress.textContent = alamatText;
            }
        }
    } catch (error) {
        console.error("Gagal memuat informasi header chat toko:", error.message);
        // Fallback jika database bermasalah atau offline, tampilkan teks dari localStorage 
        if (chatStoreName) chatStoreName.textContent = selectedNamaMitra;
        if (chatStoreAddress) chatStoreAddress.textContent = "Gagal memuat alamat";
    }
}

// =========================================================================
// KUNCI UTAMA : KARENA INI 1 FILE UNTUK BEBERAPA PAGE JADI BEGITU LOAD MASUK KESINI DULU
// =========================================================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM Terdeteksi. Memulai inisialisasi aplikasi...");

    // Cek jika user sedang berada di halaman Beranda (Home)
    if (document.getElementById('user-greeting') || document.getElementById('display-mitra')) {
        await loadDashboardData();
    }

    // Cek jika user sedang berada di halaman Pilih Toko (Belanja)
    if (document.getElementById('store-list-container')) {
        await initPilihTokoPage();
    }

    // Cek jika user sedang berada di halaman Chat Toko (Pesan Baru)
    if (document.getElementById('chat-store-name')) {
        await initChatStorePage();
    }
});