# vzcli v1.0.1 Release Notes

## Overview
This release brings significant improvements to the CLI output formatting, API client stability, and overall user experience. The tool now provides a more colorful and professional interface while maintaining full compatibility with Virtualizor API.

## New Features

### Enhanced Colorful Output
- **Colorful VM List**: IDs (magenta), hostnames (white), status indicators (green/red), IPs (cyan)
- **Colorful Forwarding Rules**: Protocol-specific colors (HTTP=blue, HTTPS=green, TCP=cyan), domains (blue), ports (yellow)
- **Colorful Configuration**: Host names (white), URLs (blue), storage info (yellow)
- **ANSI Escape Codes**: Direct implementation for consistent color display across all terminals

### Improved Table Formatting
- Custom table formatter that properly handles ANSI colors
- Clean borders and proper column alignment
- No more raw escape codes visible in output
- Maintains readability with `--color=false` option

### Simplified VM Display
- Streamlined VM list showing only essential information: ID, Hostname, Status, IP, OS
- Removed RAM and Disk columns for cleaner, focused output
- Better visual hierarchy with color coding

## Technical Improvements

### API Client Fixes
- Fixed API endpoints to match Python reference implementation
- Corrected request methods (GET with query parameters for list operations)
- Updated parameter names (`svs` instead of `vpsid`)
- Improved response parsing for `haproxydata` format
- Better VM IP extraction from `ips` object
- Enhanced success detection for POST operations

### Code Quality
- Removed all inline comments for cleaner codebase
- Improved error handling and response validation
- Better alignment with Python reference implementation
- Updated Node.js imports to use `node:` prefix

## Verified Operations
- ✅ Configuration management (`vzcli config`)
- ✅ VM listing with correct IP addresses (`vzcli vm list`)
- ✅ Forwarding rule listing (`vzcli forward list`)
- ✅ Forwarding rule deletion (`vzcli forward delete`)
- ✅ Forwarding rule addition (`vzcli forward add`)

## Installation

### From npm
```bash
npm install -g vzcli
```

### From GitHub
```bash
git clone https://github.com/iam-rizz/vzcli.js.git
cd vzcli.js
npm install
npm link
```

## Usage Examples

### VM Management
```bash
# List all VMs with colorful output
vzcli vm list

# List VMs without colors
vzcli --color=false vm list
```

### Forwarding Rules
```bash
# List forwarding rules for a specific VM
vzcli forward list --vpsid 105

# Add a new HTTP forwarding rule
vzcli forward add --vpsid 105 --protocol HTTP --domain example.com --src-port 80 --dest-port 8080

# Delete a forwarding rule
vzcli forward delete --vpsid 105 --vdfid 1234 --force
```

### Configuration
```bash
# Add a new host configuration
vzcli config add -i

# List configured hosts
vzcli config list

# Test connection to configured host
vzcli config test
```

## Requirements
- Node.js 16.0.0 or higher
- Access to Virtualizor API
- Valid API credentials

## Breaking Changes
None. This release maintains full backward compatibility.

## Bug Fixes
- Fixed ANSI escape codes showing as raw text in tables
- Fixed VM status parsing (numeric to string conversion)
- Fixed color option handling
- Fixed API client request format issues
- Fixed VM IP extraction logic

## Contributors
- [@iam-rizz](https://github.com/iam-rizz)

## Support
For issues and questions, please visit: https://github.com/iam-rizz/vzcli.js/issues