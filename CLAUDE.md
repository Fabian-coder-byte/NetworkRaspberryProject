# Prompt per Claude - Progetto Network Map per Raspberry Pi

Voglio creare una nuova applicazione chiamata **Network Map** per il mio Raspberry Pi / homelab.

## Contesto generale

Ho un Raspberry Pi usato come server domestico/homelab.
Sul Raspberry uso Docker e vari servizi, tra cui dashboard sistema, Jellyfin, Immich, Nextcloud, Syncthing, Homepage, Portainer, Uptime Kuma e altri servizi personali.

Voglio creare una web app che mi permetta di **vedere graficamente tutti i dispositivi collegati alla mia rete domestica**, capire quali sono online, quali porte hanno aperte, quali servizi espongono e rilevare nuovi dispositivi sconosciuti.

L'obiettivo è imparare bene il networking e avere una mappa chiara della mia rete.

---

# Obiettivo dell'app

Creare una dashboard chiamata **Network Map** che mostri:

- Router
- Raspberry Pi
- PC
- Telefono
- TV
- NAS eventuale
- Dispositivi IoT
- Dispositivi Tailscale
- Servizi aperti
- IP usati
- Porte principali
- Stato online/offline dei dispositivi
- Nuovi dispositivi rilevati
- Storico dei dispositivi visti nel tempo

Deve esserci anche una **vista grafica tipo mappa/topologia di rete**, dove posso vedere i dispositivi come nodi collegati al router o alla rete.

Esempio concettuale:

```text
Internet
   |
Router 192.168.1.254
   |--- Raspberry 192.168.1.175
   |       |--- Jellyfin :8096
   |       |--- Nextcloud :8080
   |       |--- Immich :2283
   |       |--- Syncthing :8384
   |
   |--- PC Fabian 192.168.1.xxx
   |--- Telefono 192.168.1.xxx
   |--- Smart TV 192.168.1.xxx
```

---

# Stack tecnico desiderato

Preferisco usare:

- Backend: Node.js + Express
- Frontend: React oppure Angular, ma proponi tu la scelta più adatta
- Database leggero: SQLite
- Deploy: Docker Compose
- Sistema operativo: Ubuntu Server su Raspberry Pi
- Strumenti Linux/networking:
  - `nmap`
  - `arp`
  - `ip route`
  - `ip neigh`
  - `tailscale status`
  - `dig`
  - `ping`
  - eventualmente `ss` per le porte locali

L'app deve essere pensata per girare su Raspberry Pi, anche dentro Docker.

---

# Funzionalità principali

## 1. Scansione LAN

L'app deve poter scansionare la rete locale, per esempio:

```bash
nmap -sn 192.168.1.0/24
```

Deve rilevare:

- IP del dispositivo
- MAC address, se disponibile
- hostname, se disponibile
- vendor del MAC address, se disponibile
- stato online/offline
- ultimo momento in cui è stato visto
- primo momento in cui è stato visto

Deve usare anche:

```bash
ip neigh
arp -a
```

per arricchire i dati.

---

## 2. Rilevamento rete automatica

L'app deve capire automaticamente la rete LAN attiva usando:

```bash
ip route
ip addr
```

Esempio:

```text
Raspberry IP: 192.168.1.175
Gateway: 192.168.1.254
Subnet: 192.168.1.0/24
Interfaccia: eth0
```

Deve supportare anche il caso in cui ci siano più interfacce:

- `eth0`
- `wlan0`
- `tailscale0`
- `docker0`

Deve ignorare, quando serve, reti Docker come:

- `172.17.0.0/16`
- bridge network Docker

---

## 3. Dispositivi conosciuti e sconosciuti

Voglio poter assegnare un nome manuale ai dispositivi.

Esempio:

```json
{
  "ip": "192.168.1.175",
  "mac": "AA:BB:CC:DD:EE:FF",
  "displayName": "Raspberry Pi 5",
  "type": "server",
  "trusted": true,
  "icon": "raspberry",
  "notes": "Server principale homelab"
}
```

L'app deve distinguere:

- dispositivi conosciuti
- dispositivi nuovi
- dispositivi sconosciuti
- dispositivi offline
- dispositivi Tailscale
- router/gateway
- server principali

Se appare un nuovo dispositivo mai visto prima, deve creare un alert.

---

## 4. Storico dispositivi

Ogni scansione deve salvare dati nel database.

Per ogni dispositivo voglio vedere:

- prima apparizione
- ultima apparizione
- quante volte è stato visto
- IP usati nel tempo
- MAC address
- hostname
- vendor
- stato attuale
- storico online/offline

Esempio utile:

```text
Telefono Fabian
IP attuale: 192.168.1.42
Prima vista: 2026-06-30 10:12
Ultima vista: 2026-06-30 18:44
Stato: online
```

---

## 5. Scansione porte principali

Per i dispositivi conosciuti o selezionati, l'app deve poter eseguire una scansione porte leggera.

Esempio:

```bash
nmap -sV --top-ports 50 192.168.1.175
```

Oppure una scansione più sicura/leggera:

```bash
nmap -T3 --top-ports 30 192.168.1.175
```

Deve mostrare:

- porta
- protocollo
- stato
- servizio rilevato
- versione, se disponibile

Esempio:

```json
{
  "port": 8096,
  "protocol": "tcp",
  "state": "open",
  "service": "jellyfin",
  "description": "Jellyfin Media Server"
}
```

Per il Raspberry voglio evidenziare servizi come:

- SSH `22`
- HTTP `80`
- HTTPS `443`
- Jellyfin `8096`
- Nextcloud `8080`
- Immich `2283`
- Syncthing `8384`, `22000`
- Portainer `9000` o `9443`
- Uptime Kuma `3001`
- Homepage `3000`
- AdGuard Home `53`, `3000`, `8080` se presenti

---

## 6. Ping router e Internet

L'app deve controllare:

- ping verso router/gateway
- ping verso Internet, per esempio `1.1.1.1` o `8.8.8.8`
- risoluzione DNS verso domini comuni

Comandi possibili:

```bash
ping -c 3 192.168.1.254
ping -c 3 1.1.1.1
dig google.com
```

Deve mostrare:

- latenza media
- packet loss
- DNS OK/non OK
- stato Internet OK/non OK

---

## 7. Controllo DNS

Voglio una sezione DNS che mostri:

- DNS configurati sul Raspberry
- DNS da `/etc/resolv.conf`
- eventuale DNS Tailscale
- eventuale AdGuard Home
- test risoluzione dominio
- tempo di risposta DNS

Comandi utili:

```bash
cat /etc/resolv.conf
resolvectl status
dig google.com
dig @1.1.1.1 google.com
dig @192.168.1.254 google.com
```

L'app deve gestire il caso in cui `resolvectl` non esista, specialmente dentro Docker.

---

## 8. Tailscale

Se Tailscale è installato, l'app deve leggere:

```bash
tailscale status
tailscale ip
```

Deve mostrare:

- IP Tailscale del Raspberry
- nome dispositivo
- dispositivi collegati alla tailnet
- stato online/offline
- MagicDNS, se rilevabile
- exit node, se presente
- subnet route, se presente

I dispositivi Tailscale devono essere mostrati in una sezione separata oppure nella mappa grafica con colore/stile diverso.

---

# Vista grafica richiesta

Voglio una vera vista grafica della rete.

## Requisiti UI

Creare una pagina **Network Map Graph** dove i dispositivi sono nodi.

Nodo centrale:

- Router/gateway

Nodi collegati:

- Raspberry
- PC
- Telefono
- TV
- altri dispositivi LAN

Sotto il Raspberry, o collegati al Raspberry, mostrare i servizi principali:

- Jellyfin
- Immich
- Nextcloud
- Syncthing
- Homepage
- Portainer
- Uptime Kuma

## Librerie grafiche suggerite

Valuta una di queste:

- React Flow, se frontend React
- ngx-graph, se frontend Angular
- D3.js, se serve massima personalizzazione
- Cytoscape.js, se la topologia diventa più avanzata

Suggerisci la libreria migliore per il mio caso.

## Nodo dispositivo

Ogni nodo deve mostrare:

- icona tipo dispositivo
- nome
- IP
- stato online/offline
- eventuale badge nuovo/sconosciuto
- eventuale numero porte aperte

Esempio card nodo:

```text
Raspberry Pi 5
192.168.1.175
Online
Porte aperte: 7
```

## Colori/stati suggeriti

- Verde: online e conosciuto
- Giallo: nuovo dispositivo
- Rosso: offline o errore
- Grigio: offline storico
- Viola/blu: dispositivo Tailscale
- Arancione: servizio con porta aperta

## Interazioni

Cliccando su un dispositivo voglio vedere un pannello laterale con:

- nome
- tipo dispositivo
- IP
- MAC
- vendor
- hostname
- stato
- prima vista
- ultima vista
- porte aperte
- note
- pulsante per marcarlo come conosciuto
- pulsante per cambiare nome/icona
- pulsante per lanciare scansione porte solo su quel dispositivo

---

# API backend desiderate

Proponi e implementa API ordinate, per esempio:

## Network overview

```http
GET /api/network/overview
```

Ritorna:

```json
{
  "hostIp": "192.168.1.175",
  "gateway": "192.168.1.254",
  "interface": "eth0",
  "subnet": "192.168.1.0/24",
  "internet": {
    "status": "online",
    "latencyMs": 18
  },
  "dns": {
    "status": "ok",
    "servers": ["192.168.1.254", "1.1.1.1"]
  }
}
```

## Scan LAN

```http
POST /api/network/scan
```

Lancia scansione LAN e salva risultati.

## Devices list

```http
GET /api/network/devices
```

Ritorna tutti i dispositivi noti.

## Device detail

```http
GET /api/network/devices/:id
```

## Update device

```http
PATCH /api/network/devices/:id
```

Permette di modificare:

- nome visualizzato
- tipo
- icona
- trusted true/false
- note

## Scan device ports

```http
POST /api/network/devices/:id/scan-ports
```

Lancia scansione porte solo per quel dispositivo.

## Network graph

```http
GET /api/network/graph
```

Ritorna nodi e collegamenti per la vista grafica.

Esempio:

```json
{
  "nodes": [
    {
      "id": "router",
      "type": "router",
      "label": "Router",
      "ip": "192.168.1.254",
      "status": "online"
    },
    {
      "id": "raspberry",
      "type": "server",
      "label": "Raspberry Pi 5",
      "ip": "192.168.1.175",
      "status": "online"
    }
  ],
  "edges": [
    {
      "id": "router-raspberry",
      "source": "router",
      "target": "raspberry"
    }
  ]
}
```

## Alerts

```http
GET /api/network/alerts
```

Mostra nuovi dispositivi o problemi.

---

# Database SQLite

Proponi uno schema SQLite pulito.

Tabelle suggerite:

## devices

Campi:

- id
- ip
- mac
- hostname
- vendor
- display_name
- device_type
- icon
- trusted
- first_seen
- last_seen
- last_status
- notes
- source

## device_ip_history

Campi:

- id
- device_id
- ip
- first_seen
- last_seen

## port_scans

Campi:

- id
- device_id
- scanned_at
- scan_type

## open_ports

Campi:

- id
- port_scan_id
- port
- protocol
- state
- service
- version

## network_scans

Campi:

- id
- started_at
- finished_at
- subnet
- status
- devices_found

## alerts

Campi:

- id
- type
- severity
- title
- message
- device_id
- created_at
- read_at

---

# Sicurezza

L'app deve essere sicura perché userà comandi di rete.

Regole importanti:

- Non accettare comandi shell liberi dall'utente
- Usare solo comandi predefiniti
- Validare sempre IP e subnet
- Usare timeout per ogni comando shell
- Limitare scansioni aggressive
- Non fare scansioni fuori dalla LAN senza conferma/configurazione
- Loggare errori senza esporre dati sensibili
- Evitare `sudo` se non necessario
- Se servono permessi speciali, spiegare bene come configurarli

---

# Docker

L'app deve girare in Docker Compose.

Proponi un `docker-compose.yml` con:

- backend Node/Express
- frontend
- volume per database SQLite
- eventuale accesso read-only a file dell'host se necessario
- installazione strumenti come `nmap`, `iproute2`, `dnsutils`, `iputils-ping`, `net-tools`

Da valutare:

- usare `network_mode: host` per permettere scansione LAN più accurata
- oppure usare privilegi/capability minime necessarie

Spiega pro e contro di:

```yaml
network_mode: host
```

Per questa app probabilmente è utile, ma voglio capire bene rischi e vantaggi.

---

# UI desiderata

## Pagine frontend

1. **Overview**
   - stato Internet
   - gateway
   - DNS
   - numero dispositivi online
   - nuovi dispositivi
   - ultimi alert

2. **Network Map**
   - vista grafica con nodi e collegamenti
   - router centrale
   - Raspberry evidenziato
   - servizi collegati al Raspberry
   - dispositivi Tailscale separati o evidenziati

3. **Devices**
   - tabella dispositivi
   - filtri online/offline/nuovi/sconosciuti/trusted
   - ricerca per IP, MAC, nome

4. **Device Detail**
   - info complete dispositivo
   - porte aperte
   - storico
   - note
   - pulsanti azione

5. **Alerts**
   - nuovi dispositivi
   - DNS down
   - Internet down
   - router non raggiungibile

6. **Settings**
   - subnet da scansionare
   - intervallo scansione
   - dispositivi da ignorare
   - porte principali da controllare
   - nomi manuali dispositivi

---

# Output richiesto da Claude

Prima di scrivere codice, voglio che tu faccia:

1. Analisi del progetto
2. Scelta motivata dello stack frontend migliore
3. Architettura generale
4. Struttura cartelle consigliata
5. Schema database SQLite
6. Definizione API backend
7. Struttura JSON per la vista grafica
8. Design della UI Network Map
9. Strategia di scansione LAN sicura
10. Docker Compose consigliato
11. Lista dei pacchetti Linux necessari
12. Roadmap in versioni:
    - V1 minimale
    - V2 con mappa grafica
    - V3 con storico e alert
    - V4 con Tailscale e scansioni avanzate

Poi implementa una prima versione completa con:

- Backend Express
- Moduli separati per comandi di rete
- SQLite
- Endpoint principali
- Frontend con pagina Network Map grafica
- Lista dispositivi
- Pannello dettaglio dispositivo
- Docker Compose

---

# Priorità V1

La prima versione deve fare almeno questo:

- rilevare subnet LAN
- fare scan `nmap -sn`
- salvare dispositivi in SQLite
- mostrare lista dispositivi
- mostrare router + dispositivi in vista grafica
- evidenziare nuovi dispositivi
- permettere di rinominare un dispositivo
- mostrare IP, MAC, hostname, vendor e stato
- fare ping router/internet
- fare test DNS

---

# Nota importante

Non voglio una risposta generica.
Voglio codice e struttura realmente utilizzabili sul mio Raspberry.
Considera che il progetto dovrà essere deployato con Docker Compose e dovrà funzionare nella mia rete domestica.
