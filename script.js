// ==============================================================
function switchTab(targetId, navElement) {
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById(targetId).classList.add('active');
    navElement.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

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

// Upgrade Database
const request = indexedDB.open("KasirLucuDB", 7);

request.onupgradeneeded = function(event) {
    db = event.target.result;
    if (!db.objectStoreNames.contains('transaksi')) db.createObjectStore('transaksi', { keyPath: 'id' });
    if (!db.objectStoreNames.contains('pengeluaran')) db.createObjectStore('pengeluaran', { keyPath: 'id' });
    if (!db.objectStoreNames.contains('pemasukan')) db.createObjectStore('pemasukan', { keyPath: 'id' });
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

function formatUang(angka) { return 'Rp ' + (angka || 0).toLocaleString('id-ID'); }
function dapatkanWaktuSekarang() {
    const now = new Date();
    return {
        lengkap: `${now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} - ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`,
        tglHarian: now.toLocaleDateString('id-ID'),
        blnTahunan: `${now.getMonth()}-${now.getFullYear()}`
    };
}

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
    const jual = parseInt(document.getElementById('jual').value, 10) || 0;
    const modal = parseInt(document.getElementById('modal').value, 10) || 0;

    if(!namaToko) return tampilkanAlert("Tulis Nama Toko Kamu dulu ya! 🏪");
    if(!nama || !produk || jual === 0) return tampilkanAlert("Mohon isi Nama, Produk, dan Harga Jual 😊");

    const laba = jual - modal;

    const isEdit = globalEditId !== null;
    const editId = globalEditId;

    let dataTransaksi = isEdit ? {
        id: editId,
        waktuTampil: globalWaktuAsli.tampil,
        waktuHarian: globalWaktuAsli.harian,
        waktuBulanan: globalWaktuAsli.bulanan,
        nama: nama,
        produk: produk,
        metodeBayar: metodeBayar,
        jual: jual,
        modal: modal,
        laba: laba
    } : {
        id: Date.now(),
        waktuTampil: dapatkanWaktuSekarang().lengkap,
        waktuHarian: dapatkanWaktuSekarang().tglHarian,
        waktuBulanan: dapatkanWaktuSekarang().blnTahunan,
        nama: nama,
        produk: produk,
        metodeBayar: metodeBayar,
        jual: jual,
        modal: modal,
        laba: laba
    };

    const transaction = db.transaction(["transaksi"], "readwrite");
    transaction.objectStore("transaksi").put(dataTransaksi);

    transaction.oncomplete = function() {
        batalkanEdit();
        tampilkanTabel(!isEdit);
        if (!isEdit) bukaWhatsApp(dataTransaksi, namaToko, jadwalToko);
    };
}

function pemicuEdit(id, nama, produk, metodeBayar, jual, modal, wTampil, wHarian, wBulanan) {
    globalEditId = id;
    globalWaktuAsli = { tampil: wTampil, harian: wHarian, bulanan: wBulanan };
    document.getElementById('nama').value = nama;
    document.getElementById('produk').value = produk;
    document.getElementById('metodeBayar').value = metodeBayar;
    document.getElementById('jual').value = jual;
    document.getElementById('modal').value = modal;
    const btn = document.getElementById('btnSimpan');
    btn.innerText = "Simpan Perubahan Data ✏️";
    btn.classList.add('btn-edit-mode');
    document.getElementById('btnBatal').style.display = "block";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function batalkanEdit() {
    globalEditId = null;
    globalWaktuAsli = {};
    document.getElementById('nama').value = '';
    document.getElementById('produk').value = '';
    document.getElementById('metodeBayar').value = '';
    document.getElementById('jual').value = '';
    document.getElementById('modal').value = '';
    const btn = document.getElementById('btnSimpan');
    btn.innerText = "Simpan & Buat Nota WA 🚀";
    btn.classList.remove('btn-edit-mode');
    document.getElementById('btnBatal').style.display = "none";
}

function hapusData(id) {
    tampilkanConfirm("Yakin mau hapus catatan penjualan ini? 🗑️", function() {
        const transaction = db.transaction(["transaksi"], "readwrite");
        transaction.objectStore("transaksi").delete(id);
        transaction.oncomplete = function() {
            batalkanEdit();
            tampilkanTabel(true);
        };
    });
}

function bukaWhatsApp(data, namaToko, jadwalToko) {
    const teksNota = `*${(namaToko || '').toUpperCase()}*\\nTerima kasih Kak ${data.nama}!\\n\\n*Rincian Pesanan:*\\n▪️ Waktu: ${data.waktuTampil}\\n▪️ Produk: ${data.produk}\\n▪️ Total: ${formatUang(data.jual)}\\n\\n_Status: LUNAS & BERHASIL_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(teksNota)}`, '_blank');
}

function bukaWhatsAppById(transaksiId) {
    if (!transaksiId) return;
    const namaToko = document.getElementById('namaToko').value || '';
    const jadwalToko = document.getElementById('jadwalToko').value || '';
    const req = db.transaction(["transaksi"], "readonly").objectStore("transaksi").get(transaksiId);
    req.onsuccess = function() {
        const data = req.result;
        if (data) bukaWhatsApp(data, namaToko, jadwalToko);
    };
}

function tampilkanTabel(perbaruiDropdown = false) {
    const wadah = document.getElementById('daftarTransaksi');
    wadah.innerHTML = '';
    let labaHariIni = 0;
    let labaBulanTerpilih = 0;

    const wk = dapatkanWaktuSekarang();
    const cariEl = document.getElementById('cariPelanggan');
    const cari = (cariEl.value || '').toLowerCase();

    const request = db.transaction(["transaksi"], "readonly").objectStore("transaksi").getAll();
    request.onsuccess = function() {
        const tr = request.result || [];
        const sel = document.getElementById('pilihBulan');

        if (perbaruiDropdown) {
            const lastSel = sel.value || wk.blnTahunan;
            let unik = [wk.blnTahunan];
            tr.forEach(t => { if (t && t.waktuBulanan && !unik.includes(t.waktuBulanan)) unik.push(t.waktuBulanan); });

            sel.innerHTML = '';
            const nmBln = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];

            unik.forEach(b => {
                const opt = document.createElement('option');
                opt.value = b;
                const pt = String(b).split('-');
                opt.innerText = `${nmBln[parseInt(pt[0], 10)]} ${pt[1]}`;
                if (b === lastSel) opt.selected = true;
                sel.appendChild(opt);
            });
        }

        const fBulan = sel.value || wk.blnTahunan;

        tr.forEach(t => {
            if (!t) return;
            if(t.waktuHarian === wk.tglHarian) labaHariIni += t.laba || 0;
            if(t.waktuBulanan === fBulan) labaBulanTerpilih += t.laba || 0;
        });

        const saring = tr.filter(t => t && (t.nama || '').toLowerCase().includes(cari));
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
                            <button class="btn-wa" onclick="bukaWhatsAppById(${t.id})">Nota WA 💬</button>
                            <button class="btn-edit-kartu" onclick='pemicuEdit(${t.id}, ${JSON.stringify(t.nama)}, ${JSON.stringify(t.produk)}, ${JSON.stringify(t.metodeBayar)}, ${t.jual}, ${t.modal}, ${JSON.stringify(t.waktuTampil)}, ${JSON.stringify(t.waktuHarian)}, ${JSON.stringify(t.waktuBulanan)})'>Edit ✏️</button>
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
let currentKreditId = null;
let currentDebitId = null;

function loadPembukuan() {
    const tbody = document.getElementById('ledgerBody');
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Memuat data...</td></tr>';

    let transaksi = [], pengeluaran = [], pemasukan = [];
    const tReq = db.transaction("transaksi", "readonly").objectStore("transaksi").getAll();

    tReq.onsuccess = () => {
        transaksi = tReq.result || [];
        const pReq = db.transaction("pengeluaran", "readonly").objectStore("pengeluaran").getAll();
        pReq.onsuccess = () => {
            pengeluaran = pReq.result || [];
            const mReq = db.transaction("pemasukan", "readonly").objectStore("pemasukan").getAll();
            mReq.onsuccess = () => {
                pemasukan = mReq.result || [];
                gabungDanRenderBuku(transaksi, pengeluaran, pemasukan);
            };
        };
    };
}

function gabungDanRenderBuku(transaksi, pengeluaran, pemasukan) {
    let buku = [];

    // Kas (Tunai/Rek): total uang masuk/debit
    let saldoKas = 0;

    // Deposit (Supplier): top-up supplier - modal yang sudah dipakai untuk penjualan
    let totalDepositMasuk = 0;
    let totalModalTerpakai = 0;

    transaksi.forEach(t => {
        buku.push({ id: t.id, waktu: t.waktuTampil, rawKet: `Jual: ${t.produk}`, ket: `Jual: ${t.produk}`, debit: t.jual || 0, kredit: 0, type: 'masuk_kasir' });
        saldoKas += t.jual || 0;
        totalModalTerpakai += t.modal || 0; // modal terpakai = modal penjualan
    });

    pengeluaran.forEach(p => {
        const jenis = p.jenis || 'umum';
        const labelKet = jenis === 'deposit' ? `🔄 Top-Up: ${p.keterangan}` : `🛒 Keluar: ${p.keterangan}`;

        buku.push({ id: p.id, waktu: p.waktuTampil, rawKet: p.keterangan, ket: labelKet, debit: 0, kredit: p.jumlah || 0, type: 'keluar', jenis: jenis });

        if(jenis === 'deposit') {
            totalDepositMasuk += p.jumlah || 0; // top-up supplier masuk
        }
    });

    pemasukan.forEach(m => {
        buku.push({ id: m.id, waktu: m.waktuTampil, rawKet: m.keterangan, ket: `💰 Masuk: ${m.keterangan}`, debit: m.jumlah || 0, kredit: 0, type: 'masuk_manual' });
        saldoKas += m.jumlah || 0;
    });

    const saldoDeposit = totalDepositMasuk - totalModalTerpakai;

    buku.sort((a, b) => a.id - b.id);

    document.getElementById('totalSaldoKas').innerText = formatUang(saldoKas);
    document.getElementById('totalSaldoDeposit').innerText = formatUang(saldoDeposit);

    const tbody = document.getElementById('ledgerBody');
    tbody.innerHTML = '';

    if(buku.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-muted);">Belum ada data pembukuan.</td></tr>`;
    }

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
            tbody.innerHTML += `<tr><td><span class="keterangan-tgl">${b.waktu}</span><strong>${b.ket}</strong></td><td class="clickable-debit cell-debit" onclick="bukaModalDebit(${b.id}, ${JSON.stringify(b.rawKet)}, ${b.debit})">+${b.debit.toLocaleString('id-ID')}</td><td style="text-align:center; color:var(--text-muted);">-</td></tr>`;
        } else {
            tbody.innerHTML += `<tr><td><span class="keterangan-tgl">${b.waktu}</span><strong>${b.ket}</strong></td><td style="text-align:center; color:var(--text-muted);">-</td><td class="clickable-cell cell-kredit" onclick="bukaModalKredit(${b.id}, ${JSON.stringify(b.rawKet)}, ${b.kredit}, ${JSON.stringify(b.jenis)})">-${b.kredit.toLocaleString('id-ID')}</td></tr>`;
        }
    });
}

function bukaModalKredit(id = null, ket = '', jumlah = '', jenis = 'umum') {
    currentKreditId = id;
    document.getElementById('kreditKet').value = ket;
    document.getElementById('kreditJumlah').value = jumlah;
    document.getElementById('kreditJenis').value = jenis;
    document.getElementById('judulModalKredit').innerText = id ? '✏️ Edit Pengeluaran' : '📝 Catat Pengeluaran';
    document.getElementById('btnHapusKredit').style.display = id ? 'block' : 'none';
    document.getElementById('modalInputKredit').classList.add('show');
}

function simpanKredit() {
    const ket = document.getElementById('kreditKet').value;
    const jumlah = parseInt(document.getElementById('kreditJumlah').value, 10) || 0;
    const jenis = document.getElementById('kreditJenis').value;

    if(!ket || jumlah === 0) { tampilkanAlert("Keterangan dan Jumlah harus diisi!"); return; }

    const now = dapatkanWaktuSekarang();
    const data = {
        id: currentKreditId ? currentKreditId : Date.now(),
        waktuTampil: currentKreditId ? now.lengkap : now.lengkap,
        keterangan: ket,
        jumlah: jumlah,
        jenis: jenis
    };

    const transaction = db.transaction(["pengeluaran"], "readwrite");
    transaction.objectStore("pengeluaran").put(data);
    transaction.oncomplete = function() {
        currentKreditId = null;
        tutupModalKredit();
        loadPembukuan();
    };
}

function tutupModalKredit() {
    document.getElementById('modalInputKredit').classList.remove('show');
    currentKreditId = null;
}

function hapusKredit() {
    if(!currentKreditId) return;
    const transaction = db.transaction(["pengeluaran"], "readwrite");
    transaction.objectStore("pengeluaran").delete(currentKreditId);
    transaction.oncomplete = function() {
        currentKreditId = null;
        tutupModalKredit();
        loadPembukuan();
    };
}

function bukaModalDebit(id = null, ket = '', jumlah = '') {
    currentDebitId = id;
    document.getElementById('debitKet').value = ket;
    document.getElementById('debitJumlah').value = jumlah;
    document.getElementById('judulModalDebit').innerText = id ? '✏️ Edit Pemasukan' : '📝 Catat Pemasukan';
    document.getElementById('btnHapusDebit').style.display = id ? 'block' : 'none';
    document.getElementById('modalInputDebit').classList.add('show');
}
function tutupModalDebit() {
    document.getElementById('modalInputDebit').classList.remove('show');
    currentDebitId = null;
}
function simpanDebit() {
    const ket = document.getElementById('debitKet').value;
    const jumlah = parseInt(document.getElementById('debitJumlah').value, 10) || 0;
    if(!ket || jumlah === 0) { tampilkanAlert("Keterangan dan Jumlah harus diisi!"); return; }

    const now = dapatkanWaktuSekarang();
    const data = {
        id: currentDebitId ? currentDebitId : Date.now(),
        waktuTampil: now.lengkap,
        keterangan: ket,
        jumlah: jumlah
    };

    const transaction = db.transaction(["pemasukan"], "readwrite");
    transaction.objectStore("pemasukan").put(data);
    transaction.oncomplete = function() {
        currentDebitId = null;
        tutupModalDebit();
        loadPembukuan();
    };
}
function hapusDebit() {
    if(!currentDebitId) return;
    const transaction = db.transaction(["pemasukan"], "readwrite");
    transaction.objectStore("pemasukan").delete(currentDebitId);
    transaction.oncomplete = function() {
        currentDebitId = null;
        tutupModalDebit();
        loadPembukuan();
    };
}
