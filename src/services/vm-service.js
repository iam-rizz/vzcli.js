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

    return Object.values(data.vs).map(vm => {
      let ipv4 = null;
      if (vm.ips && typeof vm.ips === 'object') {
        for (const ip of Object.values(vm.ips)) {
          if (typeof ip === 'string' && ip.includes('.') && !ip.includes(':')) {
            ipv4 = ip;
            break;
          }
        }
      }

      const osName = vm.os_name || vm.osname || vm.distro || 'Unknown';
      
      const osMapping = {
        "almalinux-8-x86_64": "AlmaLinux 8",
        "almalinux-8.8-x86_64": "AlmaLinux 8.8",
        "almalinux-9-x86_64": "AlmaLinux 9",
        "centos-7-x86_64": "CentOS 7",
        "debian-10.0-x86_64": "Debian 10",
        "debian-11.0-x86_64": "Debian 11",
        "debian-12-x86_64": "Debian 12",
        "debian-13-x86_64": "Debian 13",
        "ubuntu-20.04-x86_64": "Ubuntu 20.04",
        "ubuntu-22.04-x86_64": "Ubuntu 22.04",
        "ubuntu-24.04-x86_64": "Ubuntu 24.04"
      };
      
      const friendlyOsName = osMapping[osName] || osName;
      const ramMB = vm.ram || vm.memory || 0;
      const diskGB = vm.space || vm.disk || vm.hdd || 0;
      const bandwidthGB = vm.bandwidth || vm.bw || 0;

      return {
        vpsid: vm.vpsid,
        hostname: vm.hostname || `vm-${vm.vpsid}`,
        status: vm.status === 1 ? 'up' : 'down',
        ip: ipv4 || vm.ip || 'N/A',
        os: friendlyOsName,
        ram: ramMB,
        disk: diskGB,
        bandwidth: bandwidthGB,
        cpu: vm.cpu || 0,
        // uptime: vm.uptime || 0
      };
    });
  }

  displayVMList(vms, hostName) {
    if (vms.length === 0) {
      this.output.info('No VMs found');
      return;
    }

    this.output.printHeader(`VMs from ${hostName} (${vms.length})`);

    const tableData = vms.map(vm => ({
      ID: this.output.formatID(vm.vpsid),
      Hostname: this.output.formatHostname(vm.hostname),
      Status: this.output.formatVMStatus(vm.status),
      IP: this.output.formatIP(vm.ip),
      OS: vm.os,
      RAM: this.output.formatSize((parseInt(vm.ram) / 1024).toFixed(1), 'GB'),
      Disk: this.output.formatSize(vm.disk, 'GB'),
      BW: this.output.formatSize((parseInt(vm.bandwidth) / 1024).toFixed(1), 'TB')
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

  async getVMUsage(vpsid, options = {}) {
    const { host, json } = options;

    try {
      const apiClient = await this.getApiClient(host);
      
      const vmResult = await this.progress.withSpinner(
        apiClient.listVMs(),
        'Fetching VM info...',
        null,
        'Failed to fetch VM info'
      );

      if (!vmResult.success) {
        throw new Error(vmResult.error);
      }

      const vms = this.parseVMList(vmResult.data);
      const vm = vms.find(v => v.vpsid === vpsid);

      if (!vm) {
        throw new Error(`VM with ID ${vpsid} not found`);
      }

      const statsResult = await this.progress.withSpinner(
        apiClient.getVMStats(vpsid),
        'Fetching usage statistics...',
        null,
        'Failed to fetch usage statistics'
      );

      if (!statsResult.success) {
        throw new Error(statsResult.error);
      }

      const stats = statsResult.data;
      const usageData = {
        vm,
        stats,
        host: host || await this.configManager.getDefaultHost()
      };

      if (json) {
        this.output.json(usageData);
      } else {
        this.displayVMUsage(usageData);
      }

      return usageData;
    } catch (error) {
      this.output.error(error.message);
      if (this.output.debug) {
        this.output.debug('VM usage error:', error);
      }
      return null;
    }
  }

  async listVMsUsage(options = {}) {
    const { host, status, allHosts, json } = options;

    if (allHosts) {
      return await this.listVMsUsageFromAllHosts(status, json);
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

      if (vms.length === 0) {
        this.output.info('No VMs found');
        return [];
      }

      const vmUsageData = [];
      const hostName = host || await this.configManager.getDefaultHost();

      for (const vm of vms) {
        try {
          const statsResult = await this.progress.withSpinner(
            apiClient.getVMStats(vm.vpsid),
            `Fetching usage for ${vm.hostname}...`,
            null,
            `Failed to fetch usage for ${vm.hostname}`
          );

          const stats = statsResult.success ? statsResult.data : {
            ram_used: 0, ram_total: 0, disk_used: 0, disk_total: 0,
            bandwidth_used: 0, bandwidth_total: 0, nw_rules: 0
          };

          vmUsageData.push({ vm, stats, host: hostName });
        } catch (error) {
          vmUsageData.push({
            vm,
            stats: {
              ram_used: 0, ram_total: 0, disk_used: 0, disk_total: 0,
              bandwidth_used: 0, bandwidth_total: 0, nw_rules: 0
            },
            host: hostName,
            error: error.message
          });
        }
      }

      if (json) {
        this.output.json(vmUsageData);
      } else {
        this.displayVMsUsageList(vmUsageData, hostName);
      }

      return vmUsageData;
    } catch (error) {
      this.output.error(error.message);
      if (this.output.debug) {
        this.output.debug('VM usage list error:', error);
      }
      return [];
    }
  }

  async listVMsUsageFromAllHosts(status = null, json = false) {
    const hosts = await this.configManager.listHosts();
    
    if (hosts.length === 0) {
      this.output.warning('No hosts configured');
      return {};
    }

    const results = {};
    
    for (const hostName of hosts) {
      try {
        const vmUsageData = await this.listVMsUsage({
          host: hostName,
          status,
          json: false
        });

        results[hostName] = {
          success: true,
          vms: vmUsageData,
          count: vmUsageData.length
        };
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
      this.displayMultiHostVMsUsageList(results, status);
    }

    return results;
  }

  displayVMsUsageList(vmUsageData, hostName) {
    if (vmUsageData.length === 0) {
      this.output.info('No VMs found');
      return;
    }

    this.output.printHeader(`VM Usage Statistics from ${hostName} (${vmUsageData.length})`);

    const tableData = vmUsageData.map(({ vm, stats, error }) => {
      const ramUsedGB = stats.ram_used / 1024;
      const ramTotalGB = stats.ram_total / 1024;
      const ramPercent = this.output.formatPercentage(ramUsedGB, ramTotalGB);
      const ramBar = this.output.progressBar(ramUsedGB, ramTotalGB, 8);

      const diskPercent = this.output.formatPercentage(stats.disk_used, stats.disk_total);
      const diskBar = this.output.progressBar(stats.disk_used, stats.disk_total, 8);

      const bwUsedTB = stats.bandwidth_used / 1024;
      const bwTotalTB = stats.bandwidth_total / 1024;
      const bwPercent = this.output.formatPercentage(bwUsedTB, bwTotalTB);
      const bwBar = this.output.progressBar(bwUsedTB, bwTotalTB, 8);

      return {
        ID: this.output.formatID(vm.vpsid),
        Hostname: this.output.formatHostname(vm.hostname),
        Status: this.output.formatVMStatus(vm.status),
        RAM: error ? 'Error' : `${ramBar} ${ramPercent}`,
        Disk: error ? 'Error' : `${diskBar} ${diskPercent}`,
        BW: error ? 'Error' : `${bwBar} ${bwPercent}`,
        Rules: error ? 'N/A' : this.output.formatID(stats.nw_rules)
      };
    });

    this.output.table(tableData);
  }

  displayMultiHostVMsUsageList(results, status) {
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
    this.output.printHeader(`VM Usage Statistics from all hosts${statusFilter}`);
    this.output.info(`Connected to ${successfulHosts}/${totalHosts} hosts, found ${totalVMs} VMs`);
    this.output.printSeparator();

    for (const [hostName, result] of Object.entries(results)) {
      if (result.success) {
        if (result.vms.length > 0) {
          this.displayVMsUsageList(result.vms, hostName);
        } else {
          this.output.info(`${hostName}: No VMs found`);
        }
      } else {
        this.output.error(`${hostName}: ${result.error}`);
      }
      this.output.printSeparator();
    }
  }

  displayVMUsage(data) {
    const { vm, stats, host } = data;
    
    this.output.printHeader(`VM Usage Statistics - ${vm.hostname} (${vm.vpsid})`);
    
    console.log(`${this.output.noColor ? 'Host:' : '\x1b[1;37mHost:\x1b[0m'} ${host}`);
    console.log(`${this.output.noColor ? 'Status:' : '\x1b[1;37mStatus:\x1b[0m'} ${this.output.formatVMStatus(vm.status)}`);
    console.log(`${this.output.noColor ? 'IP Address:' : '\x1b[1;37mIP Address:\x1b[0m'} ${this.output.formatIP(vm.ip)}`);
    console.log(`${this.output.noColor ? 'OS:' : '\x1b[1;37mOS:\x1b[0m'} ${vm.os}`);
    console.log(`${this.output.noColor ? 'vCPU:' : '\x1b[1;37mvCPU:\x1b[0m'} ${vm.cpu} cores`);
    
    this.output.printSeparator();
    
    const ramUsedGB = stats.ram_used / 1024;
    const ramTotalGB = stats.ram_total / 1024;
    const ramBar = this.output.progressBar(ramUsedGB, ramTotalGB, 20);
    const ramPercent = this.output.formatPercentage(ramUsedGB, ramTotalGB);
    const ramUsage = this.output.formatUsage(ramUsedGB, ramTotalGB, 'GB');
    
    console.log(`${this.output.noColor ? 'RAM Usage:' : '\x1b[1;37mRAM Usage:\x1b[0m'}`);
    console.log(`  ${ramBar} ${ramPercent}`);
    console.log(`  ${ramUsage}`);
    
    this.output.printSeparator();
    
    const diskBar = this.output.progressBar(stats.disk_used, stats.disk_total, 20);
    const diskPercent = this.output.formatPercentage(stats.disk_used, stats.disk_total);
    const diskUsage = this.output.formatUsage(stats.disk_used, stats.disk_total, 'GB');
    
    console.log(`${this.output.noColor ? 'Disk Usage:' : '\x1b[1;37mDisk Usage:\x1b[0m'}`);
    console.log(`  ${diskBar} ${diskPercent}`);
    console.log(`  ${diskUsage}`);
    
    this.output.printSeparator();
    
    const bwUsedTB = stats.bandwidth_used / 1024;
    const bwTotalTB = stats.bandwidth_total / 1024;
    const bwBar = this.output.progressBar(bwUsedTB, bwTotalTB, 20);
    const bwPercent = this.output.formatPercentage(bwUsedTB, bwTotalTB);
    const bwUsage = this.output.formatUsage(bwUsedTB, bwTotalTB, 'TB');
    
    console.log(`${this.output.noColor ? 'Bandwidth Usage:' : '\x1b[1;37mBandwidth Usage:\x1b[0m'}`);
    console.log(`  ${bwBar} ${bwPercent}`);
    console.log(`  ${bwUsage}`);
    
    this.output.printSeparator();
    
    console.log(`${this.output.noColor ? 'Port Forwarding Rules:' : '\x1b[1;37mPort Forwarding Rules:\x1b[0m'} ${this.output.formatID(stats.nw_rules)}`);
  }
}

module.exports = VmService;