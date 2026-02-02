# vzcli

<p align="center">
  <img src="https://img.shields.io/npm/v/vzcli.svg" alt="npm Version">
  <img src="https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg" alt="Node.js 16+">
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT">
  <img src="https://img.shields.io/badge/platform-linux%20%7C%20macos%20%7C%20windows-lightgrey" alt="Platform">
  <img src="https://img.shields.io/npm/dw/vzcli" alt="npm Downloads">
</p>

### Rekomendasi VPS, NAT VPS (Virtualizor) & Hosting

<div align="center">

Butuh VPS untuk testing script ini? **[HostData.id](https://hostdata.id)** menyediakan berbagai pilihan hosting terpercaya dengan harga terjangkau.

[![HostData.id](https://img.shields.io/badge/HostData.id-VPS%20Terpercaya-FF6B35?style=flat&logo=server&logoColor=white)](https://hostdata.id) 
[![NAT VPS](https://img.shields.io/badge/NAT%20VPS-Mulai%2015K/bulan-00C851?style=flat)](https://hostdata.id/nat-vps)
[![VPS Indonesia](https://img.shields.io/badge/VPS%20Indonesia-Mulai%20200K/bulan-007ACC?style=flat&logo=server)](https://hostdata.id/vps-indonesia)
[![Dedicated Server](https://img.shields.io/badge/Dedicated%20Server-Enterprise%20Ready-8B5CF6?style=flat&logo=server)](https://hostdata.id/dedicated-server)

</div>

Tool CLI untuk mengelola domain/port forwarding VPS Virtualizor dengan dukungan multi-host dan antarmuka terminal yang kaya.

**[🇺🇸 Read in English](README.md)**

## Fitur

| Fitur | Deskripsi |
|-------|-----------|
| **Dukungan Multi-Host** | Kelola beberapa server Virtualizor dari satu antarmuka |
| **UI Terminal Kaya** | Output cantik dengan warna, tabel, spinner, dan progress bar |
| **Statistik Penggunaan VM** | Monitoring resource real-time dengan progress bar visual |
| **Kredensial Aman** | Integrasi OS keyring dengan fallback enkripsi AES |
| **Tes Koneksi** | Tes semua host dengan tampilan waktu respons |
| **Operasi CRUD** | Manajemen aturan forwarding lengkap |
| **Operasi Batch** | Import/export aturan dalam format JSON |
| **Mode Interaktif** | Prompt langkah demi langkah untuk pemula |
| **Auto-completion** | Pemilihan VM dan aturan yang cerdas |

## Persyaratan

- Node.js 16.0.0 atau lebih baru
- Akses ke Panel Virtualizor dengan kredensial API
- Akses jaringan ke server Virtualizor

## Instalasi

### Dari npm (Direkomendasikan)

```bash
npm install -g vzcli
```

### Dari Source

```bash
git clone https://github.com/iam-rizz/vzcli.js.git
cd vzcli.js
npm install
npm link
```

### Verifikasi Instalasi

```bash
vzcli --help
```

## Mulai Cepat

```bash
# 1. Tambah konfigurasi host
vzcli config add production \
  --url "https://panel.example.com:4083/index.php" \
  --key "YOUR_API_KEY" \
  --pass "YOUR_API_PASSWORD" \
  --default

# 2. Tes koneksi
vzcli config test

# 3. List VM
vzcli vm list

# 4. Cek statistik penggunaan VM
vzcli vm usage

# 5. Tambah aturan forwarding (interaktif)
vzcli forward add -i
```

## Penggunaan

### Versi & Informasi

```bash
# Tampilkan versi
vzcli --version
vzcli -V

# Tampilkan informasi detail
vzcli about

# Cek update
vzcli update
```

### 1. Manajemen Konfigurasi

#### Tambah Profil Host

```bash
# Mode interaktif (direkomendasikan)
vzcli config add -i

# Mode langsung
vzcli config add production \
  --url "https://panel.com:4083/index.php" \
  --key "apikey" \
  --pass "password" \
  --default
```

#### Kelola Profil Host

```bash
# List semua host
vzcli config list

# Set host default
vzcli config set-default production

# Tes koneksi (semua host)
vzcli config test

# Tes host spesifik
vzcli config test staging

# Hapus host
vzcli config remove staging
```

#### Gunakan Host Spesifik

```bash
# Gunakan --host atau -H untuk operasi dengan host spesifik
vzcli --host staging vm list
vzcli -H production forward list --vpsid 103
```

### 2. Manajemen Virtual Machine

#### List Virtual Machine

```bash
# List semua VM
vzcli vm list

# Filter berdasarkan status
vzcli vm list --status up      # Hanya VM yang berjalan
vzcli vm list --status down    # Hanya VM yang mati

# List VM dari semua host
vzcli vm list --all-hosts

# List VM yang berjalan dari semua host
vzcli vm list --all-hosts --status up

# Output JSON (untuk scripting)
vzcli vm list --json
vzcli vm list --status up --json
```

#### Statistik Penggunaan VM

```bash
# Tampilkan statistik penggunaan untuk semua VM
vzcli vm usage

# Filter berdasarkan status
vzcli vm usage --status up     # Hanya VM yang berjalan
vzcli vm usage --status down   # Hanya VM yang mati

# Tampilkan penggunaan dari semua host
vzcli vm usage --all-hosts

# Tampilkan penggunaan detail untuk VM spesifik
vzcli vm usage --vpsid 105

# Output JSON (untuk scripting)
vzcli vm usage --json
vzcli vm usage --vpsid 105 --json

# Gunakan host spesifik
vzcli vm usage --host production
```

**Tampilan Statistik Penggunaan:**
- **Penggunaan RAM**: Progress bar dengan persentase dan used/total dalam GB
- **Penggunaan Disk**: Progress bar dengan persentase dan used/total dalam GB  
- **Penggunaan Bandwidth**: Progress bar dengan persentase dan used/total dalam TB
- **Aturan Port Forwarding**: Jumlah aturan forwarding yang aktif
- **Bar berwarna**: Hijau (<50%), Kuning (50-80%), Merah (>80%)

### 3. Manajemen Port Forwarding

#### List Aturan Forwarding

```bash
# Interaktif (pilih VM dari list)
vzcli forward list -i

# Langsung ke VM spesifik
vzcli forward list --vpsid 103
vzcli forward list -v 103

# Auto-pilih jika hanya 1 VM
vzcli forward list --auto

# Output JSON
vzcli forward list --vpsid 103 --json
```

#### Tambah Aturan Forwarding

```bash
# Mode interaktif (direkomendasikan)
vzcli forward add -i

# HTTP Forwarding (auto port 80)
vzcli forward add --vpsid 103 --protocol HTTP --domain app.example.com

# HTTPS Forwarding (auto port 443)
vzcli forward add --vpsid 103 --protocol HTTPS --domain secure.example.com

# TCP Forwarding (port custom)
vzcli forward add \
  --vpsid 103 \
  --protocol TCP \
  --domain 45.158.126.xxx \
  --src-port 2222 \
  --dest-port 22

# Opsi singkat
vzcli forward add -v 103 -p HTTP -d app.example.com
vzcli forward add -v 103 -p TCP -d 45.158.126.xxx -s 2222 -t 22
```

#### Edit Aturan Forwarding

```bash
# Mode interaktif
vzcli forward edit -i

# Edit protokol (auto-update port)
vzcli forward edit --vpsid 103 --vdfid 596 --protocol HTTPS

# Edit domain
vzcli forward edit --vpsid 103 --vdfid 596 --domain new.example.com

# Edit port
vzcli forward edit --vpsid 103 --vdfid 596 --src-port 8080 --dest-port 80
```

#### Hapus Aturan Forwarding

```bash
# Mode interaktif (dengan konfirmasi)
vzcli forward delete -i

# Hapus aturan tunggal (dengan konfirmasi)
vzcli forward delete --vpsid 103 --vdfid 596

# Hapus beberapa aturan
vzcli forward delete --vpsid 103 --vdfid 596,597,598

# Hapus tanpa konfirmasi
vzcli forward delete --vpsid 103 --vdfid 596 --force
```

### 4. Operasi Batch

#### Export Aturan

```bash
# Export ke file JSON
vzcli batch export --vpsid 103 --output rules.json
vzcli batch export -v 103 -o backup.json
```

#### Import Aturan

```bash
# Import dari file JSON
vzcli batch import --vpsid 103 --file rules.json

# Dry run (validasi tanpa eksekusi)
vzcli batch import --vpsid 103 --file rules.json --dry-run

# Opsi singkat
vzcli batch import -v 103 -f rules.json
```

#### Generate Template

```bash
# Generate template import
vzcli batch template --output template.json
```

## Konfigurasi

### Lokasi File Konfigurasi

- **Linux/macOS**: `~/.config/vzcli/config.json`
- **Windows**: `%APPDATA%\vzcli\config.json`

### Keamanan

Kredensial disimpan dengan aman menggunakan:

1. **OS Keyring** (Utama) - macOS Keychain, Windows Credential Store, Linux Secret Service
2. **Enkripsi AES** (Fallback) - Enkripsi dengan kunci spesifik mesin
3. **Prompt Interaktif** (Terakhir) - Prompt setiap kali

### Format Batch Import/Export

```json
{
  "vpsid": "103",
  "exported_at": "2025-02-02T10:30:00.000Z",
  "host": "production",
  "rules": [
    {
      "protocol": "HTTP",
      "src_hostname": "app1.example.com",
      "src_port": 80,
      "dest_ip": "10.0.0.1",
      "dest_port": 80
    },
    {
      "protocol": "HTTPS",
      "src_hostname": "app2.example.com",
      "src_port": 443,
      "dest_ip": "10.0.0.1",
      "dest_port": 443
    },
    {
      "protocol": "TCP",
      "src_hostname": "45.158.126.xxx",
      "src_port": 2222,
      "dest_ip": "10.0.0.1",
      "dest_port": 22
    }
  ]
}
```

## Referensi Command

### Opsi Global

| Opsi | Singkat | Deskripsi |
|------|---------|-----------|
| `--version` | `-V` | Tampilkan versi dan keluar |
| `--host NAME` | `-H` | Gunakan profil host spesifik |
| `--no-color` | | Nonaktifkan output berwarna |
| `--verbose` | `-v` | Output verbose |
| `--debug` | | Mode debug (tampilkan stack trace) |
| `--help` | `-h` | Tampilkan bantuan |

### Command

| Command | Deskripsi |
|---------|-----------|
| `vzcli about` | Tampilkan versi dan informasi author |
| `vzcli update` | Cek update dari npm registry |
| `vzcli config <action>` | Kelola konfigurasi host |
| `vzcli vm <action>` | Kelola virtual machine |
| `vzcli forward <action>` | Kelola aturan forwarding |
| `vzcli batch <action>` | Operasi batch |

## Contoh

### Workflow Lengkap: Setup Web Server

```bash
# 1. Setup host
vzcli config add myserver \
  --url "https://virt.myserver.com:4083/index.php" \
  --key "abc123" \
  --pass "secret" \
  --default

# 2. Cek VM yang tersedia
vzcli vm list --status up

# 3. Monitor penggunaan resource VM
vzcli vm usage --status up

# 4. Tambah HTTP forwarding
vzcli forward add -v 103 -p HTTP -d mysite.com

# 5. Tambah HTTPS forwarding
vzcli forward add -v 103 -p HTTPS -d mysite.com

# 6. Tambah akses SSH
vzcli forward add -v 103 -p TCP -d 45.158.126.xxx -s 2222 -t 22

# 7. Verifikasi aturan
vzcli forward list -v 103

# 8. Cek penggunaan VM setelah setup
vzcli vm usage --vpsid 103
```

### Backup dan Restore

```bash
# Backup aturan
vzcli batch export -v 103 -o vm103_backup.json

# Restore ke VM lain (tes dulu)
vzcli batch import -v 104 -f vm103_backup.json --dry-run
vzcli batch import -v 104 -f vm103_backup.json
```

### Manajemen Multi-Host

```bash
# Setup beberapa host
vzcli config add production --url "https://prod.com:4083" --key "key1" --pass "pass1" --default
vzcli config add staging --url "https://staging.com:4083" --key "key2" --pass "pass2"

# Tes semua host
vzcli config test

# List VM dari semua host
vzcli vm list --all-hosts

# Cek statistik penggunaan dari semua host
vzcli vm usage --all-hosts

# Operasi pada host spesifik
vzcli -H staging vm list
vzcli -H staging vm usage
vzcli -H production forward list -v 103
```

## Troubleshooting

### Masalah Koneksi

```
✗ Failed to connect to API
```

**Solusi:**
1. Verifikasi URL API termasuk port 4083
2. Cek konektivitas jaringan
3. Pastikan firewall mengizinkan koneksi
4. Tes dengan `vzcli config test`

### Masalah Autentikasi

```
✗ Authentication failed
```

**Solusi:**
1. Verifikasi API Key di panel Virtualizor
2. Cek API Password benar
3. Pastikan akses API diaktifkan
4. Tambah ulang konfigurasi host

### Mode Debug

Untuk informasi error detail:

```bash
vzcli --debug vm list
vzcli --debug forward add -i
```

## Development

### Setup Environment Development

```bash
git clone https://github.com/iam-rizz/vzcli.js.git
cd vzcli.js
npm install
```

### Testing

```bash
# Gunakan Node.js 20 untuk testing
nvm use 20

# Jalankan test
npm test

# Jalankan dengan host spesifik
vzcli --host myhost vm list
```

### Struktur Project

```
vzcli.js/
├── package.json
├── README.md
├── README_ID.md
├── LICENSE
├── bin/
│   └── vzcli.js              # Entry point CLI
├── src/
│   ├── index.js              # Export utama
│   ├── commands/             # Handler command
│   │   ├── config.js
│   │   ├── vm.js
│   │   ├── forward.js
│   │   ├── batch.js
│   │   ├── about.js
│   │   └── update.js
│   ├── lib/                  # Library inti
│   │   ├── api-client.js
│   │   ├── config-manager.js
│   │   ├── security.js
│   │   └── utils.js
│   ├── services/             # Logika bisnis
│   │   ├── vm-service.js
│   │   ├── forward-service.js
│   │   └── batch-service.js
│   └── ui/                   # User interface
│       ├── output.js
│       ├── prompts.js
│       └── progress.js
└── tests/
    ├── unit/
    └── integration/
```

## Kontribusi

Kontribusi sangat diterima! Silakan kirim Pull Request.

1. Fork repository
2. Buat feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit perubahan (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buka Pull Request

## Lisensi

Project ini dilisensikan di bawah MIT License - lihat file [LICENSE](LICENSE) untuk detail.

## Author

**Rizz**

- Email: rizkyadhypratama@gmail.com
- GitHub: [@iam-rizz](https://github.com/iam-rizz)

---

<p align="center">
  Dibuat dengan ❤️ untuk pengguna Virtualizor
</p>