# vzcli

<p align="center">
  <img src="https://img.shields.io/npm/v/vzcli.svg" alt="npm Version">
  <img src="https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg" alt="Node.js 16+">
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT">
  <img src="https://img.shields.io/badge/platform-linux%20%7C%20macos%20%7C%20windows-lightgrey" alt="Platform">
  <img src="https://img.shields.io/npm/dw/vzcli" alt="npm Downloads">
</p>

CLI tool for managing Virtualizor VPS domain/port forwarding with multi-host support and rich terminal interface.

**[🇮🇩 Baca dalam Bahasa Indonesia](README_ID.md)**

## Features

| Feature | Description |
|---------|-------------|
| **Multi-Host Support** | Manage multiple Virtualizor servers from a single interface |
| **Rich Terminal UI** | Beautiful output with colors, tables, spinners, and progress bars |
| **Secure Credentials** | OS keyring integration with AES encryption fallback |
| **Connection Testing** | Test all hosts with response time display |
| **CRUD Operations** | Complete forwarding rule management |
| **Batch Operations** | Import/export rules in JSON format |
| **Interactive Mode** | Step-by-step prompts for beginners |
| **Auto-completion** | Smart VM and rule selection |

## Requirements

- Node.js 16.0.0 or newer
- Access to Virtualizor Panel with API credentials
- Network access to Virtualizor server

## Installation

### From npm (Recommended)

```bash
npm install -g vzcli
```

### From Source

```bash
git clone https://github.com/iam-rizz/vzcli.js.git
cd vzcli.js
npm install
npm link
```

### Verify Installation

```bash
vzcli --help
```

## Quick Start

```bash
# 1. Add host configuration
vzcli config add production \
  --url "https://panel.example.com:4083/index.php" \
  --key "YOUR_API_KEY" \
  --pass "YOUR_API_PASSWORD" \
  --default

# 2. Test connection
vzcli config test

# 3. List VMs
vzcli vm list

# 4. Add forwarding rule (interactive)
vzcli forward add -i
```

## Usage

### Version & Information

```bash
# Show version
vzcli --version
vzcli -V

# Show detailed information
vzcli about

# Check for updates
vzcli update
```

### 1. Configuration Management

#### Add Host Profile

```bash
# Interactive mode (recommended)
vzcli config add -i

# Direct mode
vzcli config add production \
  --url "https://panel.com:4083/index.php" \
  --key "apikey" \
  --pass "password" \
  --default
```

#### Manage Host Profiles

```bash
# List all hosts
vzcli config list

# Set default host
vzcli config set-default production

# Test connection (all hosts)
vzcli config test

# Test specific host
vzcli config test staging

# Remove host
vzcli config remove staging
```

#### Use Specific Host

```bash
# Use --host or -H for operations with specific host
vzcli --host staging vm list
vzcli -H production forward list --vpsid 103
```

### 2. Virtual Machine Management

```bash
# List all VMs
vzcli vm list

# Filter by status
vzcli vm list --status up      # Only running VMs
vzcli vm list --status down    # Only stopped VMs

# List VMs from all hosts
vzcli vm list --all-hosts

# List running VMs from all hosts
vzcli vm list --all-hosts --status up

# JSON output (for scripting)
vzcli vm list --json
vzcli vm list --status up --json
```

### 3. Port Forwarding Management

#### List Forwarding Rules

```bash
# Interactive (select VM from list)
vzcli forward list -i

# Direct to specific VM
vzcli forward list --vpsid 103
vzcli forward list -v 103

# Auto-select if only 1 VM
vzcli forward list --auto

# JSON output
vzcli forward list --vpsid 103 --json
```

#### Add Forwarding Rule

```bash
# Interactive mode (recommended)
vzcli forward add -i

# HTTP Forwarding (auto port 80)
vzcli forward add --vpsid 103 --protocol HTTP --domain app.example.com

# HTTPS Forwarding (auto port 443)
vzcli forward add --vpsid 103 --protocol HTTPS --domain secure.example.com

# TCP Forwarding (custom ports)
vzcli forward add \
  --vpsid 103 \
  --protocol TCP \
  --domain 45.158.126.xxx \
  --src-port 2222 \
  --dest-port 22

# Short options
vzcli forward add -v 103 -p HTTP -d app.example.com
vzcli forward add -v 103 -p TCP -d 45.158.126.xxx -s 2222 -t 22
```

#### Edit Forwarding Rule

```bash
# Interactive mode
vzcli forward edit -i

# Edit protocol (auto-update ports)
vzcli forward edit --vpsid 103 --vdfid 596 --protocol HTTPS

# Edit domain
vzcli forward edit --vpsid 103 --vdfid 596 --domain new.example.com

# Edit ports
vzcli forward edit --vpsid 103 --vdfid 596 --src-port 8080 --dest-port 80
```

#### Delete Forwarding Rule

```bash
# Interactive mode (with confirmation)
vzcli forward delete -i

# Delete single rule (with confirmation)
vzcli forward delete --vpsid 103 --vdfid 596

# Delete multiple rules
vzcli forward delete --vpsid 103 --vdfid 596,597,598

# Delete without confirmation
vzcli forward delete --vpsid 103 --vdfid 596 --force
```

### 4. Batch Operations

#### Export Rules

```bash
# Export to JSON file
vzcli batch export --vpsid 103 --output rules.json
vzcli batch export -v 103 -o backup.json
```

#### Import Rules

```bash
# Import from JSON file
vzcli batch import --vpsid 103 --file rules.json

# Dry run (validate without executing)
vzcli batch import --vpsid 103 --file rules.json --dry-run

# Short options
vzcli batch import -v 103 -f rules.json
```

#### Generate Template

```bash
# Generate import template
vzcli batch template --output template.json
```

## Configuration

### Config File Location

- **Linux/macOS**: `~/.config/vzcli/config.json`
- **Windows**: `%APPDATA%\vzcli\config.json`

### Security

Credentials are stored securely using:

1. **OS Keyring** (Primary) - macOS Keychain, Windows Credential Store, Linux Secret Service
2. **AES Encryption** (Fallback) - Machine-specific key encryption
3. **Interactive Prompt** (Last resort) - Prompt every time

### Batch Import/Export Format

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

## Commands Reference

### Global Options

| Option | Short | Description |
|--------|-------|-------------|
| `--version` | `-V` | Show version and exit |
| `--host NAME` | `-H` | Use specific host profile |
| `--no-color` | | Disable colored output |
| `--verbose` | `-v` | Verbose output |
| `--debug` | | Debug mode (show stack traces) |
| `--help` | `-h` | Show help |

### Commands

| Command | Description |
|---------|-------------|
| `vzcli about` | Show version and author information |
| `vzcli update` | Check for updates from npm registry |
| `vzcli config <action>` | Manage host configurations |
| `vzcli vm <action>` | Manage virtual machines |
| `vzcli forward <action>` | Manage forwarding rules |
| `vzcli batch <action>` | Batch operations |

## Examples

### Complete Workflow: Web Server Setup

```bash
# 1. Setup host
vzcli config add myserver \
  --url "https://virt.myserver.com:4083/index.php" \
  --key "abc123" \
  --pass "secret" \
  --default

# 2. Check available VMs
vzcli vm list --status up

# 3. Add HTTP forwarding
vzcli forward add -v 103 -p HTTP -d mysite.com

# 4. Add HTTPS forwarding
vzcli forward add -v 103 -p HTTPS -d mysite.com

# 5. Add SSH access
vzcli forward add -v 103 -p TCP -d 45.158.126.xxx -s 2222 -t 22

# 6. Verify rules
vzcli forward list -v 103
```

### Backup and Restore

```bash
# Backup rules
vzcli batch export -v 103 -o vm103_backup.json

# Restore to another VM (test first)
vzcli batch import -v 104 -f vm103_backup.json --dry-run
vzcli batch import -v 104 -f vm103_backup.json
```

### Multi-Host Management

```bash
# Setup multiple hosts
vzcli config add production --url "https://prod.com:4083" --key "key1" --pass "pass1" --default
vzcli config add staging --url "https://staging.com:4083" --key "key2" --pass "pass2"

# Test all hosts
vzcli config test

# List VMs from all hosts
vzcli vm list --all-hosts

# Operations on specific host
vzcli -H staging vm list
vzcli -H production forward list -v 103
```

## Troubleshooting

### Connection Issues

```
✗ Failed to connect to API
```

**Solutions:**
1. Verify API URL includes port 4083
2. Check network connectivity
3. Ensure firewall allows connections
4. Test with `vzcli config test`

### Authentication Issues

```
✗ Authentication failed
```

**Solutions:**
1. Verify API Key in Virtualizor panel
2. Check API Password is correct
3. Ensure API access is enabled
4. Re-add host configuration

### Debug Mode

For detailed error information:

```bash
vzcli --debug vm list
vzcli --debug forward add -i
```

## Development

### Setup Development Environment

```bash
git clone https://github.com/iam-rizz/vzcli.js.git
cd vzcli.js
npm install
```

### Testing

```bash
# Use Node.js 20 for testing
nvm use 20

# Run tests
npm test

# Run with specific host
vzcli --host myhost vm list
```

### Project Structure

```
vzcli.js/
├── package.json
├── README.md
├── README_ID.md
├── LICENSE
├── bin/
│   └── vzcli.js              # CLI entry point
├── src/
│   ├── index.js              # Main exports
│   ├── commands/             # Command handlers
│   │   ├── config.js
│   │   ├── vm.js
│   │   ├── forward.js
│   │   ├── batch.js
│   │   ├── about.js
│   │   └── update.js
│   ├── lib/                  # Core libraries
│   │   ├── api-client.js
│   │   ├── config-manager.js
│   │   ├── security.js
│   │   └── utils.js
│   ├── services/             # Business logic
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

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**Rizz**

- Email: rizkyadhypratama@gmail.com
- GitHub: [@iam-rizz](https://github.com/iam-rizz)

---

<p align="center">
  Made with ❤️ for Virtualizor users
</p>