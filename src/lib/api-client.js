const axios = require('axios');

class ApiClient {
  constructor(apiUrl, apiKey, apiPassword) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
    this.apiPassword = apiPassword;
    this.timeout = 30000;
  }

  async makeRequest(action, params = {}) {
    const requestData = {
      api: 'json',
      apikey: this.apiKey,
      apipass: this.apiPassword,
      act: action,
      ...params
    };

    try {
      const response = await axios.post(this.apiUrl, requestData, {
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'vzcli/1.0.0/Rizz'
        }
      });

      if (response.data && response.data.done) {
        return {
          success: true,
          data: response.data
        };
      } else {
        return {
          success: false,
          error: response.data?.error || 'Unknown API error',
          data: response.data
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  async testConnection() {
    const startTime = Date.now();
    const result = await this.makeRequest('listvs');
    const responseTime = Date.now() - startTime;

    return {
      ...result,
      responseTime
    };
  }

  async listVMs() {
    return await this.makeRequest('listvs');
  }

  async getVMInfo(vpsid) {
    return await this.makeRequest('vpsmanage', { vpsid });
  }

  async listForwardingRules(vpsid) {
    return await this.makeRequest('domain_forwarding', { vpsid });
  }

  async addForwardingRule(vpsid, protocol, srcHostname, srcPort, destIp, destPort) {
    return await this.makeRequest('domain_forwarding', {
      vpsid,
      protocol: protocol.toLowerCase(),
      src_hostname: srcHostname,
      src_port: srcPort,
      dest_ip: destIp,
      dest_port: destPort,
      addforward: 1
    });
  }

  async editForwardingRule(vpsid, vdfid, protocol, srcHostname, srcPort, destIp, destPort) {
    return await this.makeRequest('domain_forwarding', {
      vpsid,
      vdfid,
      protocol: protocol.toLowerCase(),
      src_hostname: srcHostname,
      src_port: srcPort,
      dest_ip: destIp,
      dest_port: destPort,
      editforward: 1
    });
  }

  async deleteForwardingRule(vpsid, vdfid) {
    return await this.makeRequest('domain_forwarding', {
      vpsid,
      vdfid,
      deleteforward: 1
    });
  }

  async deleteMultipleForwardingRules(vpsid, vdfids) {
    const vdfidString = Array.isArray(vdfids) ? vdfids.join(',') : vdfids;
    return await this.makeRequest('domain_forwarding', {
      vpsid,
      vdfid: vdfidString,
      deleteforward: 1
    });
  }
}

module.exports = ApiClient;