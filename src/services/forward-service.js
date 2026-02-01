const ApiClient = require('../lib/api-client');
const ConfigManager = require('../lib/config-manager');
const VmService = require('./vm-service');
const Output = require('../ui/output');
const Prompts = require('../ui/prompts');
const Progress = require('../ui/progress');

class ForwardService {
  constructor(options = {}) {
    this.configManager = new ConfigManager();
    this.vmService = new VmService(options);
    this.output = new Output(options);
    this.progress = new Progress();
  }

  async getApiClient(hostName = null) {
    return await this.vmService.getApiClient(hostName);
  }

  async listForwardingRules(options = {}) {
    const { vpsid, host, auto, interactive, json } = options;

    try {
      let targetVpsid = vpsid;

      if (interactive || (!vpsid && !auto)) {
        const vms = await this.vmService.listVMs({ host, status: 'up' });
        if (vms.length === 0) {
          this.output.warning('No running VMs found');
          return [];
        }

        if (auto && vms.length === 1) {
          targetVpsid = vms[0].vpsid;
          this.output.info(`Auto-selected VM: ${vms[0].hostname} (${targetVpsid})`);
        } else {
          const selectedVM = await Prompts.selectVM(vms);
          if (!selectedVM) {
            this.output.info('Operation cancelled');
            return [];
          }
          targetVpsid = selectedVM.vpsid;
        }
      }

      if (!targetVpsid) {
        throw new Error('VM ID is required. Use --vpsid or --interactive');
      }

      const apiClient = await this.getApiClient(host);
      const result = await this.progress.withSpinner(
        apiClient.listForwardingRules(targetVpsid),
        'Fetching forwarding rules...',
        null,
        'Failed to fetch forwarding rules'
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      const rules = this.parseForwardingRules(result.data);

      if (json) {
        this.output.json(rules);
      } else {
        this.displayForwardingRules(rules, targetVpsid);
      }

      return rules;
    } catch (error) {
      this.output.error(error.message);
      this.output.debug('List forwarding rules error:', error);
      return [];
    }
  }

  async addForwardingRule(options = {}) {
    const { vpsid, protocol, domain, srcPort, destPort, host, interactive } = options;

    try {
      let config;

      if (interactive) {
        const vms = await this.vmService.listVMs({ host, status: 'up' });
        if (vms.length === 0) {
          this.output.warning('No running VMs found');
          return false;
        }

        let selectedVM = null;
        if (vpsid) {
          selectedVM = vms.find(vm => vm.vpsid === vpsid);
          if (!selectedVM) {
            throw new Error(`VM ${vpsid} not found or not running`);
          }
        } else {
          selectedVM = await Prompts.selectVM(vms);
          if (!selectedVM) {
            this.output.info('Operation cancelled');
            return false;
          }
        }

        config = await Prompts.getForwardingConfig(selectedVM);
        config.vpsid = selectedVM.vpsid;
      } else {
        if (!vpsid || !protocol || !domain) {
          throw new Error('Missing required parameters. Use --interactive or provide --vpsid, --protocol, --domain');
        }

        config = {
          vpsid,
          protocol: protocol.toUpperCase(),
          domain,
          srcPort: srcPort || (protocol.toUpperCase() === 'HTTPS' ? 443 : 80),
          destPort: destPort || srcPort || (protocol.toUpperCase() === 'HTTPS' ? 443 : 80)
        };
      }

      const vms = await this.vmService.listVMs({ host, status: null });
      const vmInfo = vms.find(vm => vm.vpsid === config.vpsid);
      if (!vmInfo) {
        throw new Error(`VM ${config.vpsid} not found`);
      }

      const destIp = vmInfo.ip;
      if (!destIp || destIp === 'N/A') {
        throw new Error('Could not determine VM internal IP');
      }

      const apiClient = await this.getApiClient(host);
      const result = await this.progress.withSpinner(
        apiClient.addForwardingRule(
          config.vpsid,
          config.protocol,
          config.domain,
          config.srcPort,
          destIp,
          config.destPort
        ),
        'Adding forwarding rule...',
        null,
        'Failed to add forwarding rule'
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      this.output.success('Forwarding rule added successfully');
      this.output.info(`${config.protocol} ${config.domain}:${config.srcPort} → ${destIp}:${config.destPort}`);
      
      return true;
    } catch (error) {
      this.output.error(error.message);
      this.output.debug('Add forwarding rule error:', error);
      return false;
    }
  }

  async editForwardingRule(options = {}) {
    const { vpsid, vdfid, protocol, domain, srcPort, destPort, host, interactive } = options;

    try {
      let config;

      if (interactive) {
        const vms = await this.vmService.listVMs({ host, status: 'up' });
        if (vms.length === 0) {
          this.output.warning('No running VMs found');
          return false;
        }

        let selectedVM = null;
        if (vpsid) {
          selectedVM = vms.find(vm => vm.vpsid === vpsid);
        } else {
          selectedVM = await Prompts.selectVM(vms);
        }

        if (!selectedVM) {
          this.output.info('Operation cancelled');
          return false;
        }

        const rules = await this.listForwardingRules({ vpsid: selectedVM.vpsid, host });
        if (rules.length === 0) {
          this.output.warning('No forwarding rules found');
          return false;
        }

        const selectedRule = await Prompts.selectForwardingRule(rules, 'Select rule to edit:');
        if (!selectedRule) {
          this.output.info('Operation cancelled');
          return false;
        }

        config = await Prompts.getForwardingConfig();
        config.vpsid = selectedVM.vpsid;
        config.vdfid = selectedRule.vdfid;
      } else {
        if (!vpsid || !vdfid) {
          throw new Error('Missing required parameters. Use --interactive or provide --vpsid and --vdfid');
        }

        config = {
          vpsid,
          vdfid,
          protocol: protocol?.toUpperCase(),
          domain,
          srcPort,
          destPort
        };
      }

      const vms = await this.vmService.listVMs({ host, status: null });
      const vmInfo = vms.find(vm => vm.vpsid === config.vpsid);
      if (!vmInfo) {
        throw new Error(`VM ${config.vpsid} not found`);
      }

      const destIp = vmInfo.ip;
      if (!destIp || destIp === 'N/A') {
        throw new Error('Could not determine VM internal IP');
      }

      const currentRules = await this.listForwardingRules({ vpsid: config.vpsid, host });
      const currentRule = currentRules.find(rule => rule.vdfid === config.vdfid);
      
      if (!currentRule) {
        throw new Error(`Forwarding rule ${config.vdfid} not found`);
      }

      const updatedConfig = {
        protocol: config.protocol || currentRule.protocol,
        domain: config.domain || currentRule.src_hostname,
        srcPort: config.srcPort || currentRule.src_port,
        destPort: config.destPort || currentRule.dest_port
      };

      const apiClient = await this.getApiClient(host);
      const result = await this.progress.withSpinner(
        apiClient.editForwardingRule(
          config.vpsid,
          config.vdfid,
          updatedConfig.protocol,
          updatedConfig.domain,
          updatedConfig.srcPort,
          destIp,
          updatedConfig.destPort
        ),
        'Updating forwarding rule...',
        null,
        'Failed to update forwarding rule'
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      this.output.success('Forwarding rule updated successfully');
      this.output.info(`${updatedConfig.protocol} ${updatedConfig.domain}:${updatedConfig.srcPort} → ${destIp}:${updatedConfig.destPort}`);
      
      return true;
    } catch (error) {
      this.output.error(error.message);
      this.output.debug('Edit forwarding rule error:', error);
      return false;
    }
  }

  async deleteForwardingRule(options = {}) {
    const { vpsid, vdfid, host, interactive, force } = options;

    try {
      let config;

      if (interactive) {
        const vms = await this.vmService.listVMs({ host, status: 'up' });
        if (vms.length === 0) {
          this.output.warning('No running VMs found');
          return false;
        }

        let selectedVM = null;
        if (vpsid) {
          selectedVM = vms.find(vm => vm.vpsid === vpsid);
        } else {
          selectedVM = await Prompts.selectVM(vms);
        }

        if (!selectedVM) {
          this.output.info('Operation cancelled');
          return false;
        }

        const rules = await this.listForwardingRules({ vpsid: selectedVM.vpsid, host });
        if (rules.length === 0) {
          this.output.warning('No forwarding rules found');
          return false;
        }

        const selectedRules = await Prompts.selectMultipleForwardingRules(rules, 'Select rules to delete:');
        if (!selectedRules || selectedRules.length === 0) {
          this.output.info('Operation cancelled');
          return false;
        }

        config = {
          vpsid: selectedVM.vpsid,
          vdfids: selectedRules.map(rule => rule.vdfid)
        };
      } else {
        if (!vpsid || !vdfid) {
          throw new Error('Missing required parameters. Use --interactive or provide --vpsid and --vdfid');
        }

        const vdfids = vdfid.toString().split(',').map(id => id.trim());
        config = { vpsid, vdfids };
      }

      if (!force) {
        const message = config.vdfids.length === 1 
          ? 'Delete this forwarding rule?' 
          : `Delete ${config.vdfids.length} forwarding rules?`;
        
        const confirmed = await Prompts.confirmAction(message);
        if (!confirmed) {
          this.output.info('Operation cancelled');
          return false;
        }
      }

      const apiClient = await this.getApiClient(host);
      
      let result;
      if (config.vdfids.length === 1) {
        result = await this.progress.withSpinner(
          apiClient.deleteForwardingRule(config.vpsid, config.vdfids[0]),
          'Deleting forwarding rule...',
          null,
          'Failed to delete forwarding rule'
        );
      } else {
        result = await this.progress.withSpinner(
          apiClient.deleteMultipleForwardingRules(config.vpsid, config.vdfids),
          `Deleting ${config.vdfids.length} forwarding rules...`,
          null,
          'Failed to delete forwarding rules'
        );
      }

      if (!result.success) {
        throw new Error(result.error);
      }

      const count = config.vdfids.length;
      this.output.success(`${count} forwarding rule${count > 1 ? 's' : ''} deleted successfully`);
      
      return true;
    } catch (error) {
      this.output.error(error.message);
      this.output.debug('Delete forwarding rule error:', error);
      return false;
    }
  }

  parseForwardingRules(data) {
    if (!data.haproxydata || typeof data.haproxydata !== 'object') {
      return [];
    }

    // Handle both dict and list responses from API
    let ruleItems;
    if (Array.isArray(data.haproxydata)) {
      ruleItems = data.haproxydata;
    } else {
      ruleItems = Object.values(data.haproxydata);
    }

    return ruleItems.map(rule => ({
      vdfid: rule.vdfid || rule.id,
      protocol: rule.protocol?.toUpperCase() || 'TCP',
      src_hostname: rule.src_hostname || '',
      src_port: parseInt(rule.src_port) || 0,
      dest_ip: rule.dest_ip || '',
      dest_port: parseInt(rule.dest_port) || 0
    }));
  }

  displayForwardingRules(rules, vpsid) {
    if (rules.length === 0) {
      this.output.info(`No forwarding rules found for VM ${vpsid}`);
      return;
    }

    this.output.printHeader(`Forwarding Rules for VM ${vpsid} (${rules.length})`);

    const tableData = rules.map(rule => ({
      ID: this.output.formatID(rule.vdfid),
      Protocol: this.output.formatProtocol(rule.protocol),
      'Source': `${this.output.formatDomain(rule.src_hostname)}:${this.output.formatPort(rule.src_port)}`,
      'Destination': `${this.output.formatIP(rule.dest_ip)}:${this.output.formatPort(rule.dest_port)}`
    }));

    this.output.table(tableData);
  }

  extractVMIP(vmInfo) {
    // First try to get IP from ips object (like Python implementation)
    if (vmInfo.ips && typeof vmInfo.ips === 'object') {
      for (const ip of Object.values(vmInfo.ips)) {
        if (typeof ip === 'string' && ip.includes('.') && !ip.includes(':')) {
          return ip;
        }
      }
    }

    // Fallback to direct ip field
    if (vmInfo.ip && vmInfo.ip !== 'N/A') {
      return vmInfo.ip;
    }

    // Try nested vm object
    if (vmInfo.vm) {
      if (vmInfo.vm.ips && typeof vmInfo.vm.ips === 'object') {
        for (const ip of Object.values(vmInfo.vm.ips)) {
          if (typeof ip === 'string' && ip.includes('.') && !ip.includes(':')) {
            return ip;
          }
        }
      }
      
      if (vmInfo.vm.ip && vmInfo.vm.ip !== 'N/A') {
        return vmInfo.vm.ip;
      }
    }

    return null;
  }
}

module.exports = ForwardService;