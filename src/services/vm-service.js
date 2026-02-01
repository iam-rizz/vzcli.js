const ApiClient = require('../lib/api-client');
const ConfigManager = require('../lib/config-manager');
const Output = require('../ui/output');
const Progress = require('../ui/progress');

class VmService {
  constructor(options = {}) {
    this.configManager = new ConfigManager();
    this.output = new Output(options);
    this.progress = new Progress();
  }

  async getApiClient(hostName = null) {
    const targetHost = hostName || await this.configManager.getDefaultHost();
    
    if (!targetHost) {
      throw new Error('No host configured. Use "vzcli config add" to add a host.');
    }

    const credentials = await this.configManager.getHostCredentials(targetHost);
    if (!credentials) {
      throw new Error(`Credentials not found for host: ${targetHost}`);
    }

    return new ApiClient(credentials.apiUrl, credentials.apiKey, credentials.apiPassword);
  }

  async listVMs(options = {}) {
    const { host, status, allHosts, json } = options;

    if (allHosts) {
      return await this.listVMsFromAllHosts(status, json);
    }

    try {
      const apiClient = await this.getApiClient(host);
      const result = await this.progress.withSpinner(
        apiClient.listVMs(),
        'Fetching VMs...',
        null,
        'Failed to fetch VMs'
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      let vms = this.parseVMList(result.data);

      if (status) {
        vms = vms.filter(vm => vm.status === status);
      }

      if (json) {
        this.output.json(vms);
      } else {
        this.displayVMList(vms, host || await this.configManager.getDefaultHost());
      }

      return vms;
    } catch (error) {
      this.output.error(error.message);
      if (this.output.debug) {
        this.output.debug('VM list error:', error);
      }
      return [];
    }
  }

  async listVMsFromAllHosts(status = null, json = false) {
    const hosts = await this.configManager.listHosts();
    
    if (hosts.length === 0) {
      this.output.warning('No hosts configured');
      return {};
    }

    const results = {};
    
    for (const hostName of hosts) {
      try {
        const apiClient = await this.getApiClient(hostName);
        const result = await apiClient.listVMs();

        if (result.success) {
          let vms = this.parseVMList(result.data);
          
          if (status) {
            vms = vms.filter(vm => vm.status === status);
          }

          results[hostName] = {
            success: true,
            vms,
            count: vms.length
          };
        } else {
          results[hostName] = {
            success: false,
            error: result.error,
            vms: [],
            count: 0
          };
        }
      } catch (error) {
        results[hostName] = {
          success: false,
          error: error.message,
          vms: [],
          count: 0
        };
      }
    }

    if (json) {
      this.output.json(results);
    } else {
      this.displayMultiHostVMList(results, status);
    }

    return results;
  }

  parseVMList(data) {
    if (!data.vs || typeof data.vs !== 'object') {
      return [];
    }

    return Object.values(data.vs).map(vm => ({
      vpsid: vm.vpsid,
      hostname: vm.hostname || `vm-${vm.vpsid}`,
      status: vm.status || 'unknown',
      ip: vm.ip || 'N/A',
      os: vm.os || 'Unknown',
      ram: vm.ram || 0,
      disk: vm.disk || 0,
      cpu: vm.cpu || 0,
      uptime: vm.uptime || 0
    }));
  }

  displayVMList(vms, hostName) {
    if (vms.length === 0) {
      this.output.info('No VMs found');
      return;
    }

    this.output.printHeader(`VMs from ${hostName} (${vms.length})`);

    const tableData = vms.map(vm => ({
      ID: vm.vpsid,
      Hostname: vm.hostname,
      Status: this.output.formatVMStatus(vm.status),
      IP: vm.ip,
      OS: vm.os,
      RAM: `${vm.ram} MB`,
      Disk: `${vm.disk} GB`
    }));

    this.output.table(tableData);
  }

  displayMultiHostVMList(results, status) {
    const totalHosts = Object.keys(results).length;
    let totalVMs = 0;
    let successfulHosts = 0;

    Object.values(results).forEach(result => {
      if (result.success) {
        successfulHosts++;
        totalVMs += result.count;
      }
    });

    const statusFilter = status ? ` (${status} only)` : '';
    this.output.printHeader(`VMs from all hosts${statusFilter}`);
    this.output.info(`Connected to ${successfulHosts}/${totalHosts} hosts, found ${totalVMs} VMs`);
    this.output.printSeparator();

    for (const [hostName, result] of Object.entries(results)) {
      if (result.success) {
        if (result.vms.length > 0) {
          this.displayVMList(result.vms, hostName);
        } else {
          this.output.info(`${hostName}: No VMs found`);
        }
      } else {
        this.output.error(`${hostName}: ${result.error}`);
      }
      this.output.printSeparator();
    }
  }

  async getVMInfo(vpsid, hostName = null) {
    try {
      const apiClient = await this.getApiClient(hostName);
      const result = await apiClient.getVMInfo(vpsid);

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data;
    } catch (error) {
      this.output.error(error.message);
      return null;
    }
  }
}

module.exports = VmService;