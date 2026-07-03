// ==============================================================
// 0. DEVICE LOCK (PERBAIKAN LOGIKA)
// ==============================================================
const AUTHORIZED_DEVICE_ID = '';

function getOrCreateDeviceID() {
    let id = localStorage.getItem('arta_fortuna_device_id');
    if (!id) {
        id = 'AF-' + Math.random().toString(36).substr(2, 8).toUpperCase();
        localStorage.setItem('arta_fortuna_device_id', id);
    }
    return id;
}

const currentDeviceID = getOrCreateDeviceID();
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('devIdDisplay').innerText = currentDeviceID;
    document.getElementById('namaToko').value = localStorage.getItem('namaTokoPenyewa') || '';
    document.getElementById('jadwalToko').value = localStorage.getItem('jadwalTokoPenyewa') || '';
});

if (AUTHORIZED_DEVICE_ID !== '' && currentDeviceID !== AUTHORIZED_DEVICE_ID) {
    document.documentElement.innerHTML = `
        <div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:100vh;background:#1a1a2e;color:white;font-family:sans-serif;text-align:center;padding:20px;">
            <div style="background:#273340;padding:40px;border-radius:24px;box-shadow:0 10px 30px rgba(0,0,0,0.5);border-top:5px solid #ff7675;">
                <h1 style="font-size:3em;margin:0;">🔒</h1><h2>Akses Ditolak</h2>
                <p style="color:#9ca3af;">Aplikasi dikunci untuk perangkat ini.</p>
                <div style="background:#1f2937;padding:15px;border-radius:12px;border:1px dashed #4b5563;">
                    <small>Device ID Anda:</small><br><strong style="font-size:1.2em;">${currentDeviceID}</strong>
                </div>
            </div>
        </div>`;
    throw new Error("Device Locked.");
}

// ==============================================================
// 1. DATABASE & UTILS
// ==============================================================
let db;
let globalEditId = null;
let globalWaktuAsli = {};
let aksiConfirm = null;

const request = indexedDB.open("KasirLucuDB", 7);
request.onupgradeneeded = (e) => {
    let d = e.target.result;
    if (!d.objectStoreNames.contains('transaksi')) d.createObjectStore('transaksi', { keyPath: 'id' });
    if (!d.objectStoreNames.contains('pengeluaran')) d.createObjectStore('pengeluaran', { keyPath: 'id' });
    if (!d.objectStoreNames.contains('pemasukan')) d.createObjectStore('pemasukan', { keyPath: 'id' });
};
request.onsuccess = (e) => { db = e.target.result; tampilkanTabel(true); inisialisasiTema(); };

function formatUang(n) { return 'Rp ' + Number(n).toLocaleString('id-ID'); }
function dapatkanWaktu() {
    const n = new Date();
    return {
        tampil: `${String(n.getDate()).padStart(2,'0')}/${String(n.getMonth()+1).padStart(2,'0')}/${n.getFullYear()} ${String(n.getHours()).padStart(2,'0')}.${String(n.getMinutes()).padStart(2,'0')} WIB`,
        harian: n.toLocaleDateString('id-ID'),
        bulanan: `${String(n.getMonth()+1).padStart(2,'0')}-${n.getFullYear()}`
    };
}

// ==============================================================
// 2. TEMA & NAVIGASI
// ==============================================================
function toggleTema() {
    document.body.classList.toggle('dark-mode');
    let m = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
    localStorage.setItem('temaAplikasi', m);
    document.getElementById('btnTema').innerText = m === 'dark' ? '☀️' : '🌙';
}
function inisialisasiTema() {
    if (localStorage.getItem('temaAplikasi') === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('btnTema').innerText = '☀️';
    }
}
function switchTab(id, el) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    el.classList.add('active');
    window.scrollTo(0,0);
}

// ==============================================================
// 3. MODAL & KASIR
// ==============================================================
function showModal(msg, confirm, aksi) {
    document.getElementById('modalTeks').innerText = msg;
    document.getElementById('modalBtnBatal').style.display = confirm ? 'block' : 'none';
    document.getElementById('customModal').classList.add('show');
    aksiConfirm = aksi;
}
document.getElementById('modalBtnOK').onclick = () => {
    document.getElementById('customModal').classList.remove('show');
    if (aksiConfirm) { aksiConfirm(); aksiConfirm = null; }
};
document.getElementById('modalBtnBatal').onclick = () => {
    document.getElementById('customModal').classList.remove('show');
    aksiConfirm = null;
};

function simpanPengaturan() {
    localStorage.setItem('namaTokoPenyewa', document.getElementById('namaToko').value);
    localStorage.setItem('jadwalTokoPenyewa', document.getElementById('jadwalToko').value);
}

function simpanData() {
    const toko = document.getElementById('namaToko').value;
    const nm = document.getElementById('nama').value;
    const pr = document.getElementById('produk').value;
    const jual = parseInt(document.getElementById('jual').value) || 0;
    const modal = parseInt(document.getElementById('modal').value) || 0;
    const mt = document.getElementById('metodeBayar').value || 'Tunai';

    if (!toko || !nm || !pr || jual === 0) return showModal("Lengkapi data transaksi!", false);

    const laba = jual - modal;
    const wk = dapatkanWaktu();
    const data = {
        id: globalEditId || Date.now(),
        waktuTampil: globalEditId ? globalWaktuAsli.tampil : wk.tampil,
        waktuHarian: globalEditId ? globalWaktuAsli.harian : wk.harian,
        waktuBulanan: globalEditId ? globalWaktuAsli.bulanan : wk.bulanan,
        nama: nm, produk: pr, jual: jual, modal: modal, laba: laba, metodeBayar: mt
    };

    const tx = db.transaction("transaksi", "readwrite");
    tx.objectStore("transaksi").put(data);
    tx.oncomplete = () => {
        if (!globalEditId) {
            const msg = `*${toko.toUpperCase()}*\nTerima kasih Kak ${nm}!\n\nProduk: ${pr}\nWaktu: ${data.waktuTampil}\nTotal: ${formatUang(jual)}\n\n_Status: BERHASIL_`;
            window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
        }
        batalkanEdit(); tampilkanTabel(true);
    };
}

function pemicuEdit(id, n, p, m, j, mod, wt, wh, wb) {
    globalEditId = id; globalWaktuAsli = { tampil: wt, harian: wh, bulanan: wb };
    document.getElementById('nama').value = n; document.getElementById('produk').value = p;
    document.getElementById('metodeBayar').value = m; document.getElementById('jual').value = j;
    document.getElementById('modal').value = mod;
    document.getElementById('btnSimpan').innerText = "Update Data ✏️";
    document.getElementById('btnBatal').style.display = "block";
    window.scrollTo(0,0);
}
function batalkanEdit() {
    globalEditId = null;
    document.getElementById('nama').value = ''; document.getElementById('produk').value = '';
    document.getElementById('jual').value = ''; document.getElementById('modal').value = '';
    document.getElementById('btnSimpan').innerText = "Simpan & Buat Nota WA 🚀";
    document.getElementById('btnBatal').style.display = "none";
}
function hapusData(id) {
    showModal("Hapus riwayat ini?", true, () => {
        const tx = db.transaction("transaksi", "readwrite");
        tx.objectStore("transaksi").delete(id);
        tx.oncomplete = () => tampilkanTabel(true);
    });
}

function tampilkanTabel(updateBulan = false) {
    const list = document.getElementById('daftarTransaksi'); list.innerHTML = '';
    let lHari = 0, lBulan = 0, wk = dapatkanWaktu(), cari = document.getElementById('cariPelanggan').value.toLowerCase();
    
    db.transaction("transaksi").objectStore("transaksi").getAll().onsuccess = (e) => {
        const trans = e.target.result;
        const sel = document.getElementById('pilihBulan');
        
        if (updateBulan) {
            const current = sel.value || wk.bulanan;
            let unik = [wk.bulanan];
            trans.forEach(t => { if (!unik.includes(t.waktuBulanan)) unik.push(t.waktuBulanan); });
            sel.innerHTML = '';
            unik.forEach(b => {
                let o = document.createElement('option'); o.value = b;
                let p = b.split('-');
                let bln = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Ags","Sep","Okt","Nov","Des"];
                let idxBulan = parseInt(p[0]) - 1;
                o.innerText = (bln[idxBulan] || p[0]) + " " + p[1];
                if (b === current) o.selected = true;
                sel.appendChild(o);
            });
        }
        
        const filterBln = sel.value || wk.bulanan;
        
        trans.forEach(t => {
            if (t.waktuHarian === wk.harian) lHari += t.laba;
            if (t.waktuBulanan === filterBln) lBulan += t.laba;
        });
        
        trans.filter(t => t.nama.toLowerCase().includes(cari)).reverse().forEach(t => {
            const encodedMsg = encodeURIComponent('*' + (localStorage.getItem('namaTokoPenyewa') || 'Toko').toUpperCase() + '*\n\nProduk: ' + t.produk + '\nTotal: ' + formatUang(t.jual) + '\nStatus: BERHASIL');
            list.innerHTML += `
                <div class="kartu-riwayat">
                    <strong>${t.nama}</strong><small style="color:var(--text-muted)">🕒 ${t.waktuTampil}</small><br>
                    <small>📦 ${t.produk} | 💳 ${t.metodeBayar}</small><br>
                    <small>💰 Jual: ${formatUang(t.jual)} | Modal: ${formatUang(t.modal)}</small><br>
                    <strong class="text-hijau">Untung: ${formatUang(t.laba)}</strong>
                    <div class="grup-tombol">
                        <button class="btn-wa" onclick="window.open('https://wa.me/?text=${encodedMsg}', '_blank')">WA 💬</button>
                        <button class="btn-edit-kartu" onclick="pemicuEdit(${t.id},'${t.nama.replace(/'/g, "\\'")}','${t.produk.replace(/'/g, "\\'")}','${t.metodeBayar.replace(/'/g, "\\'")}',${t.jual},${t.modal},'${t.waktuTampil.replace(/'/g, "\\'")}','${t.waktuHarian.replace(/'/g, "\\'")}','${t.waktuBulanan.replace(/'/g, "\\'")}')\">Edit ✏️</button>
                        <button class="btn-hapus" onclick="hapusData(${t.id})\">Hapus 🗑️</button>
                    </div>
                </div>`;
        });
        
        document.getElementById('labaHariIni').innerText = formatUang(lHari);
        document.getElementById('labaBulanIni').innerText = formatUang(lBulan);
    };
}

// ==============================================================
// 4. PEMBUKUAN (LOGIKA DUA DOMPET INDEPENDEN)
// ==============================================================
let curKreditId = null, curDebitId = null;

function loadPembukuan() {
    let t = [], p = [], m = [];
    db.transaction("transaksi").objectStore("transaksi").getAll().onsuccess = (e) => {
        t = e.target.result;
        db.transaction("pengeluaran").objectStore("pengeluaran").getAll().onsuccess = (e) => {
            p = e.target.result;
            db.transaction("pemasukan").objectStore("pemasukan").getAll().onsuccess = (e) => {
                m = e.target.result;
                gabungRenderBuku(t, p, m);
            };
        };
    };
}

function gabungRenderBuku(trans, peng, pemas) {
    let buku = [], omzetKotor = 0, sKas = 0, sDepo = 0;

    trans.forEach(i => {
        buku.push({ id: i.id, tgl: i.waktuTampil, ket: `Jual: ${i.produk}`, deb: i.jual, kre: 0, type: 'jual' });
        omzetKotor += i.jual;
        sKas += i.jual;
        sDepo -= i.modal;
    });

    peng.forEach(i => {
        let jenis = i.jenis || 'umum';
        buku.push({ id: i.id, tgl: i.waktuTampil, ket: (jenis==='deposit'?'🔄 Topup: ':'🛒 ')+i.keterangan, deb: 0, kre: i.jumlah, type: 'peng', jns: jenis, raw: i.keterangan });
        
        sKas -= i.jumlah;
        if (jenis === 'deposit') sDepo += i.jumlah;
    });

    pemas.forEach(i => {
        buku.push({ id: i.id, tgl: i.waktuTampil, ket: `💰 ${i.keterangan}`, deb: i.jumlah, kre: 0, type: 'pemas', raw: i.keterangan });
        omzetKotor += i.jumlah;
        sKas += i.jumlah;
    });

    document.getElementById('totalOmzetKotor').innerText = formatUang(omzetKotor);
    document.getElementById('totalSaldoKas').innerText = formatUang(sKas);
    document.getElementById('totalSaldoDeposit').innerText = formatUang(sDepo);

    const body = document.getElementById('ledgerBody');
    body.innerHTML = `
        <tr style="background:rgba(16,185,129,0.1)"><td style="font-weight:700;color:#10b981">➕ Pemasukan Baru</td><td class="clickable-debit" onclick="bukaModalDebit()">Ketuk 👆</td><td>-</td></tr>
        <tr style="background:rgba(255,118,117,0.1)"><td style="font-weight:700;color:#ff7675">➕ Pengeluaran Baru</td><td>-</td><td class="clickable-cell" onclick="bukaModalKredit()">Ketuk 👆</td></tr>
    `;

    buku.sort((a,b) => b.id - a.id).forEach(b => {
        let baris = `<tr><td><small style="color:var(--text-muted)">${b.tgl}</small><br><strong>${b.ket}</strong></td>`;
        if (b.deb > 0) {
            baris += `<td class="${b.type==='pemas'?'clickable-debit':''}" onclick="${b.type==='pemas'?`bukaModalDebit(${b.id},'${(b.raw||'').replace(/'/g, "\\'")}',${b.deb})`:''}">${formatUang(b.deb)}</td><td>-</td>`;
        } else {
            baris += `<td>-</td><td class="clickable-cell" onclick="bukaModalKredit(${b.id},'${(b.raw||'').replace(/'/g, "\\'")}',${b.kre},'${b.jns||'umum'}')">${formatUang(b.kre)}</td>`;
        }
        body.innerHTML += baris + `</tr>`;
    });
}

// FUNGSI MODAL KREDIT (PENGELUARAN)
function bukaModalKredit(id=null, ket='', jml='', jns='umum') {
    curKreditId = id;
    document.getElementById('kreditKet').value = ket;
    document.getElementById('kreditJumlah').value = jml;
    document.getElementById('kreditJenis').value = jns;
    document.getElementById('btnHapusKredit').style.display = id ? 'block' : 'none';
    document.getElementById('modalInputKredit').classList.add('show');
}
function tutupModalKredit() { document.getElementById('modalInputKredit').classList.remove('show'); }
function simpanKredit() {
    const k = document.getElementById('kreditKet').value, j = parseInt(document.getElementById('kreditJumlah').value) || 0, jn = document.getElementById('kreditJenis').value;
    if (!k || j === 0) return alert("Isi data!");
    const data = { id: curKreditId || Date.now(), waktuTampil: dapatkanWaktu().tampil, keterangan: k, jumlah: j, jenis: jn };
    const tx = db.transaction("pengeluaran", "readwrite");
    tx.objectStore("pengeluaran").put(data);
    tx.oncomplete = () => { tutupModalKredit(); loadPembukuan(); };
}
function hapusKredit() {
    const tx = db.transaction("pengeluaran", "readwrite");
    tx.objectStore("pengeluaran").delete(curKreditId);
    tx.oncomplete = () => { tutupModalKredit(); loadPembukuan(); };
}

// FUNGSI MODAL DEBIT (PEMASUKAN)
function bukaModalDebit(id=null, ket='', jml='') {
    curDebitId = id;
    document.getElementById('debitKet').value = ket;
    document.getElementById('debitJumlah').value = jml;
    document.getElementById('btnHapusDebit').style.display = id ? 'block' : 'none';
    document.getElementById('modalInputDebit').classList.add('show');
}
function tutupModalDebit() { document.getElementById('modalInputDebit').classList.remove('show'); }
function simpanDebit() {
    const k = document.getElementById('debitKet').value, j = parseInt(document.getElementById('debitJumlah').value) || 0;
    if (!k || j === 0) return alert("Isi data!");
    const data = { id: curDebitId || Date.now(), waktuTampil: dapatkanWaktu().tampil, keterangan: k, jumlah: j };
    const tx = db.transaction("pemasukan", "readwrite");
    tx.objectStore("pemasukan").put(data);
    tx.oncomplete = () => { tutupModalDebit(); loadPembukuan(); };
}
function hapusDebit() {
    const tx = db.transaction("pemasukan", "readwrite");
    tx.objectStore("pemasukan").delete(curDebitId);
    tx.oncomplete = () => { tutupModalDebit(); loadPembukuan(); };
}
