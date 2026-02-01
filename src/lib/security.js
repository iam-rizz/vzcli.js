const crypto = require('crypto');
const os = require('os');

let keytar;
try {
  keytar = require('keytar');
} catch (error) {
  keytar = null;
}

class Security {
  constructor() {
    this.serviceName = 'vzcli';
    this.machineKey = this.generateMachineKey();
  }

  generateMachineKey() {
    const machineId = os.hostname() + os.platform() + os.arch() + os.userInfo().username;
    return crypto.createHash('sha256').update(machineId).digest();
  }

  async saveToKeyring(hostName, apiKey, apiPassword) {
    if (!keytar) return false;
    
    try {
      await keytar.setPassword(`${this.serviceName}-key`, hostName, apiKey);
      await keytar.setPassword(`${this.serviceName}-pass`, hostName, apiPassword);
      return true;
    } catch (error) {
      return false;
    }
  }

  async getFromKeyring(hostName) {
    if (!keytar) return null;
    
    try {
      const apiKey = await keytar.getPassword(`${this.serviceName}-key`, hostName);
      const apiPassword = await keytar.getPassword(`${this.serviceName}-pass`, hostName);
      
      if (apiKey && apiPassword) {
        return { apiKey, apiPassword };
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async deleteFromKeyring(hostName) {
    if (!keytar) return false;
    
    try {
      await keytar.deletePassword(`${this.serviceName}-key`, hostName);
      await keytar.deletePassword(`${this.serviceName}-pass`, hostName);
      return true;
    } catch (error) {
      return false;
    }
  }

  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', this.machineKey);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  decrypt(encryptedText) {
    try {
      const parts = encryptedText.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];
      
      const decipher = crypto.createDecipher('aes-256-gcm', this.machineKey);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      return null;
    }
  }

  encryptCredentials(apiKey, apiPassword) {
    const data = JSON.stringify({ apiKey, apiPassword });
    return this.encrypt(data);
  }

  decryptCredentials(encryptedData) {
    const decrypted = this.decrypt(encryptedData);
    if (!decrypted) return null;
    
    try {
      return JSON.parse(decrypted);
    } catch (error) {
      return null;
    }
  }

  isKeytarAvailable() {
    return keytar !== null;
  }
}

module.exports = Security;