# GlueAuth

[![GitHub Repo](https://img.shields.io/badge/GitHub-GlueAuth-blue?logo=github)](https://github.com/Glueeeeed/GlueAuth)

## English / English version

### Introduction
GlueAuth is a decentralized authentication system leveraging Zero-Knowledge Proofs (ZKP). It enables secure user registration and login without storing passwords or personal data. Identity is mathematically protected using ZKP technology.


### Features
- **Zero-Knowledge Proofs**: Prove identity without revealing secrets using Semaphore Protocol.
- **QR Code Login**: Generate QR for seamless login on other devices.
- **No Data Storage**: No passwords or personal info stored on server.
- **Secure Key Exchange**: End-to-end encrypted communication.

### Tech Stack
#### Backend
- Node.js / Express.js
- TypeScript
- MySQL database
- [@semaphore-protocol/core](https://docs.semaphore.pse.dev/) for ZKP
- [@noble/curves](https://www.npmjs.com/package/@noble/curves), [@noble/ciphers](https://www.npmjs.com/package/@noble/ciphers) for cryptography
- JWT for sessions

#### Frontend
- Vite build tool
- TypeScript / HTML / CSS / JS
- Modern UI with Tailwind CSS styles

### Installation
1. Clone the repository:
   ```
   git clone https://github.com/Glueeeeed/GlueAuth.git
   cd GlueAuth
   ```
2. Install dependencies:
   ```
   npm install
   ```

**Build the frontend:**
   ```
   npm run build
   ```
3. Copy `src/configs/example_secrets.env` to `.env` and configure:
- Database credentials (MySQL)
- Any other secrets (e.g., JWT secret)
4. Start the server:
   ```
   npm start
   ```
   Server runs on `http://localhost:3000` (check `src/configs/settings.ts` for port).



**Important**: Save your QR code securely. Loss means permanent account loss!

### Database Schema

```sql
CREATE TABLE `commitments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `commitment` VARCHAR(66) UNIQUE NOT NULL
);

CREATE TABLE `nullifier_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nullifier` VARCHAR(66) UNIQUE NOT NULL,
  `use_date` DATETIME NOT NULL
);
```

### License
MIT License - see [LICENSE.md](LICENSE.md)

---

## Wersja Polska / Polish version

### Wstęp
GlueAuth to zdecentralizowany system autentykacji wykorzystujący Dowody z zerową wiedzą (ZKP). Umożliwia bezpieczną rejestrację i logowanie użytkowników bez przechowywania haseł lub danych osobowych. Tożsamość jest matematycznie chroniona dzięki technologii ZKP.



### Funkcje
- **Dowody Zero-Wiedzy**: Udowodnij tożsamość bez ujawniania sekretów za pomocą Semaphore Protocol.
- **Logowanie kodem QR**: Generuj QR do bezproblemowego logowania na innych urządzeniach.
- **Brak przechowywania danych**: Serwer nie przechowuje haseł ani danych osobowych.
- **Bezpieczna wymiana kluczy**: Komunikacja szyfrowana end-to-end.

### Stos technologii
#### Backend
- Node.js / Express.js
- TypeScript
- Baza danych MySQL
- [@semaphore-protocol/core](https://docs.semaphore.pse.dev/) dla ZKP
- [@noble/curves](https://www.npmjs.com/package/@noble/curves), [@noble/ciphers](https://www.npmjs.com/package/@noble/ciphers) dla kryptografii
- JWT dla sesji

#### Frontend
- Narzędzie budujące Vite
- TypeScript / HTML / CSS / JS
- Nowoczesny interfejs z stylami Tailwind CSS

### Instalacja
1. Sklonuj repozytorium:
   ```
   git clone https://github.com/Glueeeeed/GlueAuth.git
   cd GlueAuth
   ```
2. Zainstaluj zależności:
   ```
   npm install
   ```

**Zbuduj frontend:**
   ```
   npm run build
   ```
3. Skopiuj `src/configs/example_secrets.env` do `.env` i skonfiguruj:
- Dane dostępowe do bazy (MySQL)
- Inne sekrety (np. sekret JWT)
4. Uruchom serwer:
   ```
   npm start
   ```
   Serwer działa na `http://localhost:3000` (sprawdź `src/configs/settings.ts` dla portu).



**Ważne**: Przechowuj kod QR bezpiecznie. Utrata oznacza bezpowrotną utratę konta!

### Schemat bazy danych

```sql
CREATE TABLE `commitments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `commitment` VARCHAR(66) UNIQUE NOT NULL
);

CREATE TABLE `nullifier_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nullifier` VARCHAR(66) UNIQUE NOT NULL,
  `use_date` DATETIME NOT NULL
);
```

### Licencja
Licencja MIT - zobacz [LICENSE.md](LICENSE.md)