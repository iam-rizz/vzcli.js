const fs = require('fs-extra');
const path = require('path');
const ForwardService = require('./forward-service');
const VmService = require('./vm-service');
const Output = require('../ui/output');
const Progress = require('../ui/progress');

class BatchService {
  constructor(options = {}) {
    this.forwardService = new ForwardService(options);
    this.vmService = new VmService(options);
    this.output = new Output(options);
    this.progress = new Progress();
  }

  async exportRules(options = {}) {
    const { vpsid, host, outputFile } = options;

    try {
      if (!vpsid) {
        throw new Error('VM ID is required for export');
      }

      if (!outputFile) {
        throw new Error('Output file path is required');
      }

      const rules = await this.forwardService.listForwardingRules({
        vpsid,
        host,
        json: true
      });

      if (rules.length === 0) {
        this.output.warning(`No forwarding rules found for VM ${vpsid}`);
        return false;
      }

      const exportData = {
        vpsid: vpsid.toString(),
        exported_at: new Date().toISOString(),
        host: host || await this.forwardService.configManager.getDefaultHost(),
        rules: rules.map(rule => ({
          protocol: rule.protocol,
          src_hostname: rule.src_hostname,
          src_port: rule.src_port,
          dest_ip: rule.dest_ip,
          dest_port: rule.dest_port
        }))
      };

      const outputPath = path.resolve(outputFile);
      await fs.ensureDir(path.dirname(outputPath));
      await fs.writeJson(outputPath, exportData, { spaces: 2 });

      this.output.success(`Exported ${rules.length} rules to ${outputPath}`);
      return true;
    } catch (error) {
      this.output.error(error.message);
      this.output.debug('Export rules error:', error);
      return false;
    }
  }

  async importRules(options = {}) {
    const { vpsid, host, inputFile, dryRun } = options;

    try {
      if (!vpsid) {
        throw new Error('VM ID is required for import');
      }

      if (!inputFile) {
        throw new Error('Input file path is required');
      }

      const inputPath = path.resolve(inputFile);
      
      if (!await fs.pathExists(inputPath)) {
        throw new Error(`File not found: ${inputPath}`);
      }

      const importData = await fs.readJson(inputPath);
      
      if (!this.validateImportData(importData)) {
        throw new Error('Invalid import file format');
      }

      const vmInfo = await this.vmService.getVMInfo(vpsid, host);
      if (!vmInfo) {
        throw new Error(`VM ${vpsid} not found`);
      }

      const destIp = this.forwardService.extractVMIP(vmInfo);
      if (!destIp) {
        throw new Error('Could not determine VM internal IP');
      }

      this.output.info(`Found ${importData.rules.length} rules to import`);
      
      if (dryRun) {
        this.output.printHeader('Dry Run - Rules to Import');
        this.displayImportPreview(importData.rules, destIp);
        this.output.info('Dry run completed. Use without --dry-run to execute.');
        return true;
      }

      const apiClient = await this.forwardService.getApiClient(host);
      const results = [];

      const processedResults = await this.progress.withProgressBar(
        importData.rules,
        async (rule, index) => {
          try {
            const result = await apiClient.addForwardingRule(
              vpsid,
              rule.protocol,
              rule.src_hostname,
              rule.src_port,
              destIp,
              rule.dest_port
            );

            return {
              rule,
              success: result.success,
              error: result.success ? null : result.error
            };
          } catch (error) {
            return {
              rule,
              success: false,
              error: error.message
            };
          }
        },
        'Importing rules'
      );

      const successful = processedResults.filter(r => r.success).length;
      const failed = processedResults.filter(r => !r.success).length;

      this.output.printSeparator();
      this.output.success(`Import completed: ${successful} successful, ${failed} failed`);

      if (failed > 0) {
        this.output.printHeader('Failed Rules');
        const failedRules = processedResults.filter(r => !r.success);
        
        const tableData = failedRules.map(result => ({
          Protocol: result.rule.protocol,
          Source: `${result.rule.src_hostname}:${result.rule.src_port}`,
          Destination: `${result.rule.dest_ip}:${result.rule.dest_port}`,
          Error: result.error
        }));

        this.output.table(tableData);
      }

      return successful > 0;
    } catch (error) {
      this.output.error(error.message);
      this.output.debug('Import rules error:', error);
      return false;
    }
  }

  validateImportData(data) {
    if (!data || typeof data !== 'object') {
      return false;
    }

    if (!data.rules || !Array.isArray(data.rules)) {
      return false;
    }

    for (const rule of data.rules) {
      if (!rule.protocol || !rule.src_hostname || !rule.src_port || !rule.dest_port) {
        return false;
      }

      if (!['HTTP', 'HTTPS', 'TCP'].includes(rule.protocol.toUpperCase())) {
        return false;
      }

      if (typeof rule.src_port !== 'number' || rule.src_port < 1 || rule.src_port > 65535) {
        return false;
      }

      if (typeof rule.dest_port !== 'number' || rule.dest_port < 1 || rule.dest_port > 65535) {
        return false;
      }
    }

    return true;
  }

  displayImportPreview(rules, destIp) {
    const tableData = rules.map(rule => ({
      Protocol: this.output.formatProtocol(rule.protocol),
      Source: `${rule.src_hostname}:${rule.src_port}`,
      Destination: `${destIp}:${rule.dest_port}`
    }));

    this.output.table(tableData);
  }

  async generateTemplate(outputFile) {
    try {
      const template = {
        vpsid: "103",
        exported_at: new Date().toISOString(),
        host: "example-host",
        rules: [
          {
            protocol: "HTTP",
            src_hostname: "example.com",
            src_port: 80,
            dest_ip: "10.0.0.1",
            dest_port: 80
          },
          {
            protocol: "HTTPS",
            src_hostname: "secure.example.com",
            src_port: 443,
            dest_ip: "10.0.0.1",
            dest_port: 443
          },
          {
            protocol: "TCP",
            src_hostname: "1.2.3.4",
            src_port: 2222,
            dest_ip: "10.0.0.1",
            dest_port: 22
          }
        ]
      };

      const outputPath = path.resolve(outputFile);
      await fs.ensureDir(path.dirname(outputPath));
      await fs.writeJson(outputPath, template, { spaces: 2 });

      this.output.success(`Template generated: ${outputPath}`);
      return true;
    } catch (error) {
      this.output.error(error.message);
      return false;
    }
  }
}

module.exports = BatchService;