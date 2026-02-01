const os = require('os');
const path = require('path');
const fs = require('fs-extra');

class Utils {
  static getConfigDir() {
    const homeDir = os.homedir();
    return path.join(homeDir, '.config', 'vzcli');
  }

  static getConfigPath() {
    return path.join(this.getConfigDir(), 'config.json');
  }

  static async ensureConfigDir() {
    const configDir = this.getConfigDir();
    await fs.ensureDir(configDir);
    return configDir;
  }

  static validateUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  static validatePort(port) {
    const num = parseInt(port);
    return num >= 1 && num <= 65535;
  }

  static validateProtocol(protocol) {
    return ['HTTP', 'HTTPS', 'TCP'].includes(protocol.toUpperCase());
  }

  static formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static generateId() {
    return Math.random().toString(36).substr(2, 9);
  }
}

module.exports = Utils;