// Supabase URL & Key
const SUPABASE_URL = "YOUR URL"; 
const SUPABASE_ANON_KEY = "YOUR KEY"; 

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variabel
let activeStoreId = null;
let allProducts = [];
let checkoutProducts = []; // Menyimpan data produk khusus yang masuk keranjang checkout
let cart = {}; // Menyimpan data kuantitas { kode_produk: qty }

// =========================================================================
// KARENA INI 1 FILE UNTUK BEBERAPA PAGE JADI BEGITU LOAD MASUK KESINI DULU
// =========================================================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Katalog/Detail/Checkout Router aktif...");

    // Ambil data keranjang paling baru dari localStorage setiap kali halaman dibuka
    cart = JSON.parse(localStorage.getItem('temp_cart_data')) || {};

    // Jika berada di halaman Katalog Produk
    if (document.getElementById('product-grid-container')) {
        await initCatalogPage();
    }

    // Jika berada di halaman Detail Produk
    if (document.getElementById('detail-product-name')) {
        await initProductDetailPage();
    }

    // Jika berada di halaman Checkout 
    if (document.getElementById('checkout-list-container')) {
        await initCheckoutPage();
    }
});

// =========================================================================
// CATALOG PAGE
// =========================================================================
async function initCatalogPage() {
    const selectedNamaMitra = localStorage.getItem('selected_nama_mitra');
    const searchInput = document.getElementById('product-search-input');

    if (!selectedNamaMitra) {
        console.error("Nama mitra tidak ditemukan!");
        return;
    }

    try {
        const { data: store, error: storeError } = await supabaseClient
            .from('wholesalers')
            .select('kode_mitra, nama_mitra, lokasi_mitra')
            .eq('nama_mitra', selectedNamaMitra)
            .single();

        if (storeError) throw storeError;

        if (store) {
            activeStoreId = store.kode_mitra;
            if (document.getElementById('catalog-store-name')) document.getElementById('catalog-store-name').textContent = store.nama_mitra;
            if (document.getElementById('catalog-store-address')) {
                let alamatText = store.lokasi_mitra || 'Lokasi tidak tersedia';
                if (alamatText.length > 35) alamatText = alamatText.substring(0, 35) + '...';
                document.getElementById('catalog-store-address').textContent = alamatText;
            }
        }

        if (activeStoreId) {
            const { data: products, error: prodError } = await supabaseClient
                .from('products')
                .select('*')
                .eq('kode_mitra', activeStoreId);

            if (prodError) throw prodError;

            if (products) {
                allProducts = products;
                renderProducts(allProducts);
                calculateTotalCart(); 
            }
        }

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const keyword = e.target.value.toLowerCase();
                const filteredProducts = allProducts.filter(p => 
                    p.nama_produk && p.nama_produk.toLowerCase().includes(keyword)
                );
                renderProducts(filteredProducts);
            });
        }

    } catch (error) {
        console.error("Gagal memuat katalog:", error.message);
    }
}

function renderProducts(products) {
    const gridContainer = document.getElementById('product-grid-container');
    if (!gridContainer) return;
    gridContainer.innerHTML = '';

    if (products.length === 0) {
        gridContainer.innerHTML = `<p class="center-align grey-text" style="padding: 20px; width: 100%;">Produk tidak ditemukan</p>`;
        return;
    }

    products.forEach(product => {
        if (!product || !product.nama_produk) return;
        const currentQty = cart[product.kode_produk] || 0;

        const productHTML = `
            <div class="col s6">
                <div class="card product-card">
                    <div class="card-image" onclick="window.location.href='detail.html?id=${product.kode_produk}';">
                        <img src="${product.gambar_produk || '../assets/images/marlboro.png'}">
                    </div>
                    <div class="card-content">
                        <p class="p-name">${product.nama_produk}</p>
                        <p class="p-price">Rp ${Number(product.harga_produk).toLocaleString('id-ID')}</p>
                        <div class="qty-control">
                            <span id="qty-${product.kode_produk}" class="qty-val">${currentQty}</span>
                        </div>
                        <div class="p-button">
                            <button class="qty-btn minus" data-id="${product.kode_produk}"><i class="material-icons btn-add-del">remove</i></button>
                            <button class="qty-btn plus" data-id="${product.kode_produk}"><i class="material-icons btn-add-del">add</i></button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        gridContainer.insertAdjacentHTML('beforeend', productHTML);
    });

    setupCatalogQtyButtons();
}

function setupCatalogQtyButtons() {
    const plusButtons = document.querySelectorAll('.qty-btn.plus');
    const minusButtons = document.querySelectorAll('.qty-btn.minus');

    plusButtons.forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const idProduk = btn.getAttribute('data-id');
            if (!cart[idProduk]) cart[idProduk] = 0;
            cart[idProduk]++;
            document.getElementById(`qty-${idProduk}`).textContent = cart[idProduk];
            updateCartStorage();
        };
    });

    minusButtons.forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const idProduk = btn.getAttribute('data-id');
            if (cart[idProduk] && cart[idProduk] > 0) {
                cart[idProduk]--;
                document.getElementById(`qty-${idProduk}`).textContent = cart[idProduk];
                if (cart[idProduk] === 0) delete cart[idProduk];
                updateCartStorage();
            }
        };
    });
}

function calculateTotalCart() {
    let totalHargaSemua = 0;
    for (const idProduk in cart) {
        const kuantitas = cart[idProduk];
        const productDetail = allProducts.find(p => String(p.kode_produk) === String(idProduk));
        if (productDetail) {
            totalHargaSemua += (kuantitas * (Number(productDetail.harga_produk) || 0));
        }
    }
    const totalCartPriceElement = document.getElementById('total-cart-price');
    if (totalCartPriceElement) totalCartPriceElement.textContent = `Rp ${totalHargaSemua.toLocaleString('id-ID')}`;
}

function updateCartStorage() {
    localStorage.setItem('temp_cart_data', JSON.stringify(cart));
    calculateTotalCart();
}

// =========================================================================
// DETAIL PRODUCT PAGE
// =========================================================================
async function initProductDetailPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const kodeProduk = urlParams.get('id');

    if (!kodeProduk) return;

    let currentQty = cart[kodeProduk] || 0;
    const qtyValueElement = document.getElementById('detail-qty-val');
    if (qtyValueElement) qtyValueElement.textContent = currentQty;

    try {
        const { data: product, error } = await supabaseClient
            .from('products').select('*').eq('kode_produk', kodeProduk).single();

        if (error) throw error;

        if (product) {
            if (document.getElementById('detail-product-name')) document.getElementById('detail-product-name').textContent = product.nama_produk;
            if (document.getElementById('detail-product-price')) document.getElementById('detail-product-price').textContent = `Rp ${Number(product.harga_produk).toLocaleString('id-ID')}`;
            if (document.getElementById('detail-product-unit')) document.getElementById('detail-product-unit').textContent = product.satuan_produk || 'Bungkus';
            if (document.getElementById('detail-product-desc')) document.getElementById('detail-product-desc').textContent = product.deskripsi_produk || 'Tidak ada deskripsi.';
            if (document.getElementById('detail-product-img') && product.gambar_produk) document.getElementById('detail-product-img').src = product.gambar_produk;

            const plusBtn = document.getElementById('detail-plus-btn');
            if (plusBtn) {
                plusBtn.onclick = () => {
                    currentQty++;
                    if (qtyValueElement) qtyValueElement.textContent = currentQty;
                };
            }

            const minusBtn = document.getElementById('detail-minus-btn');
            if (minusBtn) {
                minusBtn.onclick = () => {
                    if (currentQty > 0) {
                        currentQty--;
                        if (qtyValueElement) qtyValueElement.textContent = currentQty;
                    }
                };
            }

            const addToCartBtn = document.getElementById('detail-add-to-cart');
            if (addToCartBtn) {
                addToCartBtn.onclick = () => {
                    cart = JSON.parse(localStorage.getItem('temp_cart_data')) || {};
                    if (currentQty > 0) {
                        cart[kodeProduk] = currentQty;
                    } else {
                        delete cart[kodeProduk];
                    }
                    localStorage.setItem('temp_cart_data', JSON.stringify(cart));
                    window.location.href = 'catalog.html';
                };
            }
        }
    } catch (error) {
        console.error(error.message);
    }
}

// =========================================================================
// CHECKOUT PAGE
// =========================================================================
async function initCheckoutPage() {
    const listKodeProduk = Object.keys(cart);

    if (listKodeProduk.length === 0) {
        document.getElementById('checkout-list-container').innerHTML = `
            <p class="center-align grey-text" style="padding: 40px 20px;">Keranjang kosong. Silakan pilih produk terlebih dahulu.</p>
        `;
        document.getElementById('checkout-total-amount').textContent = "Rp 0";
        return;
    }

    try {
        const { data: products, error } = await supabaseClient
            .from('products')
            .select('*')
            .in('kode_produk', listKodeProduk);

        if (error) throw error;

        if (products) {
            checkoutProducts = products;
            renderCheckoutList();
        }

        const btnBayar = document.querySelector('.btn-bayar');
        if (btnBayar) {
            btnBayar.removeAttribute('onclick');
            btnBayar.onclick = async () => {
                await prosesPembayaran();
            };
        }

    } catch (error) {
        console.error("Gagal memuat list produk checkout:", error.message);
    }
}

function renderCheckoutList() {
    const checkoutContainer = document.getElementById('checkout-list-container');
    if (!checkoutContainer) return;
    checkoutContainer.innerHTML = '';

    checkoutProducts.forEach(product => {
        const currentQty = cart[product.kode_produk] || 0;
        if (currentQty === 0) return;

        const rowHTML = `
            <div class="checkout-card" id="card-checkout-${product.kode_produk}">
                <div class="item-row">
                    <div class="item-img-box">
                        <img src="${product.gambar_produk || '../assets/images/marlboro.png'}" alt="Produk">
                    </div>
                    <div class="item-info">
                        <p class="item-name">${product.nama_produk}</p>
                        <p class="item-unit">${product.satuan_produk || 'Bungkus'}</p>
                        <p class="item-price">Rp ${Number(product.harga_produk).toLocaleString('id-ID')}</p>
                    </div>
                    <div class="qty-stacked">
                        <div id="checkout-qty-${product.kode_produk}" class="qty-display">${currentQty}</div>
                        <div class="qty-buttons">
                            <button class="btn-qty minus" data-id="${product.kode_produk}"><i class="material-icons">remove</i></button>
                            <button class="btn-qty plus" data-id="${product.kode_produk}"><i class="material-icons">add</i></button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        checkoutContainer.insertAdjacentHTML('beforeend', rowHTML);
    });

    setupCheckoutActions();
    calculateCheckoutTotal();
}

function setupCheckoutActions() {
    const plusButtons = document.querySelectorAll('.btn-qty.plus');
    const minusButtons = document.querySelectorAll('.btn-qty.minus');

    plusButtons.forEach(btn => {
        btn.onclick = () => {
            const idProduk = btn.getAttribute('data-id');
            cart[idProduk]++;
            localStorage.setItem('temp_cart_data', JSON.stringify(cart));
            document.getElementById(`checkout-qty-${idProduk}`).textContent = cart[idProduk];
            calculateCheckoutTotal();
        };
    });

    minusButtons.forEach(btn => {
        btn.onclick = () => {
            const idProduk = btn.getAttribute('data-id');
            if (cart[idProduk] && cart[idProduk] > 0) {
                cart[idProduk]--;
                if (cart[idProduk] === 0) {
                    delete cart[idProduk];
                    const cardElement = document.getElementById(`card-checkout-${idProduk}`);
                    if (cardElement) cardElement.remove();
                } else {
                    document.getElementById(`checkout-qty-${idProduk}`).textContent = cart[idProduk];
                }
                localStorage.setItem('temp_cart_data', JSON.stringify(cart));
                calculateCheckoutTotal();

                if (Object.keys(cart).length === 0) {
                    document.getElementById('checkout-list-container').innerHTML = `
                        <p class="center-align grey-text" style="padding: 40px 20px;">Keranjang kosong. Silakan pilih produk terlebih dahulu.</p>
                    `;
                }
            }
        };
    });
}

function calculateCheckoutTotal() {
    let totalBayar = 0;
    for (const idProduk in cart) {
        const kuantitas = cart[idProduk];
        const detail = checkoutProducts.find(p => String(p.kode_produk) === String(idProduk));
        if (detail) {
            totalBayar += (kuantitas * (Number(detail.harga_produk) || 0));
        }
    }
    const totalAmountElement = document.getElementById('checkout-total-amount');
    if (totalAmountElement) {
        totalAmountElement.textContent = `Rp ${totalBayar.toLocaleString('id-ID')}`;
    }
    return totalBayar;
}

// PROSES PEMBAYARAN (SETELAH TEKAN CHECKOUT, DATABASE DKK AKAN UPDATE STOK, ORDER, ORDER_ITEMS)
async function prosesPembayaran() {
    const nomorPonselUser = localStorage.getItem('temp_phone_number');
    const selectedNamaMitra = localStorage.getItem('selected_nama_mitra');
    const totalBelanja = calculateCheckoutTotal();

    if (!nomorPonselUser) {
        M.toast({html: 'Nomor ponsel tidak terdeteksi!', classes: 'red rounded'});
        return;
    }
    if (!selectedNamaMitra) {
        M.toast({html: 'Nama mitra belum dipilih!', classes: 'red rounded'});
        return;
    }
    if (Object.keys(cart).length === 0) {
        M.toast({html: 'Keranjang belanja kosong!', classes: 'orange rounded'});
        return;
    }

    try {
        const btnBayar = document.querySelector('.btn-bayar');
        if (btnBayar) {
            btnBayar.disabled = true;
            btnBayar.textContent = "Memproses...";
        }

        // Ambil kode_toko dari tabel 'users' berdasarkan nomor_ponsel
        console.log("Tracking kode_toko untuk ponsel:", nomorPonselUser);
        const { data: userData, error: userQueryError } = await supabaseClient
            .from('users')
            .select('kode_toko')
            .eq('nomor_ponsel', nomorPonselUser)
            .single();

        if (userQueryError || !userData) {
            throw new Error("Gagal melacak data Toko User di database.");
        }
        const kodeTokoUser = userData.kode_toko;

        // Ambil kode_mitra dari tabel 'wholesalers' berdasarkan selected_nama_mitra 
        console.log("Tracking kode_mitra untuk nama mitra:", selectedNamaMitra);
        const { data: storeData, error: storeQueryError } = await supabaseClient
            .from('wholesalers')
            .select('kode_mitra')
            .eq('nama_mitra', selectedNamaMitra)
            .single();

        if (storeQueryError || !storeData) {
            throw new Error("Gagal melacak data Kode Mitra Grosir di database.");
        }
        const kodeMitraGrosir = storeData.kode_mitra;

        // Kurangi stok_produk di tabel 'products'
        console.log("Mengurangi kuantitas stok di tabel products...");
        for (const idProduk in cart) {
            const qtyBeli = cart[idProduk];
            const infoProdukBeli = checkoutProducts.find(p => String(p.kode_produk) === String(idProduk));

            if (!infoProdukBeli) continue;

            const stokSekarang = Number(infoProdukBeli.stok_produk) || 0;
            const stokBaru = stokSekarang - qtyBeli;

            if (stokBaru < 0) {
                throw new Error(`Stok "${infoProdukBeli.nama_produk}" tidak cukup! Sisa stok: ${stokSekarang}`);
            }

            const { error: updateStokError } = await supabaseClient
                .from('products')
                .update({ stok_produk: stokBaru })
                .eq('kode_produk', idProduk);

            if (updateStokError) throw updateStokError;
        }

        // Insert data baru ke tabel 'orders' ---
        console.log("Memasukkan data utama ke tabel orders...");
        const dataOrderBaru = {
            created_at: new Date().toISOString(),
            status_belanja: 'Dalam Proses',
            total_belanja: totalBelanja,
            kode_toko: kodeTokoUser,
            kode_mitra: kodeMitraGrosir
        };

        const { data: orderTerbuat, error: orderError } = await supabaseClient
            .from('orders')
            .insert([dataOrderBaru])
            .select()
            .single();

        if (orderError || !orderTerbuat) {
            throw new Error(`Gagal membuat data order: ${orderError?.message}`);
        }

        // Ambil primary key yang didapatkan dari row order atas
        const kodeOrderTerbentuk = orderTerbuat.kode_order;
        console.log("Sukses masuk tabel orders. Kode Order didapat:", kodeOrderTerbentuk);

        // Insert data baru ke tabel 'order_items'
        console.log("Menyiapkan pemetaan array baris data untuk order_items...");
        const listItemsBaru = [];

        for (const idProduk in cart) {
            const qtyBeli = cart[idProduk];
            const infoProdukBeli = checkoutProducts.find(p => String(p.kode_produk) === String(idProduk));

            if (!infoProdukBeli) continue;

            listItemsBaru.push({
                kuantitas_produk: qtyBeli,
                harga_produk: Number(infoProdukBeli.harga_produk) || 0,
                kode_produk: idProduk,
                kode_order: kodeOrderTerbentuk,
                created_at: new Date().toISOString()
            });
        }

        const { error: itemsError } = await supabaseClient
            .from('order_items')
            .insert(listItemsBaru);

        if (itemsError) throw itemsError;

        console.log("Seluruh transaksi sukses tercatat di database!");

        // Clear Storage yang tidak diperlukan & Pindah Halaman ke HOME PAGE lagi
        localStorage.removeItem('temp_cart_data'); 
        M.toast({html: 'Pembayaran Sukses!', classes: 'green rounded'});

        setTimeout(() => {
            window.location.href = 'home.html';
        }, 800);

    } catch (error) {
        console.error("Proses checkout gagal:", error.message);
        M.toast({html: `Gagal: ${error.message}`, classes: 'red rounded'});
        
        const btnBayar = document.querySelector('.btn-bayar');
        if (btnBayar) {
            btnBayar.disabled = false;
            btnBayar.textContent = "Bayar";
        }
    }
}