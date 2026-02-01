const prompts = require('prompts');
const Utils = require('../lib/utils');

class Prompts {
  static async selectVM(vms, message = 'Select VM:') {
    if (!vms || vms.length === 0) {
      return null;
    }

    if (vms.length === 1) {
      return vms[0];
    }

    const choices = vms.map(vm => ({
      title: `${vm.hostname || vm.vpsid} (${vm.vpsid}) - ${vm.status}`,
      value: vm
    }));

    const response = await prompts({
      type: 'select',
      name: 'vm',
      message,
      choices
    });

    return response.vm;
  }

  static async selectHost(hosts, message = 'Select host:') {
    if (!hosts || hosts.length === 0) {
      return null;
    }

    if (hosts.length === 1) {
      return hosts[0];
    }

    const choices = hosts.map(host => ({
      title: host,
      value: host
    }));

    const response = await prompts({
      type: 'select',
      name: 'host',
      message,
      choices
    });

    return response.host;
  }

  static async selectForwardingRule(rules, message = 'Select forwarding rule:') {
    if (!rules || rules.length === 0) {
      return null;
    }

    const choices = rules.map(rule => ({
      title: `${rule.protocol} ${rule.src_hostname}:${rule.src_port} → ${rule.dest_ip}:${rule.dest_port}`,
      value: rule
    }));

    const response = await prompts({
      type: 'select',
      name: 'rule',
      message,
      choices
    });

    return response.rule;
  }

  static async selectMultipleForwardingRules(rules, message = 'Select forwarding rules:') {
    if (!rules || rules.length === 0) {
      return [];
    }

    const choices = rules.map(rule => ({
      title: `${rule.protocol} ${rule.src_hostname}:${rule.src_port} → ${rule.dest_ip}:${rule.dest_port}`,
      value: rule
    }));

    const response = await prompts({
      type: 'multiselect',
      name: 'rules',
      message,
      choices
    });

    return response.rules || [];
  }

  static async getHostConfig() {
    return await prompts([
      {
        type: 'text',
        name: 'name',
        message: 'Host name:',
        validate: value => value.length > 0 ? true : 'Host name is required'
      },
      {
        type: 'text',
        name: 'apiUrl',
        message: 'API URL:',
        validate: value => Utils.validateUrl(value) ? true : 'Invalid URL format'
      },
      {
        type: 'text',
        name: 'apiKey',
        message: 'API Key:',
        validate: value => value.length > 0 ? true : 'API Key is required'
      },
      {
        type: 'password',
        name: 'apiPassword',
        message: 'API Password:',
        validate: value => value.length > 0 ? true : 'API Password is required'
      },
      {
        type: 'confirm',
        name: 'setDefault',
        message: 'Set as default host?',
        initial: true
      }
    ]);
  }

  static async getForwardingConfig(vm = null) {
    const questions = [];

    if (!vm) {
      questions.push({
        type: 'text',
        name: 'vpsid',
        message: 'VM ID:',
        validate: value => /^\d+$/.test(value) ? true : 'VM ID must be a number'
      });
    }

    questions.push(
      {
        type: 'select',
        name: 'protocol',
        message: 'Protocol:',
        choices: [
          { title: 'HTTP', value: 'HTTP' },
          { title: 'HTTPS', value: 'HTTPS' },
          { title: 'TCP', value: 'TCP' }
        ]
      },
      {
        type: 'text',
        name: 'domain',
        message: 'Domain/IP:',
        validate: value => value.length > 0 ? true : 'Domain/IP is required'
      }
    );

    const response = await prompts(questions);

    if (response.protocol === 'TCP') {
      const portQuestions = await prompts([
        {
          type: 'text',
          name: 'srcPort',
          message: 'Source port:',
          validate: value => Utils.validatePort(value) ? true : 'Invalid port number'
        },
        {
          type: 'text',
          name: 'destPort',
          message: 'Destination port:',
          validate: value => Utils.validatePort(value) ? true : 'Invalid port number'
        }
      ]);

      response.srcPort = parseInt(portQuestions.srcPort);
      response.destPort = parseInt(portQuestions.destPort);
    } else {
      response.srcPort = response.protocol === 'HTTPS' ? 443 : 80;
      response.destPort = response.srcPort;
    }

    return response;
  }

  static async confirmAction(message, initial = false) {
    const response = await prompts({
      type: 'confirm',
      name: 'confirmed',
      message,
      initial
    });

    return response.confirmed;
  }

  static async getCredentials(hostName) {
    return await prompts([
      {
        type: 'text',
        name: 'apiKey',
        message: `API Key for ${hostName}:`,
        validate: value => value.length > 0 ? true : 'API Key is required'
      },
      {
        type: 'password',
        name: 'apiPassword',
        message: `API Password for ${hostName}:`,
        validate: value => value.length > 0 ? true : 'API Password is required'
      },
      {
        type: 'confirm',
        name: 'save',
        message: 'Save credentials securely?',
        initial: true
      }
    ]);
  }

  static async getFilePath(message, validate = null) {
    const response = await prompts({
      type: 'text',
      name: 'filePath',
      message,
      validate: validate || (value => value.length > 0 ? true : 'File path is required')
    });

    return response.filePath;
  }
}

module.exports = Prompts;