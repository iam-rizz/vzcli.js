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
            'User-Agent': 'vzcli/1.0.3'
          },
          validateStatus: () => true
        });
      } else {
        const url = this.buildUrl(action, params);
        response = await axios.get(url, {
          timeout: this.timeout,
          headers: {
            'User-Agent': 'vzcli/1.0.3'
          },
          validateStatus: () => true
        });
      }

      if (response.data) {
        // Check for authentication errors
        if (response.data.error && typeof response.data.error === 'string' && response.data.error.includes('authentication')) {
          return {
            success: false,
            error: 'Authentication failed. Please verify API Key and Password.',
            data: response.data
          };
        }

        // Check for specific error object
        if (response.data.error && typeof response.data.error === 'object') {
          const errorMessages = [];
          for (const [key, value] of Object.entries(response.data.error)) {
            if (value && value !== null && key !== 'action') {
              errorMessages.push(value);
            }
          }
          if (errorMessages.length > 0) {
            return {
              success: false,
              error: errorMessages.join(', '),
              data: response.data
            };
          }
        }

        // Check for success indicators
        if (response.data.done && !response.data.error) {
          return {
            success: true,
            data: response.data
          };
        } else if (response.data.vs || response.data.haproxydata || response.data.ram || response.data.disk || response.data.bandwidth) {
          return {
            success: true,
            data: response.data
          };
        } else if (response.data.error) {
          return {
            success: false,
            error: response.data.error || 'Unknown API error',
            data: response.data
          };
        } else {
          // If no explicit error but no success indicators either, assume success for some operations
          return {
            success: true,
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
      svs: vpsid,
      vdf_action: 'addvdf',
      protocol: protocol.toUpperCase(),
      src_hostname: srcHostname,
      src_port: srcPort.toString(),
      dest_ip: destIp,
      dest_port: destPort.toString()
    });

    return await this.makeRequest('managevdf', 'POST', data);
  }

  async editForwardingRule(vpsid, vdfid, protocol, srcHostname, srcPort, destIp, destPort) {
    const data = qs.stringify({
      svs: vpsid,
      vdf_action: 'editvdf',
      vdfid: vdfid,
      protocol: protocol.toUpperCase(),
      src_hostname: srcHostname,
      src_port: srcPort.toString(),
      dest_ip: destIp,
      dest_port: destPort.toString()
    });

    return await this.makeRequest('managevdf', 'POST', data);
  }

  async deleteForwardingRule(vpsid, vdfid) {
    const data = qs.stringify({
      svs: vpsid,
      vdf_action: 'delvdf',
      ids: vdfid.toString()
    });

    return await this.makeRequest('managevdf', 'POST', data);
  }

  async deleteMultipleForwardingRules(vpsid, vdfids) {
    const vdfidString = Array.isArray(vdfids) ? vdfids.join(',') : vdfids;
    const data = qs.stringify({
      svs: vpsid,
      vdf_action: 'delvdf',
      ids: vdfidString
    });

    return await this.makeRequest('managevdf', 'POST', data);
  }

  async getVMRamUsage(vpsid) {
    return await this.makeRequest('ram', 'GET', null, { svs: vpsid });
  }

  async getVMDiskUsage(vpsid) {
    return await this.makeRequest('disk', 'GET', null, { svs: vpsid });
  }

  async getVMBandwidthUsage(vpsid) {
    return await this.makeRequest('bandwidth', 'GET', null, { svs: vpsid });
  }

  async getVMStats(vpsid) {
    const stats = {
      ram_used: 0,
      ram_total: 0,
      disk_used: 0,
      disk_total: 0,
      bandwidth_used: 0,
      bandwidth_total: 0,
      nw_rules: 0
    };

    try {
      const ramResult = await this.getVMRamUsage(vpsid);
      if (ramResult.success && ramResult.data.ram) {
        const info = ramResult.data.ram;
        stats.ram_used = parseFloat(info.used || 0);
        stats.ram_total = parseFloat(info.limit || 0);
      }
    } catch (error) {
      // Ignore RAM fetch errors
    }

    try {
      const diskResult = await this.getVMDiskUsage(vpsid);
      if (diskResult.success && diskResult.data.disk) {
        const info = diskResult.data.disk;
        stats.disk_used = parseFloat(info.used_gb || 0);
        stats.disk_total = parseFloat(info.limit_gb || 0);
      }
    } catch (error) {
      // Ignore disk fetch errors
    }

    try {
      const bwResult = await this.getVMBandwidthUsage(vpsid);
      if (bwResult.success && bwResult.data.bandwidth) {
        const info = bwResult.data.bandwidth;
        stats.bandwidth_used = parseFloat(info.used_gb || 0);
        stats.bandwidth_total = parseFloat(info.limit_gb || 0);
      }
    } catch (error) {
      // Ignore bandwidth fetch errors
    }

    try {
      const nwResult = await this.listForwardingRules(vpsid);
      if (nwResult.success && nwResult.data.haproxydata) {
        stats.nw_rules = Object.keys(nwResult.data.haproxydata).length;
      }
    } catch (error) {
      // Ignore network rules fetch errors
    }

    return {
      success: true,
      data: stats
    };
  }
}

module.exports = ApiClient;