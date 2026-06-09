// Supabase URL & Key
const SUPABASE_URL = "YOUR URL"; 
const SUPABASE_ANON_KEY = "YOUR KEY"; 

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State Management Halaman Notifikasi
let currentStatusFilter = 'Selesai'; // Default filter awal
let userKodeToko = null;

// =========================================================================
// LOAD CONTENT
// =========================================================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Halaman Notifikasi Belanja aktif...");
    
    // Setup fungsi UI Dropdown
    initDropdownUI();

    // Ambil nomor ponsel user untuk tracking tokonya
    const nomorPonselUser = localStorage.getItem('temp_phone_number');
    if (!nomorPonselUser) {
        console.error("Nomor ponsel tidak ditemukan di localStorage!");
        document.getElementById('notification-list-container').innerHTML = `
            <p class="center-align grey-text" style="padding: 20px;">Silakan login terlebih dahulu.</p>
        `;
        return;
    }

    try {
        // Ambil kode_toko milik user saat ini dari tabel users
        const { data: userData, error: userError } = await supabaseClient
            .from('users')
            .select('kode_toko')
            .eq('nomor_ponsel', nomorPonselUser)
            .single();

        if (userError || !userData) throw new Error("Gagal mengambil data toko user.");
        
        userKodeToko = userData.kode_toko;

        // Load data notifikasi pesanan pertama kali
        await fetchAndRenderOrders();

    } catch (error) {
        console.error("Initialization Error:", error.message);
    }
});

// =========================================================================
// DROPDOWN LOGIC
// =========================================================================
function initDropdownUI() {
    const btn = document.getElementById('dropdownBtn');
    const menu = document.getElementById('dropdownMenu');
    const header = menu.querySelector('.dropdown-header');
    const listItems = document.querySelectorAll('#dropdown-status-list li');
    const filterText = document.getElementById('current-filter-text');

    // Klik tombol filter untuk buka/tutup
    btn.addEventListener('click', function() {
        menu.classList.toggle('show');
    });

    // Klik bagian Header untuk menutup menu
    header.addEventListener('click', function() {
        menu.classList.remove('show');
    });

    // Menangani aksi klik pada item pilihan status
    listItems.forEach(item => {
        item.onclick = async function(e) {
            e.stopPropagation();

            // Hapus kelas active dari status lama, pindahkan ke yang baru klik
            listItems.forEach(li => li.classList.remove('active'));
            item.classList.add('active');

            // Ambil langsung text dari elemen HTML
            const selectedStatus = item.textContent.trim();
            currentStatusFilter = selectedStatus;
            
            // Ubah teks di tombol filter utama
            if (filterText) filterText.textContent = selectedStatus;

            // Tutup menu dropdown
            menu.classList.remove('show');

            // Ambil data ulang dari database berdasarkan filter status yang baru diganti
            await fetchAndRenderOrders();
        };
    });

    // Tetap tutup menu jika klik di luar area dropdown
    window.onclick = function(event) {
        if (!event.target.closest('.dropdown-container')) {
            menu.classList.remove('show');
        }
    }
}

// =========================================================================
// CREATE CARDS
// =========================================================================
async function fetchAndRenderOrders() {
    const container = document.getElementById('notification-list-container');
    if (!container || !userKodeToko) return;

    // Tampilkan placeholder loading selagi menunggu database
    container.innerHTML = `
        <div class="center-align" style="padding: 30px;">
            <div class="preloader-wrapper small active">
                <div class="spinner-layer spinner-blue-only">
                    <div class="circle-clipper left"><div class="circle"></div></div>
                    <div class="gap-patch"><div class="circle"></div></div>
                    <div class="circle-clipper right"><div class="circle"></div></div>
                </div>
            </div>
        </div>
    `;

    try {
        console.log(`Mengambil data orders dengan status: ${currentStatusFilter} untuk kode_toko: ${userKodeToko}`);

        // Ambil data orders berserta relasi nama_mitra dari tabel wholesalers
        const { data: orders, error } = await supabaseClient
            .from('orders')
            .select(`
                kode_order,
                created_at,
                status_belanja,
                total_belanja,
                wholesalers (
                    nama_mitra
                )
            `)
            .eq('kode_toko', userKodeToko)
            .eq('status_belanja', currentStatusFilter)
            .order('created_at', { ascending: false }); // Urutkan dari transaksi terbaru

        if (error) throw error;

        // Kosongkan container sebelum menggambar ulang list baru
        container.innerHTML = '';

        if (!orders || orders.length === 0) {
            container.innerHTML = `
                <p class="center-align grey-text" style="padding: 0 20px 40px 20px; font-size: 22px !important; font-weight: 500;">
                    Tidak ada riwayat pesanan dengan status "${currentStatusFilter}".
                </p>
            `;
            return;
        }

        // Looping dan pasang card satu per satu
        orders.forEach(order => {
            const namaGrosir = order.wholesalers ? order.wholesalers.nama_mitra : "Mitra Grosir AYO";
            const gambarGrosir = "../assets/images/foto_toko_2.png";
            
            // Format data berdasarkan kolom 'created_at' dan 'total_belanja'
            const dateObj = new Date(order.created_at);
            const opsiFormat = { day: 'numeric', month: 'short' };
            const tanggalFormatted = dateObj.toLocaleDateString('id-ID', opsiFormat); 
            
            const jamFormatted = String(dateObj.getHours()).padStart(2, '0');
            const menitFormatted = String(dateObj.getMinutes()).padStart(2, '0');
            const waktuFinal = `${tanggalFormatted}, ${jamFormatted}.${menitFormatted}`; 

            const cardHTML = `
                <div class="notification-card z-depth-1" onclick="window.location.href='detail_pesanan.html?kode_order=${order.kode_order}';">
                    <img src="${gambarGrosir}" class="store-image" alt="Foto Grosir">
                    <div class="notification-info">
                        <div class="store-name">${namaGrosir}</div>
                        <div class="price">Rp ${Number(order.total_belanja).toLocaleString('id-ID')}</div>
                        <div class="date">${waktuFinal}</div>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', cardHTML);
        });

    } catch (error) {
        console.error("Gagal memuat daftar notifikasi:", error.message);
        container.innerHTML = `<p class="center-align red-text" style="padding: 20px;">Terjadi galat: ${error.message}</p>`;
    }
}