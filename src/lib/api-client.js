const axios = require('axios');
const qs = require('node:querystring');

class ApiClient {
  constructor(apiUrl, apiKey, apiPassword) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
    this.apiPassword = apiPassword;
    this.timeout = 30000;
  }

  buildUrl(action, params = {}) {
    const baseParams = {
      act: action,
      api: 'json',
      apikey: this.apiKey,
      apipass: this.apiPassword,
      ...params
    };

    const query = Object.keys(baseParams)
      .map(key => `${key}=${encodeURIComponent(baseParams[key])}`)
      .join('&');

    return `${this.apiUrl}?${query}`;
  }

  async makeRequest(action, method = 'GET', data = null, params = {}) {
    try {
      let response;
      
      if (method.toUpperCase() === 'POST') {
        const url = this.buildUrl(action, params);
        response = await axios.post(url, data, {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'vzcli/1.0.1'
          },
          validateStatus: () => true
        });
      } else {
        const url = this.buildUrl(action, params);
        response = await axios.get(url, {
          timeout: this.timeout,
          headers: {
            'User-Agent': 'vzcli/1.0.1'
          },
          validateStatus: () => true
        });
      }

      if (response.data) {
        if (response.data.error && typeof response.data.error === 'string' && response.data.error.includes('authentication')) {
          return {
            success: false,
            error: 'Authentication failed. Please verify API Key and Password.',
            data: response.data
          };
        }

        if (response.data.done && !response.data.error) {
          return {
            success: true,
            data: response.data
          };
        } else if (response.data.vs || response.data.haproxydata) {
          return {
            success: true,
            data: response.data
          };
        } else {
          return {
            success: false,
            error: response.data.error || 'Unknown API error',
            data: response.data
          };
        }
      } else {
        return {
          success: false,
          error: 'Invalid response from API',
          data: null
        };
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        return {
          success: false,
          error: 'Connection refused. Please check API URL and network connectivity.',
          data: null
        };
      } else if (error.code === 'ETIMEDOUT') {
        return {
          success: false,
          error: 'Connection timeout. Please check network connectivity.',
          data: null
        };
      } else {
        return {
          success: false,
          error: error.message,
          data: null
        };
      }
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
    return await this.makeRequest('vpsmanage', 'GET', null, { vpsid });
  }

  async listForwardingRules(vpsid) {
    return await this.makeRequest('managevdf', 'GET', null, { svs: vpsid });
  }

  async addForwardingRule(vpsid, protocol, srcHostname, srcPort, destIp, destPort) {
    const data = qs.stringify({
      vdf_action: 'addvdf',
      protocol: protocol.toLowerCase(),
      src_hostname: srcHostname,
      src_port: srcPort.toString(),
      dest_ip: destIp,
      dest_port: destPort.toString()
    });

    return await this.makeRequest('managevdf', 'POST', data, { svs: vpsid });
  }

  async editForwardingRule(vpsid, vdfid, protocol, srcHostname, srcPort, destIp, destPort) {
    const data = qs.stringify({
      vdf_action: 'editvdf',
      vdfid: vdfid,
      protocol: protocol.toLowerCase(),
      src_hostname: srcHostname,
      src_port: srcPort.toString(),
      dest_ip: destIp,
      dest_port: destPort.toString()
    });

    return await this.makeRequest('managevdf', 'POST', data, { svs: vpsid });
  }

  async deleteForwardingRule(vpsid, vdfid) {
    const data = qs.stringify({
      vdf_action: 'delvdf',
      ids: vdfid.toString()
    });

    return await this.makeRequest('managevdf', 'POST', data, { svs: vpsid });
  }

  async deleteMultipleForwardingRules(vpsid, vdfids) {
    const vdfidString = Array.isArray(vdfids) ? vdfids.join(',') : vdfids;
    const data = qs.stringify({
      vdf_action: 'delvdf',
      ids: vdfidString
    });

    return await this.makeRequest('managevdf', 'POST', data, { svs: vpsid });
  }
}

module.exports = ApiClient;