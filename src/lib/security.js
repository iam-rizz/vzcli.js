const crypto = require('node:crypto');
const os = require('node:os');

let keytar;
try {
  keytar = require('keytar');
} catch (error) {
  keytar = null;
}

class Security {
  serviceName = 'vzcli';
  
  constructor() {
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
    const key = this.machineKey.subarray(0, 32); // Ensure 32 bytes for AES-256
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  decrypt(encryptedText) {
    try {
      const parts = encryptedText.split(':');
      if (parts.length !== 2) return null;
      
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const key = this.machineKey.subarray(0, 32); // Ensure 32 bytes for AES-256
      
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
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