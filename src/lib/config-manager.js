const fs = require('fs-extra');
const Utils = require('./utils');
const Security = require('./security');

class ConfigManager {
  constructor() {
    this.configPath = Utils.getConfigPath();
    this.security = new Security();
    this.config = null;
  }

  async load() {
    try {
      await Utils.ensureConfigDir();
      
      if (await fs.pathExists(this.configPath)) {
        const data = await fs.readJson(this.configPath);
        this.config = this.validateConfig(data);
      } else {
        this.config = this.getDefaultConfig();
        await this.save();
      }
      
      return this.config;
    } catch (error) {
      this.config = this.getDefaultConfig();
      return this.config;
    }
  }

  async save() {
    try {
      await Utils.ensureConfigDir();
      await fs.writeJson(this.configPath, this.config, { spaces: 2 });
      return true;
    } catch (error) {
      return false;
    }
  }

  getDefaultConfig() {
    return {
      hosts: {},
      default_host: null,
      security: {
        prefer_keyring: true,
        auto_prompt: true
      },
      version: '1.0'
    };
  }

  validateConfig(config) {
    const defaultConfig = this.getDefaultConfig();
    
    return {
      hosts: config.hosts || {},
      default_host: config.default_host || null,
      security: {
        ...defaultConfig.security,
        ...config.security
      },
      version: config.version || defaultConfig.version
    };
  }

  async addHost(name, apiUrl, apiKey, apiPassword, setDefault = false) {
    if (!this.config) await this.load();

    let storageMethod = 'encrypted';
    let encryptedData = null;

    if (this.config.security.prefer_keyring && this.security.isKeytarAvailable()) {
      const saved = await this.security.saveToKeyring(name, apiKey, apiPassword);
      if (saved) {
        storageMethod = 'keyring';
      } else {
        encryptedData = this.security.encryptCredentials(apiKey, apiPassword);
      }
    } else {
      encryptedData = this.security.encryptCredentials(apiKey, apiPassword);
    }

    this.config.hosts[name] = {
      name,
      api_url: apiUrl,
      storage_method: storageMethod,
      encrypted_data: encryptedData
    };

    if (setDefault || !this.config.default_host) {
      this.config.default_host = name;
    }

    return await this.save();
  }

  async removeHost(name) {
    if (!this.config) await this.load();

    if (!this.config.hosts[name]) {
      return false;
    }

    if (this.config.hosts[name].storage_method === 'keyring') {
      await this.security.deleteFromKeyring(name);
    }

    delete this.config.hosts[name];

    if (this.config.default_host === name) {
      const hostNames = Object.keys(this.config.hosts);
      this.config.default_host = hostNames.length > 0 ? hostNames[0] : null;
    }

    return await this.save();
  }

  async getHostCredentials(name) {
    if (!this.config) await this.load();

    const host = this.config.hosts[name];
    if (!host) return null;

    if (host.storage_method === 'keyring') {
      const credentials = await this.security.getFromKeyring(name);
      if (credentials) {
        return {
          apiUrl: host.api_url,
          apiKey: credentials.apiKey,
          apiPassword: credentials.apiPassword
        };
      }
    }

    if (host.encrypted_data) {
      const credentials = this.security.decryptCredentials(host.encrypted_data);
      if (credentials) {
        return {
          apiUrl: host.api_url,
          apiKey: credentials.apiKey,
          apiPassword: credentials.apiPassword
        };
      }
    }

    return null;
  }

  async listHosts() {
    if (!this.config) await this.load();
    return Object.keys(this.config.hosts);
  }

  async getDefaultHost() {
    if (!this.config) await this.load();
    return this.config.default_host;
  }

  async setDefaultHost(name) {
    if (!this.config) await this.load();

    if (!this.config.hosts[name]) {
      return false;
    }

    this.config.default_host = name;
    return await this.save();
  }

  async getHost(name) {
    if (!this.config) await this.load();
    return this.config.hosts[name] || null;
  }

  async getAllHosts() {
    if (!this.config) await this.load();
    return this.config.hosts;
  }
}

module.exports = ConfigManager;