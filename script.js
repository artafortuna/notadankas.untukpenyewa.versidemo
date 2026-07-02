// ==============================================================
// 0. FITUR DEVICE LOCK & MACHINE BINDING
// ==============================================================
const AUTHORIZED_DEVICE_ID = 'KUNCI-SEMENTARA'; 

function getOrCreateDeviceID() {
    let deviceId = localStorage.getItem('arta_fortuna_device_id');
    if (!deviceId) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        deviceId = 'AF-';
        for (let i = 0; i < 8; i++) deviceId += chars.charAt(Math.floor(Math.random() * chars.length));
        localStorage.setItem('arta_fortuna_device_id', deviceId);
    }
    return deviceId;
}

const currentDeviceID = getOrCreateDeviceID();

document.addEventListener('DOMContentLoaded', () => {
    const displayEl = document.getElementById('devIdDisplay');
    if(displayEl) displayEl.innerText = currentDeviceID;
});

if (AUTHORIZED_DEVICE_ID !== 'KUNCI-SEMENTARA' && currentDeviceID !== AUTHORIZED_DEVICE_ID) {
    document.documentElement.innerHTML = `
        <div style="display:flex; flex-direction:column; justify-content:center; align-items:center; height:100vh; background:#1a1a2e; color:#f3f4f6; font-family:'Quicksand', sans-serif; text-align:center; padding:20px;">
            <div style="background:#273340; padding:40px 30px; border-radius:24px; box-shadow:0 10px 30px rgba(0,0,0,0.5); border-top: 5px solid #ff7675;">
                <h1 style="font-size:3em; margin:0 0 15px 0;">🔒</h1>
                <h2 style="color:#ff7675; margin-bottom:10px;">Akses Ditolak</h2>
                <p style="font-size:1.1em; color:#9ca3af; margin-bottom:20px;">Aplikasi ini dilisensikan dan dikunci.</p>
                <div style="background:#1f2937; padding:15px; border-radius:12px; border: 1px dashed #4b5563;">
                    <span style="display:block; font-size:0.9em; color:#9ca3af; margin-bottom:5px;">Device ID Anda:</span>
                    <strong style="font-size:1.3em; letter-spacing: 2px;">${currentDeviceID}</strong>
                </div>
            </div>
        </div>
    `;
    throw new Error("Device Locked.");
}

// ==============================================================
// 1. SISTEM NAVIGASI (SPA)
// ==============================================================
function switchTab(targetId, navElement) {
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById(targetId).classList.add('active');
    navElement.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==============================================================
// 2. SISTEM DATABASE & TEMA
// ==============================================================
let db;
let globalEditId = null;   
let globalWaktuAsli = {};  
let aksiConfirm = null; 

function inisialisasiTema() {
    if (localStorage.getItem('temaAplikasi') === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('btnTema').innerText = '☀️';
    }
}
inisialisasiTema();

function toggleTema() {
    document.body.classList.toggle('dark-mode');
    const btnTema = document.getElementById('btnTema');
    if (document.body.classList.contains('dark-mode')) {
        btnTema.innerText = '☀️';
        localStorage.setItem('temaAplikasi', 'dark');
    } else {
        btnTema.innerText = '🌙';
        localStorage.setItem('temaAplikasi', 'light');
    }
}

// Upgrade Database ke Versi 7 (Tambah Tabel Pemasukan Manual)
const request = indexedDB.open("KasirLucuDB", 7);

request.onupgradeneeded = function(event) {
    db = event.target.result;
    if (!db.objectStoreNames.contains('transaksi')) db.createObjectStore('transaksi', { keyPath: 'id' });
    if (!db.objectStoreNames.contains('pengeluaran')) db.createObjectStore('pengeluaran', { keyPath: 'id' });
    if (!db.objectStoreNames.contains('pemasukan')) db.createObjectStore('pemasukan', { keyPath: 'id' }); // TABEL BARU
};

request.onsuccess = function(event) {
    db = event.target.result;
    tampilkanTabel(true); 
};

request.onsuccess = function(event) {
    db = event.target.result;
    tampilkanTabel(true); 
};

document.getElementById('namaToko').value = localStorage.getItem('namaTokoPenyewa') || '';
document.getElementById('jadwalToko').value = localStorage.getItem('jadwalTokoPenyewa') || '';

function simpanPengaturan() {
    localStorage.setItem('namaTokoPenyewa', document.getElementById('namaToko').value);
    localStorage.setItem('jadwalTokoPenyewa', document.getElementById('jadwalToko').value);
}

function formatUang(angka) { return 'Rp ' + angka.toLocaleString('id-ID'); }
function dapatkanWaktuSekarang() {
    const now = new Date();
    return {
        lengkap: `${now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} - ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`,
        tglHarian: now.toLocaleDateString('id-ID'),
        blnTahunan: `${now.getMonth()}-${now.getFullYear()}`
    };
}

// ==============================================================
// 3. LOGIKA HALAMAN 1 (KASIR & RIWAYAT)
// ==============================================================
function tampilkanAlert(pesan) {
    document.getElementById('modalTeks').innerText = pesan;
    document.getElementById('modalBtnBatal').style.display = 'none';
    document.getElementById('customModal').classList.add('show');
    aksiConfirm = null;
}
function tampilkanConfirm(pesan, fungsiAksi) {
    document.getElementById('modalTeks').innerText = pesan;
    document.getElementById('modalBtnBatal').style.display = 'block';
    document.getElementById('customModal').classList.add('show');
    aksiConfirm = fungsiAksi;
}
document.getElementById('modalBtnOK').onclick = function() {
    document.getElementById('customModal').classList.remove('show');
    if (aksiConfirm) { aksiConfirm(); aksiConfirm = null; }
};
document.getElementById('modalBtnBatal').onclick = function() {
    document.getElementById('customModal').classList.remove('show');
    aksiConfirm = null;
};

function simpanData() {
    const namaToko = document.getElementById('namaToko').value;
    const jadwalToko = document.getElementById('jadwalToko').value || 'Setiap Hari';
    const nama = document.getElementById('nama').value;
    const produk = document.getElementById('produk').value;
    const metodeBayar = document.getElementById('metodeBayar').value || 'QRIS';
    const jual = parseInt(document.getElementById('jual').value) || 0;
    const modal = parseInt(document.getElementById('modal').value) || 0;

    if(!namaToko) return tampilkanAlert("Tulis Nama Toko Kamu dulu ya! 🏪");
    if(!nama || !produk || jual === 0) return tampilkanAlert("Mohon isi Nama, Produk, dan Harga Jual 😊");

    const laba = jual - modal;
    let dataTransaksi = globalEditId ? {
        id: globalEditId, waktuTampil: globalWaktuAsli.tampil, waktuHarian: globalWaktuAsli.harian,
        waktuBulanan: globalWaktuAsli.bulanan, nama: nama, produk: produk, metodeBayar: metodeBayar, jual: jual, modal: modal, laba: laba
    } : {
        id: Date.now(), waktuTampil: dapatkanWaktuSekarang().lengkap, waktuHarian: dapatkanWaktuSekarang().tglHarian,
        waktuBulanan: dapatkanWaktuSekarang().blnTahunan, nama: nama, produk: produk, metodeBayar: metodeBayar, jual: jual, modal: modal, laba: laba
    };

    const transaction = db.transaction(["transaksi"], "readwrite");
    transaction.objectStore("transaksi").put(dataTransaksi); 
    transaction.oncomplete = function() {
        batalkanEdit(); 
        tampilkanTabel(globalEditId === null); 
        if (!globalEditId) bukaWhatsApp(dataTransaksi, namaToko, jadwalToko);
    };
}

function pemicuEdit(id, nama, produk, metodeBayar, jual, modal, wTampil, wHarian, wBulanan) {
    globalEditId = id; globalWaktuAsli = { tampil: wTampil, harian: wHarian, bulanan: wBulanan };
    document.getElementById('nama').value = nama; document.getElementById('produk').value = produk;
    document.getElementById('metodeBayar').value = metodeBayar; document.getElementById('jual').value = jual;
    document.getElementById('modal').value = modal;
    const btn = document.getElementById('btnSimpan');
    btn.innerText = "Simpan Perubahan Data ✏️"; btn.classList.add('btn-edit-mode');
    document.getElementById('btnBatal').style.display = "block";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function batalkanEdit() {
    globalEditId = null; globalWaktuAsli = {};
    document.getElementById('nama').value = ''; document.getElementById('produk').value = '';
    document.getElementById('metodeBayar').value = ''; document.getElementById('jual').value = ''; document.getElementById('modal').value = '';
    const btn = document.getElementById('btnSimpan');
    btn.innerText = "Simpan & Buat Nota WA 🚀"; btn.classList.remove('btn-edit-mode');
    document.getElementById('btnBatal').style.display = "none";
}

function hapusData(id) {
    tampilkanConfirm("Yakin mau hapus catatan penjualan ini? 🗑️", function() {
        const transaction = db.transaction(["transaksi"], "readwrite");
        transaction.objectStore("transaksi").delete(id);
        transaction.oncomplete = function() { tampilkanTabel(true); };
    });
}

function bukaWhatsApp(data, namaToko, jadwalToko) {
    const teksNota = `*${namaToko.toUpperCase()}*\nTerima kasih Kak ${data.nama}!\n\n*Rincian Pesanan:*\n▪️ Waktu: ${data.waktuTampil}\n▪️ Produk: ${data.produk}\n▪️ Total: ${formatUang(data.jual)}\n\n_Status: LUNAS & BERHASIL_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(teksNota)}`, '_blank');
}

function tampilkanTabel(perbaruiDropdown = false) {
    const wadah = document.getElementById('daftarTransaksi'); wadah.innerHTML = ''; 
    let labaHariIni = 0; let labaBulanTerpilih = 0;
    const wk = dapatkanWaktuSekarang();
    const cari = document.getElementById('cariPelanggan').value.toLowerCase();

    const request = db.transaction(["transaksi"], "readonly").objectStore("transaksi").getAll();
    request.onsuccess = function() {
        const tr = request.result;
        const sel = document.getElementById('pilihBulan');
        
        if (perbaruiDropdown) {
            const lastSel = sel.value || wk.blnTahunan;
            let unik = [wk.blnTahunan];
            tr.forEach(t => { if (!unik.includes(t.waktuBulanan)) unik.push(t.waktuBulanan); });
            sel.innerHTML = '';
            unik.forEach(b => {
                const opt = document.createElement('option'); opt.value = b;
                const pt = b.split('-'); const nmBln = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
                opt.innerText = `${nmBln[parseInt(pt[0])]} ${pt[1]}`;
                if (b === lastSel) opt.selected = true;
                sel.appendChild(opt);
            });
        }

        const fBulan = sel.value || wk.blnTahunan;
        tr.forEach(t => {
            if(t.waktuHarian === wk.tglHarian) labaHariIni += t.laba;
            if(t.waktuBulanan === fBulan) labaBulanTerpilih += t.laba;
        });

        const saring = tr.filter(t => t.nama.toLowerCase().includes(cari));
        if(saring.length === 0) {
            wadah.innerHTML = '<p style="text-align:center; color:var(--text-muted);">Belum ada penjualan. Semangat! 💪</p>';
        } else {
            saring.reverse().forEach(t => {
                wadah.innerHTML += `
                    <div class="kartu-riwayat">
                        <strong>${t.nama}</strong><span class="waktu-teks">🕒 ${t.waktuTampil}</span>
                        <span class="info-teks">📦 ${t.produk} (Byr: ${t.metodeBayar})</span>
                        <span class="info-teks">💰 Jual: ${formatUang(t.jual)} | Modal: ${formatUang(t.modal)}</span>
                        <span class="untung-teks">📈 Untung: ${formatUang(t.laba)}</span>
                        <div class="grup-tombol">
                            <button class="btn-wa" onclick='bukaWhatsApp(${JSON.stringify(t)}, document.getElementById("namaToko").value, "")'>Nota WA 💬</button>
                            <button class="btn-edit-kartu" onclick='pemicuEdit(${t.id}, "${t.nama}", "${t.produk}", "${t.metodeBayar}", ${t.jual}, ${t.modal}, "${t.waktuTampil}", "${t.waktuHarian}", "${t.waktuBulanan}")'>Edit ✏️</button>
                            <button class="btn-hapus" onclick="hapusData(${t.id})">Hapus 🗑️</button>
                        </div>
                    </div>`;
            });
        }
        document.getElementById('labaHariIni').innerText = formatUang(labaHariIni);
        document.getElementById('labaBulanIni').innerText = formatUang(labaBulanTerpilih);
    };
}


// ==============================================================
// 4. LOGIKA HALAMAN 2 (PEMBUKUAN KAS - DEBIT & KREDIT)
// ==============================================================
let currentKreditId = null;
let currentDebitId = null;

function loadPembukuan() {
    const tbody = document.getElementById('ledgerBody');
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Memuat data...</td></tr>';
    
    let transaksi = [], pengeluaran = [], pemasukan = [];
    const tReq = db.transaction("transaksi").objectStore("transaksi").getAll();

    tReq.onsuccess = () => {
        transaksi = tReq.result;
        const pReq = db.transaction("pengeluaran").objectStore("pengeluaran").getAll();
        pReq.onsuccess = () => {
            pengeluaran = pReq.result;
            const mReq = db.transaction("pemasukan").objectStore("pemasukan").getAll();
            mReq.onsuccess = () => {
                pemasukan = mReq.result;
                gabungDanRenderBuku(transaksi, pengeluaran, pemasukan);
            };
        };
    };
}

function gabungDanRenderBuku(transaksi, pengeluaran, pemasukan) {
    let buku = [];
    let saldoKas = 0;
    let saldoDeposit = 0;
    
    // 1. Uang Masuk dari Kasir
    transaksi.forEach(t => {
        buku.push({ id: t.id, waktu: t.waktuTampil, rawKet: `Jual: ${t.produk}`, ket: `Jual: ${t.produk}`, debit: t.jual, kredit: 0, type: 'masuk_kasir' });
        saldoKas += t.jual;
        saldoDeposit -= t.modal; // Logika Cerdas: Harga modal otomatis memotong saldo di supplier
    });
    
    // 2. Uang Keluar (Kredit) - Dipisah berdasarkan Jenis
    pengeluaran.forEach(p => {
        const jenis = p.jenis || 'umum';
        const labelKet = jenis === 'deposit' ? `🔄 Top-Up: ${p.keterangan}` : `🛒 Keluar: ${p.keterangan}`;
        
        buku.push({ id: p.id, waktu: p.waktuTampil, rawKet: p.keterangan, ket: labelKet, debit: 0, kredit: p.jumlah, type: 'keluar', jenis: jenis });
        
        saldoKas -= p.jumlah; // Apapun pengeluarannya, uang Kas pasti berkurang
        if(jenis === 'deposit') saldoDeposit += p.jumlah; // Jika untuk Top-Up, maka Saldo Supplier bertambah
    });

    // 3. Uang Masuk Manual
    pemasukan.forEach(m => {
        buku.push({ id: m.id, waktu: m.waktuTampil, rawKet: m.keterangan, ket: `💰 Masuk: ${m.keterangan}`, debit: m.jumlah, kredit: 0, type: 'masuk_manual' });
        saldoKas += m.jumlah;
    });

    buku.sort((a, b) => a.id - b.id);
    
    // Tampilkan di 2 Kotak Dompet
    document.getElementById('totalSaldoKas').innerText = formatUang(saldoKas);
    document.getElementById('totalSaldoDeposit').innerText = formatUang(saldoDeposit);

    const tbody = document.getElementById('ledgerBody');
    tbody.innerHTML = '';
    
    if(buku.length === 0) tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-muted);">Belum ada data pembukuan.</td></tr>`;

    // Baris Statis Tambah Baru
    tbody.innerHTML += `
        <tr style="background: rgba(16, 185, 129, 0.1);">
            <td style="font-weight:700; color:#10b981; font-size:0.9em;">➕ Tambah Pemasukan Baru</td>
            <td class="clickable-debit cell-debit" onclick="bukaModalDebit()">Ketuk Di Sini 👆</td>
            <td style="text-align:center; color:var(--text-muted);">-</td>
        </tr>
        <tr style="background: rgba(255, 118, 117, 0.1);">
            <td style="font-weight:700; color:#ff7675; font-size:0.9em;">➕ Tambah Pengeluaran Baru</td>
            <td style="text-align:center; color:var(--text-muted);">-</td>
            <td class="clickable-cell cell-kredit" onclick="bukaModalKredit()">Ketuk Di Sini 👆</td>
        </tr>
    `;

    buku.reverse().forEach(b => {
        if(b.type === 'masuk_kasir') {
            tbody.innerHTML += `<tr><td><span class="keterangan-tgl">${b.waktu}</span><strong>${b.ket}</strong></td><td class="cell-debit">+${b.debit.toLocaleString('id-ID')}</td><td style="text-align:center; color:var(--text-muted);">-</td></tr>`;
        } else if(b.type === 'masuk_manual') {
            tbody.innerHTML += `<tr><td><span class="keterangan-tgl">${b.waktu}</span><strong>${b.ket}</strong></td><td class="clickable-debit cell-debit" onclick="bukaModalDebit(${b.id}, '${b.rawKet}', ${b.debit})">+${b.debit.toLocaleString('id-ID')}</td><td style="text-align:center; color:var(--text-muted);">-</td></tr>`;
        } else {
            // Tombol edit pengeluaran kini membawa parameter 'jenis' juga
            tbody.innerHTML += `<tr><td><span class="keterangan-tgl">${b.waktu}</span><strong>${b.ket}</strong></td><td style="text-align:center; color:var(--text-muted);">-</td><td class="clickable-cell cell-kredit" onclick="bukaModalKredit(${b.id}, '${b.rawKet}', ${b.kredit}, '${b.jenis}')">-${b.kredit.toLocaleString('id-ID')}</td></tr>`;
        }
    });
}

function bukaModalKredit(id = null, ket = '', jumlah = '', jenis = 'umum') {
    currentKreditId = id;
    document.getElementById('kreditKet').value = ket;
    document.getElementById('kreditJumlah').value = jumlah;
    document.getElementById('kreditJenis').value = jenis; // Set dropdown sesuai data lama
    document.getElementById('judulModalKredit').innerText = id ? '✏️ Edit Pengeluaran' : '📝 Catat Pengeluaran';
    document.getElementById('btnHapusKredit').style.display = id ? 'block' : 'none';
    document.getElementById('modalInputKredit').classList.add('show');
}

function simpanKredit() {
    const ket = document.getElementById('kreditKet').value;
    const jumlah = parseInt(document.getElementById('kreditJumlah').value) || 0;
    const jenis = document.getElementById('kreditJenis').value; // Ambil nilai jenis

    if(!ket || jumlah === 0) { alert("Keterangan dan Jumlah harus diisi!"); return; }

    const data = {
        id: currentKreditId ? currentKreditId : Date.now(),
        waktuTampil: currentKreditId ? dapatkanWaktuSekarang().lengkap : dapatkanWaktuSekarang().lengkap,
        keterangan: ket, jumlah: jumlah, jenis: jenis // Simpan jenis pengeluaran ke database
    };
    const transaction = db.transaction(["pengeluaran"], "readwrite");
    transaction.objectStore("pengeluaran").put(data);
    transaction.oncomplete = function() { tutupModalKredit(); loadPembukuan(); };
}

function tutupModalKredit() { 
    document.getElementById('modalInputKredit').classList.remove('show'); 
}

function hapusKredit() {
    if(!currentKreditId) return;
    const transaction = db.transaction(["pengeluaran"], "readwrite");
    transaction.objectStore("pengeluaran").delete(currentKreditId);
    transaction.oncomplete = function() { 
        tutupModalKredit(); 
        loadPembukuan(); 
    };
}

function hapusKredit() {
    if(!currentKreditId) return;
    const transaction = db.transaction(["pengeluaran"], "readwrite");
    transaction.objectStore("pengeluaran").delete(currentKreditId);
    transaction.oncomplete = function() { tutupModalKredit(); loadPembukuan(); };
}

// ---- FUNGSI DEBIT MANUAL (PEMASUKAN / MODAL AWAL) ----
function bukaModalDebit(id = null, ket = '', jumlah = '') {
    currentDebitId = id;
    document.getElementById('debitKet').value = ket;
    document.getElementById('debitJumlah').value = jumlah;
    document.getElementById('judulModalDebit').innerText = id ? '✏️ Edit Pemasukan' : '📝 Catat Pemasukan';
    document.getElementById('btnHapusDebit').style.display = id ? 'block' : 'none';
    document.getElementById('modalInputDebit').classList.add('show');
}
function tutupModalDebit() { document.getElementById('modalInputDebit').classList.remove('show'); }
function simpanDebit() {
    const ket = document.getElementById('debitKet').value;
    const jumlah = parseInt(document.getElementById('debitJumlah').value) || 0;
    if(!ket || jumlah === 0) { alert("Keterangan dan Jumlah harus diisi!"); return; }

    const data = {
        id: currentDebitId ? currentDebitId : Date.now(),
        waktuTampil: currentDebitId ? dapatkanWaktuSekarang().lengkap : dapatkanWaktuSekarang().lengkap,
        keterangan: ket, jumlah: jumlah
    };
    const transaction = db.transaction(["pemasukan"], "readwrite");
    transaction.objectStore("pemasukan").put(data);
    transaction.oncomplete = function() { tutupModalDebit(); loadPembukuan(); };
}
function hapusDebit() {
    if(!currentDebitId) return;
    const transaction = db.transaction(["pemasukan"], "readwrite");
    transaction.objectStore("pemasukan").delete(currentDebitId);
    transaction.oncomplete = function() { tutupModalDebit(); loadPembukuan(); };
}
