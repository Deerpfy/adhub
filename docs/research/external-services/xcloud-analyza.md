# Komplexni analyza xCloud: WordPress hosting control panel

> **Autor:** Deerpfy | **Datum:** Prosinec 2025  
> **Ucel:** Technicka analyza pro inspiraci k vytvoreni vlastniho reseni

---

## Obsah

1. [Prehled platformy](#1-prehled-platformy)
2. [Technicka architektura](#2-technicka-architektura)
3. [API a integrace](#3-api-a-integrace)
4. [Funkcionalita](#4-funkcionalita)
5. [Bezpecnost](#5-bezpecnost)
6. [Konkurencni srovnani](#6-konkurencni-srovnani)
7. [Implementace vlastniho reseni](#7-implementace-vlastniho-reseni)
8. [Zaver a doporuceni](#8-zaver-a-doporuceni)

---

## 1. Prehled platformy

### 1.1 Co je xCloud

xCloud je next-gen WordPress hosting control panel vyvinuly spolecnosti **WPDeveloper** ve spolupraci s **WPManageNinja** (tvurci FluentCRM, FluentForms). Zakladatelem je **M Asif Rahman** s temer 20letou zkusenosti v WordPress ekosystemu.

- **Spusteni:** Po 2 letech vyvoje
- **Materska spolecnost:** Startise (od unora 2024)
- **Aktivni vyvoj:** Aktualizace 1-2x mesicne
- **Posledni update:** Listopad 2025 - One-Click Apps pro self-hosted LLM modely

### 1.2 Klicove vlastnosti

```
[+] Centralizovana sprava neomezeneho poctu WordPress webu
[+] Podpora LEMP (Nginx) i OLS (OpenLiteSpeed) stacku
[+] Automaticke WordPress instalace, staging, migrace
[+] Bulk aktualizace s rollback moznosti
[+] White-label reseller modul s plnym brandingem
[+] Free tier - 1 server, 10 webu bez kreditni karty
```

### 1.3 Podporovani cloud provideri

| Provider | Typ integrace | Bonus kredity |
|----------|---------------|---------------|
| DigitalOcean | Automaticka (API) | $200 |
| Vultr | Automaticka (API) | $100 |
| AWS EC2 | Automaticka (API) | - |
| Google Cloud | Automaticka (API) | - |
| Linode/Akamai | Automaticka (API) | - |
| Hetzner | Automaticka (API) | - |
| Hostinger VPS | Automaticka (API) | - |
| Vlastni Ubuntu | Manualni (SSH) | - |

### 1.4 Cenove modely

#### Self-Managed (BYOS - Bring Your Own Server)

Platite pouze za control panel, VPS platite primo providerovi.

| Plan | Cena/server/mesic | Pocet serveru |
|------|-------------------|---------------|
| Free | $0 | 1 server, 10 webu |
| Starter | $5 | 1-5 serveru |
| Professional | $4 | 6-10 serveru |
| Agency | $3 | 10+ serveru |

#### Managed Hosting (hosting + panel)

| Plan | RAM | Storage | Cena/mesic |
|------|-----|---------|------------|
| Newcomer | 1 GB | 25 GB NVMe | $5 |
| Basic | 2 GB | 55 GB | $12 |
| Standard | 4 GB | 80 GB | $24 |
| Professional | 8 GB | 160 GB | $45 |
| Business | 16 GB | 320 GB | $88 |

#### Lifetime Deal (LTD)

Jednorazova platba za trvaly pristup k control panelu (bez hostingu).
LTD uzivatele ziskavaji 10% slevu na managed servery.

---

## 2. Technicka architektura

### 2.1 Zakladni pristup

xCloud pouziva **tradicni VPS pristup bez kontejnerizace**:

- Kazdy web je izolovan systemovym uzivatelem
- Zadna Docker/Kubernetes orchestrace
- Servery bezi na Ubuntu 20.04/22.04/24.04 LTS

### 2.2 Instalovany stack

#### LEMP Stack (vychozi)

```bash
# Komponenty instalovane pri provisioningu
nginx                  # Webserver s FastCGI caching
php-fpm               # PHP 7.4 - 8.4 (konfigurovatelne per-site)
mysql/mariadb         # Databaze s Adminer pro spravu
redis                 # Object caching
certbot               # Let's Encrypt SSL
fail2ban              # Intrusion prevention
ufw                   # Firewall
```

#### OpenLiteSpeed Stack (alternativa)

```bash
openlitespeed         # Webserver s nativni QUIC/HTTP3
lsphp                 # LiteSpeed PHP
litespeed-cache       # Full-page caching plugin (auto-install)
```

### 2.3 Provisioning mechanismus

xCloud **nepouziva Terraform ani Ansible** - misto toho vyuziva vlastni skripty pres SSH.

```
Workflow vytvoreni serveru:
==========================

1. [API Request]     Uzivatel pripoji cloud provider API klic
                            |
                            v
2. [Cloud API]       xCloud vola provider API pro vytvoreni instance
                            |
                            v
3. [Wait Loop]       Polling dokud instance neni active
                            |
                            v
4. [SSH Connect]     Pripojeni pres SSH po aktivaci
                            |
                            v
5. [Init Scripts]    Spusteni inicializacnich skriptu
                            |
                            v
6. [Security]        Konfigurace Fail2ban, UFW, 7G/8G WAF
                            |
                            v
7. [Ready]           Server pripraven k pouziti
```

### 2.4 Caching architektura

```
                    +------------------+
                    |    Cloudflare    |  <-- CDN/WAF vrstva
                    +--------+---------+
                             |
                    +--------v---------+
                    |  Nginx FastCGI   |  <-- Full-page cache
                    |  nebo LSCache    |
                    +--------+---------+
                             |
                    +--------v---------+
                    |   Redis/OPcache  |  <-- Object + bytecode
                    +--------+---------+
                             |
                    +--------v---------+
                    |    PHP-FPM       |
                    +--------+---------+
                             |
                    +--------v---------+
                    |  MySQL/MariaDB   |
                    +------------------+
```

---

## 3. API a integrace

### 3.1 Absence verejneho REST API

**KRITICKE ZJISTENI:** xCloud aktualne **neposkytuje dokumentovane verejne REST API** pro programaticky pristup.

```
Dostupne API integrace (interni):
================================
[x] Cloud provider API klice (Vultr, DO, AWS, GCP, Hetzner)
[x] Cloudflare API Token + Origin CA Key
[x] Email sluzby API (Mailgun, SendGrid)
[x] Backup storage API (S3, R2, Wasabi, Backblaze)

Chybejici:
==========
[ ] Verejne REST API pro spravu serveru
[ ] Verejne REST API pro spravu webu
[ ] Webhook pro externi automatizaci
[ ] GraphQL endpoint
[ ] CLI nastroj
```

### 3.2 Git Deployment (od zari 2025)

```yaml
# Podporovane provideri
git_providers:
  - github        # Public i private repozitare
  - gitlab        # (planovano)
  - bitbucket     # (planovano)

# Funkcionalita
features:
  push_to_deploy: true
  deployment_url: "xCloud generuje webhook URL"
  post_deploy_scripts: true
  ssh_deploy_keys: true  # Pro private repos
```

### 3.3 CLI alternativy

```bash
# xCloud nema vlastni CLI, ale nabizi:

# 1. Command Runner v dashboardu
# 2. WP-CLI predinstalovan na vsech serverech
wp plugin list --status=active

# 3. Full SSH/SFTP pristup
ssh user@server.example.com
```

### 3.4 Integrovane sluzby

```
+------------------+----------------------------------------+
| Kategorie        | Sluzby                                 |
+------------------+----------------------------------------+
| DNS/CDN          | Cloudflare (primarni), QUIC.cloud      |
+------------------+----------------------------------------+
| Email            | xCloud Managed Email, Mailgun,         |
|                  | SendGrid, Elastic Email                |
+------------------+----------------------------------------+
| Backup storage   | Google Drive, AWS S3, R2, Wasabi,      |
|                  | Backblaze, pCloud                      |
+------------------+----------------------------------------+
| Notifikace       | Slack, WhatsApp, Telegram              |
+------------------+----------------------------------------+
| Security         | Patchstack (Site Security PRO)         |
+------------------+----------------------------------------+
| One-Click Apps   | n8n, Uptime Kuma, phpMyAdmin,          |
|                  | Nextcloud, LibreChat, LLM modely       |
+------------------+----------------------------------------+
```

---

## 4. Funkcionalita

### 4.1 Server Management

```
Zakladni operace:
=================
[x] Vytvoreni serveru z cloud provideru
[x] Pripojeni existujiciho Ubuntu serveru
[x] Restart/Stop/Start server
[x] Zmena PHP verze (global i per-site)
[x] Prepinani LEMP <-> OLS stack
[x] SSH key management
[x] Server monitoring (CPU, RAM, Disk)

Pokrocile:
==========
[x] Multi-server management z jednoho dashboardu
[x] Server klonování
[x] Automatic scaling (limitovane)
```

### 4.2 WordPress Management

```
Site operace:
=============
[x] One-click WordPress instalace
[x] Staging environment
[x] Site klonování (intra i inter-server)
[x] Migrace z jineho hostingu
[x] Push staging -> production
[x] Magic Login (bez hesla)

Aktualizace:
============
[x] Bulk update plugins/themes/core
[x] Vulnerability scanner
[x] Auto-updates s moznosti vyjimek
[x] Rollback po neuspesnem update

Databaze:
=========
[x] phpMyAdmin / Adminer pristup
[x] Database backup/restore
[x] Search & Replace (URL zmeny)
```

### 4.3 SSL a domeny

```
SSL Management:
===============
[x] Let's Encrypt automaticka instalace
[x] Wildcard certifikaty (pres Cloudflare DNS)
[x] Cloudflare Origin CA
[x] Custom SSL upload
[x] Force HTTPS redirect
[x] Auto-renewal

DNS:
====
[x] Cloudflare DNS integrace
[x] Automaticka DNS konfigurace
[ ] Route53 integrace (CHYBI)
[ ] Vlastni DNS server (CHYBI)
```

### 4.4 Backup system

```
Typy zaloh:
===========
[x] Full server backup
[x] Per-site backup
[x] Database-only backup
[x] Scheduled backups (denni/tydenni/mesicni)
[x] On-demand backup

Storage provideri:
==================
[x] Local server storage
[x] Google Drive
[x] AWS S3
[x] Cloudflare R2
[x] Wasabi
[x] Backblaze B2
[x] pCloud

Restore:
========
[x] One-click restore
[x] Partial restore (files/database)
[x] Download backup lokalne
```

### 4.5 Email Management

```
xCloud Managed Email:
=====================
Cena: $1/mesic per mailbox
Funkce:
  - Webmail pristup
  - SMTP/IMAP/POP3
  - SPF/DKIM/DMARC konfigurace
  - Spam filtering

Externi integrace:
==================
[x] Mailgun (transakcni)
[x] SendGrid
[x] Elastic Email
[x] Amazon SES
```

### 4.6 White-label Reseller

```
Branding moznosti:
==================
[x] Custom domena pro panel (panel.yourdomain.com)
[x] Custom logo a barvy
[x] Odstraneni xCloud brandingu
[x] Custom email notifikace
[x] Custom invoice branding

Billing:
========
[x] WHMCS integrace
[x] Custom pricing pro klienty
[x] Automaticka fakturace
```

---

## 5. Bezpecnost

### 5.1 Firewall a WAF

```bash
# UFW konfigurace (vychozi)
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp      # SSH
ufw allow 80/tcp      # HTTP
ufw allow 443/tcp     # HTTPS
ufw allow 34210/tcp   # xCloud agent

# 7G/8G WAF pravidla v Nginx
# Ochrana proti:
# - SQL Injection
# - XSS (Cross-Site Scripting)
# - RCE (Remote Code Execution)
# - Path Traversal
# - Bad Bots
```

### 5.2 Fail2ban konfigurace

```ini
# /etc/fail2ban/jail.local
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 5
bantime = 3600
findtime = 600

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 5
```

### 5.3 SSH Hardening

```
Bezpecnostni opatreni:
======================
[x] SSH key management v dashboardu
[x] Moznost zakazat password authentication
[x] Per-site SFTP pristupy s izolovanymi uzivateli
[x] Generovani deploy keys pro Git
[x] Fail2ban ochrana SSH

Doporucena konfigurace:
=======================
PasswordAuthentication no
PermitRootLogin no
PubkeyAuthentication yes
```

### 5.4 WordPress Security

```
Integrovane nastroje:
=====================
[x] Vulnerability Scanner (core, themes, plugins)
[x] Bulk security updates
[x] Magic Login (bez odhaleni hesla)
[x] Site Security PRO (Patchstack) - $2/mesic
[x] Malware scanning
[x] File integrity monitoring

Automaticke aktualizace:
========================
[x] WordPress core minor updates
[x] Plugin security patches
[x] Theme security patches
[x] Konfigurovatelne vyjimky
```

### 5.5 Autentizace a autorizace

```
Dashboard security:
===================
[x] Two-Factor Authentication (2FA) - TOTP
[x] Session management
[x] Login history

Team management:
================
[x] Neomezeny pocet clenu tymu
[x] Granularni opravneni (RBAC)
[x] Per-server/per-site pristupy
[x] Audit log aktivit
```

---

## 6. Konkurencni srovnani

### 6.1 Komercni alternativy

```
+---------------+----------+----------+-----+-------------+------------------+
| Panel         | Min.cena | WP Focus | API | Multi-tenant| Idealni pro      |
+---------------+----------+----------+-----+-------------+------------------+
| xCloud        | $5/mo    | *****    | NO  | YES         | WP agentury      |
| RunCloud      | $6.67/mo | ****     | YES | NO          | Multi-framework  |
| SpinupWP      | $12/mo   | *****    | NO  | Partial     | WP puriste       |
| Ploi.io       | ~$8/mo   | ***      | YES | NO          | Laravel devs     |
| Laravel Forge | $12/mo   | **       | YES | NO          | Laravel projekty |
| GridPane      | $50/mo   | *****    | YES | YES         | Enterprise       |
| Cloudways     | $11/mo   | ****     | YES | NO          | Zacatecnici      |
+---------------+----------+----------+-----+-------------+------------------+
```

### 6.2 Open-source alternativy

```
+-------------+-----------+-------+------------+-------------------------+
| Panel       | WordPress | Email | Multi-srv  | Technologie             |
+-------------+-----------+-------+------------+-------------------------+
| CloudPanel  | ***       | NO    | NO         | Nginx, PHP-FPM, light   |
| HestiaCP    | ***       | YES   | NO         | Nginx/Apache, Exim      |
| CyberPanel  | ****      | YES   | NO         | OpenLiteSpeed, REST API |
| WordOps     | *****     | NO    | NO         | CLI-only, Nginx HTTP/3  |
| ISPConfig   | **        | YES   | YES        | Jediny free multi-srv   |
+-------------+-----------+-------+------------+-------------------------+
```

### 6.3 SWOT analyza xCloud

```
STRENGTHS (Silne stranky):
==========================
+ Nejnizsi vstupni bod ($5/mo) mezi komercnimi panely
+ Lifetime Deal - jednorazova platba
+ Kompletni white-label pro resellery
+ Vulnerability scanner a bulk updates
+ Team management bez limitu clenu

WEAKNESSES (Slabe stranky):
===========================
- Absence REST API (kriticke pro DevOps)
- Pouze WordPress/PHP (zadny Node.js, Python)
- Relativne nova platforma
- DNS pouze pres Cloudflare

OPPORTUNITIES (Prilezitosti):
=============================
+ Rostouci trh WordPress agentur
+ Poptavka po cenove dostupnych reSenich
+ Prostor pro API pridani

THREATS (Hrozby):
=================
- Konkurence s etablovanymi hracI (RunCloud, GridPane)
- Open-source alternativy (WordOps, CloudPanel)
- Cloudways s masivnim marketingem
```

---

## 7. Implementace vlastniho reseni

### 7.1 Doporuceny technologicky stack

```
BACKEND:
========
Primary:     Laravel 11 (PHP 8.3+)
             - API endpoints
             - Business logika
             - Queue management (Laravel Horizon)
             
Agent:       Go 1.21+
             - Server agent pro monitoring
             - Prikazy a akce na serveru
             - Nizke naroky na resources
             
Database:    PostgreSQL 16
             - Multi-tenant s tenant_id izolaci
             - JSONB pro flexibilni metadata
             
Cache/Queue: Redis 7
             - Session storage
             - Queue backend
             - Object caching
             
Search:      Meilisearch
             - Fulltextove vyhledavani
             - Filtry a facety

FRONTEND:
=========
Framework:   Vue.js 3 nebo React 18
Styling:     TailwindCSS 3
Real-time:   Laravel Echo + Pusher/Socket.io
State:       Pinia (Vue) nebo Zustand (React)

PROVISIONING:
=============
Infrastructure: Terraform
                - Vytvoreni cloud resources
                - State management
                
Configuration:  Ansible
                - Server setup playbooks
                - Idempotentni konfigurace
                
Secrets:        HashiCorp Vault
                - API klice
                - Credentials
```

### 7.2 Cloud provider integrace

```php
<?php
// Priklad: DigitalOcean integrace

namespace App\Services\CloudProviders;

use DigitalOceanV2\Client;
use DigitalOceanV2\Entity\Droplet;

class DigitalOceanService implements CloudProviderInterface
{
    private Client $client;
    
    public function __construct(string $apiToken)
    {
        $this->client = new Client();
        $this->client->authenticate($apiToken);
    }
    
    public function createServer(ServerConfig $config): Server
    {
        $droplet = $this->client->droplet()->create(
            name: $config->name,
            region: $config->region,        // 'nyc3'
            size: $config->size,            // 's-1vcpu-1gb'
            image: 'ubuntu-22-04-x64',
            sshKeys: [$config->sshKeyId],
            backups: $config->backups,
            monitoring: true,
            tags: ['xcloud', $config->tenantId]
        );
        
        return $this->mapToServer($droplet);
    }
    
    public function waitForActive(int $dropletId, int $timeout = 300): bool
    {
        $start = time();
        
        while (time() - $start < $timeout) {
            $droplet = $this->client->droplet()->getById($dropletId);
            
            if ($droplet->status === 'active') {
                return true;
            }
            
            sleep(5);
        }
        
        return false;
    }
    
    public function deleteServer(int $dropletId): bool
    {
        $this->client->droplet()->delete($dropletId);
        return true;
    }
}
```

```php
<?php
// Abstraktni provider interface

namespace App\Services\CloudProviders;

interface CloudProviderInterface
{
    public function createServer(ServerConfig $config): Server;
    public function deleteServer(int $serverId): bool;
    public function getServer(int $serverId): ?Server;
    public function listServers(): array;
    public function resizeServer(int $serverId, string $newSize): bool;
    public function rebootServer(int $serverId): bool;
    public function getAvailableRegions(): array;
    public function getAvailableSizes(): array;
}
```

### 7.3 Server provisioning workflow

```php
<?php
// Laravel Job pro provisioning

namespace App\Jobs;

use App\Models\Server;
use App\Services\CloudProviders\CloudProviderFactory;
use App\Services\Provisioning\AnsibleRunner;
use App\Services\Provisioning\SshService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;

class ProvisionServerJob implements ShouldQueue
{
    use Queueable;
    
    public int $tries = 3;
    public int $timeout = 1800; // 30 minut
    
    public function __construct(
        private Server $server,
        private array $config
    ) {}
    
    public function handle(): void
    {
        // 1. Vytvoreni instance u providera
        $this->updateStatus('creating_instance');
        $provider = CloudProviderFactory::make($this->server->provider);
        $instance = $provider->createServer($this->config);
        
        $this->server->update([
            'external_id' => $instance->id,
            'ip_address' => $instance->ip,
        ]);
        
        // 2. Cekani na aktivni stav
        $this->updateStatus('waiting_for_active');
        $provider->waitForActive($instance->id);
        
        // 3. Cekani na SSH
        $this->updateStatus('waiting_for_ssh');
        $ssh = new SshService($instance->ip, $this->config['ssh_key']);
        $ssh->waitForConnection(timeout: 120);
        
        // 4. Spusteni Ansible playbooku
        $this->updateStatus('running_ansible');
        $ansible = new AnsibleRunner();
        $ansible->runPlaybook('server-setup.yml', [
            'target_host' => $instance->ip,
            'php_version' => $this->config['php_version'] ?? '8.3',
            'web_server' => $this->config['web_server'] ?? 'nginx',
            'mysql_root_password' => $this->config['mysql_password'],
        ]);
        
        // 5. Instalace agenta
        $this->updateStatus('installing_agent');
        $ssh->execute('curl -sSL https://panel.example.com/install-agent.sh | bash');
        
        // 6. Health check
        $this->updateStatus('health_check');
        $this->runHealthChecks();
        
        // 7. Dokonceno
        $this->server->update(['status' => 'active']);
        
        // Webhook notifikace
        event(new ServerProvisioned($this->server));
    }
    
    private function updateStatus(string $status): void
    {
        $this->server->update(['provisioning_status' => $status]);
        broadcast(new ServerStatusUpdated($this->server));
    }
}
```

### 7.4 Ansible playbook struktura

```yaml
# server-setup.yml
---
- name: Setup xCloud Server
  hosts: "{{ target_host }}"
  become: yes
  vars:
    php_version: "8.3"
    web_server: "nginx"
    
  roles:
    - role: base-security
      tags: [security]
      
    - role: nginx
      when: web_server == "nginx"
      tags: [webserver]
      
    - role: openlitespeed
      when: web_server == "ols"
      tags: [webserver]
      
    - role: php
      tags: [php]
      
    - role: mysql
      tags: [database]
      
    - role: redis
      tags: [cache]
      
    - role: ssl
      tags: [ssl]
      
    - role: monitoring-agent
      tags: [monitoring]
```

```yaml
# roles/base-security/tasks/main.yml
---
- name: Update apt cache
  apt:
    update_cache: yes
    cache_valid_time: 3600

- name: Install essential packages
  apt:
    name:
      - ufw
      - fail2ban
      - unattended-upgrades
      - curl
      - wget
      - git
      - htop
      - vim
    state: present

- name: Configure UFW defaults
  ufw:
    direction: "{{ item.direction }}"
    policy: "{{ item.policy }}"
  loop:
    - { direction: 'incoming', policy: 'deny' }
    - { direction: 'outgoing', policy: 'allow' }

- name: Allow required ports
  ufw:
    rule: allow
    port: "{{ item }}"
    proto: tcp
  loop:
    - '22'
    - '80'
    - '443'
    - '34210'

- name: Enable UFW
  ufw:
    state: enabled

- name: Configure Fail2ban
  template:
    src: jail.local.j2
    dest: /etc/fail2ban/jail.local
  notify: restart fail2ban

- name: Disable password authentication
  lineinfile:
    path: /etc/ssh/sshd_config
    regexp: '^PasswordAuthentication'
    line: 'PasswordAuthentication no'
  notify: restart sshd
```

### 7.5 Multi-tenant architektura

```php
<?php
// Database schema - PostgreSQL

// migrations/create_tenants_table.php
Schema::create('tenants', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->string('name');
    $table->string('slug')->unique();
    $table->string('plan')->default('free');
    $table->json('settings')->nullable();
    $table->json('quotas')->nullable();
    $table->timestamps();
    $table->softDeletes();
});

// migrations/create_servers_table.php
Schema::create('servers', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
    $table->string('name');
    $table->string('provider'); // digitalocean, vultr, aws, etc.
    $table->string('external_id')->nullable();
    $table->string('ip_address')->nullable();
    $table->string('status')->default('pending');
    $table->string('provisioning_status')->nullable();
    $table->string('region');
    $table->string('size');
    $table->string('web_server')->default('nginx');
    $table->string('php_version')->default('8.3');
    $table->json('metadata')->nullable();
    $table->timestamps();
    $table->softDeletes();
    
    $table->index(['tenant_id', 'status']);
});

// migrations/create_sites_table.php
Schema::create('sites', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
    $table->foreignUuid('server_id')->constrained()->cascadeOnDelete();
    $table->string('name');
    $table->string('domain');
    $table->string('type')->default('wordpress'); // wordpress, laravel, php
    $table->string('status')->default('pending');
    $table->string('php_version')->nullable();
    $table->boolean('ssl_enabled')->default(false);
    $table->json('settings')->nullable();
    $table->timestamps();
    $table->softDeletes();
    
    $table->unique(['server_id', 'domain']);
    $table->index(['tenant_id', 'status']);
});
```

```php
<?php
// Tenant Scope pro automatickou izolaci

namespace App\Models\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

class TenantScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        if (auth()->check() && auth()->user()->tenant_id) {
            $builder->where(
                $model->getTable() . '.tenant_id',
                auth()->user()->tenant_id
            );
        }
    }
}

// Trait pro modely
namespace App\Models\Traits;

use App\Models\Scopes\TenantScope;

trait BelongsToTenant
{
    protected static function bootBelongsToTenant(): void
    {
        static::addGlobalScope(new TenantScope);
        
        static::creating(function ($model) {
            if (auth()->check() && !$model->tenant_id) {
                $model->tenant_id = auth()->user()->tenant_id;
            }
        });
    }
    
    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}

// Pouziti v modelu
class Server extends Model
{
    use BelongsToTenant;
    
    // Vsechny dotazy automaticky filtrovany podle tenant_id
}
```

### 7.6 REST API design

```php
<?php
// routes/api.php

use App\Http\Controllers\Api\V1;

Route::prefix('v1')->middleware(['auth:sanctum', 'tenant'])->group(function () {
    
    // Servers
    Route::apiResource('servers', V1\ServerController::class);
    Route::post('servers/{server}/reboot', [V1\ServerController::class, 'reboot']);
    Route::post('servers/{server}/services/{service}/restart', [V1\ServerController::class, 'restartService']);
    
    // Sites
    Route::apiResource('servers.sites', V1\SiteController::class)->shallow();
    Route::post('sites/{site}/deploy', [V1\SiteController::class, 'deploy']);
    Route::post('sites/{site}/ssl', [V1\SiteController::class, 'installSsl']);
    Route::post('sites/{site}/staging', [V1\SiteController::class, 'createStaging']);
    
    // Backups
    Route::apiResource('sites.backups', V1\BackupController::class)->shallow();
    Route::post('backups/{backup}/restore', [V1\BackupController::class, 'restore']);
    
    // Databases
    Route::apiResource('servers.databases', V1\DatabaseController::class)->shallow();
    
    // SSH Keys
    Route::apiResource('ssh-keys', V1\SshKeyController::class);
    
    // Webhooks
    Route::apiResource('webhooks', V1\WebhookController::class);
});
```

```php
<?php
// Priklad API response

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ServerResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'provider' => $this->provider,
            'ip_address' => $this->ip_address,
            'status' => $this->status,
            'region' => $this->region,
            'size' => $this->size,
            'web_server' => $this->web_server,
            'php_version' => $this->php_version,
            'sites_count' => $this->whenCounted('sites'),
            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
            
            // HATEOAS links
            '_links' => [
                'self' => route('api.v1.servers.show', $this->id),
                'sites' => route('api.v1.servers.sites.index', $this->id),
                'reboot' => route('api.v1.servers.reboot', $this->id),
            ],
        ];
    }
}
```

### 7.7 Bezpecnostni checklist

```
MUST HAVE:
==========
[x] UFW s default deny policy
[x] Fail2ban pro SSH, Nginx, aplikacni logy
[x] SSH key-only authentication
[x] 2FA pro vsechny admin ucty (TOTP/WebAuthn)
[x] RBAC s principem least privilege
[x] Encryption at rest (database) i in transit (TLS 1.3)
[x] Audit logging vsech destruktivnich akci
[x] Rate limiting na API endpointy
[x] Secrets management (Vault, AWS Secrets Manager)
[x] CSRF ochrana
[x] SQL injection prevence (prepared statements)
[x] XSS ochrana (output escaping)

SHOULD HAVE:
============
[ ] Security headers (CSP, HSTS, X-Frame-Options)
[ ] Dependency vulnerability scanning
[ ] Penetration testing
[ ] Bug bounty program
[ ] SOC 2 compliance
```

### 7.8 Monitoring a observability

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
      
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=secret
      
  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
      
  node_exporter:
    image: prom/node-exporter:latest
    ports:
      - "9100:9100"
```

```go
// Server agent v Go

package main

import (
    "encoding/json"
    "net/http"
    "os/exec"
    "runtime"
    "time"
    
    "github.com/shirou/gopsutil/v3/cpu"
    "github.com/shirou/gopsutil/v3/disk"
    "github.com/shirou/gopsutil/v3/mem"
)

type SystemMetrics struct {
    CPUUsage    float64   `json:"cpu_usage"`
    MemoryUsage float64   `json:"memory_usage"`
    DiskUsage   float64   `json:"disk_usage"`
    Uptime      int64     `json:"uptime"`
    Timestamp   time.Time `json:"timestamp"`
}

func collectMetrics() SystemMetrics {
    cpuPercent, _ := cpu.Percent(time.Second, false)
    memInfo, _ := mem.VirtualMemory()
    diskInfo, _ := disk.Usage("/")
    
    return SystemMetrics{
        CPUUsage:    cpuPercent[0],
        MemoryUsage: memInfo.UsedPercent,
        DiskUsage:   diskInfo.UsedPercent,
        Timestamp:   time.Now(),
    }
}

func metricsHandler(w http.ResponseWriter, r *http.Request) {
    metrics := collectMetrics()
    json.NewEncoder(w).Encode(metrics)
}

func main() {
    http.HandleFunc("/metrics", metricsHandler)
    http.HandleFunc("/health", healthHandler)
    http.HandleFunc("/execute", executeHandler) // Pro prikazy z panelu
    
    http.ListenAndServe(":34210", nil)
}
```

---

## 8. Zaver a doporuceni

### 8.1 Hodnoceni xCloud

```
Celkove hodnoceni: 7.5/10

Silne stranky:
+ Cenova dostupnost ($5/mo nejnizsi vstupni bod)
+ Lifetime Deal model
+ Kompletni white-label pro resellery
+ WordPress-specificke funkce (vulnerability scanner, bulk updates)
+ Team management bez limitu

Slabe stranky:
- Absence REST API (kriticke pro DevOps workflow)
- Pouze WordPress/PHP stack
- DNS vyzaduje Cloudflare
- Relativne nova platforma
```

### 8.2 Doporuceni pro vlastni implementaci

```
1. ARCHITEKTURA
   - Laravel 11 + PostgreSQL + Redis jako zaklad
   - Go agent pro server-side operace
   - Terraform + Ansible pro IaC od zacatku
   - Multi-tenant design od prvni verze

2. DIFERENCIACE OD xCloud
   - REST API jako priorita c. 1
   - GraphQL jako alternativa
   - CLI nastroj pro DevOps
   - Podpora vice runtime (Node.js, Python)
   - Multi-DNS provider integrace

3. OPEN-SOURCE INSPIRACE
   - CloudPanel zdrojovy kod
   - HestiaCP architektura
   - WordOps pro optimalizovany WP stack
   - Coolify pro Docker-based pristup

4. MVP SCOPE
   - 3 cloud provideri (DO, Vultr, Hetzner)
   - LEMP stack only
   - WordPress + Laravel site types
   - Basic backup (local + S3)
   - Let's Encrypt SSL
   - REST API od zacatku
```

### 8.3 Odhadovany cas vyvoje MVP

```
+---------------------------+----------+
| Komponenta                | Cas      |
+---------------------------+----------+
| Backend API + DB          | 4-6 tynu |
| Frontend dashboard        | 3-4 tyny |
| Cloud provider integrace  | 2-3 tyny |
| Ansible playbooks         | 2-3 tyny |
| Server agent (Go)         | 2 tyny   |
| SSL + DNS                 | 1 tyden  |
| Backup system             | 1-2 tyny |
| Testing + bugfixes        | 2-3 tyny |
+---------------------------+----------+
| CELKEM                    | 17-24 tynu |
+---------------------------+----------+
```

---

## Reference a zdroje

```
Oficialni:
- https://xcloud.host/
- https://xcloud.host/docs/
- https://xcloud.host/features/

WPDeveloper:
- https://wpdeveloper.com/why-we-built-xcloud/

Recenze:
- https://onlinemediamasters.com/xcloud-review/
- https://daveswift.com/xcloud/
- https://ahoi.dev/xcloud-wordpress-hosting-server-management/

Konkurence:
- https://runcloud.io/
- https://gridpane.com/
- https://spinupwp.com/
- https://ploi.io/

Open-source:
- https://www.cloudpanel.io/
- https://hestiacp.com/
- https://wordops.net/
- https://cyberpanel.net/
```

---

*Dokument vytvoren pro ucely technicke analyzy a inspirace k vyvoji vlastniho reseni.*
