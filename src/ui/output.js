const chalk = require('chalk');

chalk.level = 3;

let logSymbols;
try {
  logSymbols = require('log-symbols');
  if (logSymbols.default) {
    logSymbols = logSymbols.default;
  }
} catch (error) {
  logSymbols = {
    success: '✔',
    error: '✖',
    warning: '⚠',
    info: 'ℹ'
  };
}

class Output {
  constructor(options = {}) {
    this.noColor = options.color === false;
    this.verboseMode = options.verbose || false;
    this.debugMode = options.debug || false;
  }

  success(message) {
    const symbol = this.noColor ? '✓' : logSymbols.success;
    console.log(`${symbol} ${this.noColor ? message : chalk.green(message)}`);
  }

  error(message) {
    const symbol = this.noColor ? '✗' : logSymbols.error;
    console.log(`${symbol} ${this.noColor ? message : chalk.red(message)}`);
  }

  warning(message) {
    const symbol = this.noColor ? '⚠' : logSymbols.warning;
    console.log(`${symbol} ${this.noColor ? message : chalk.yellow(message)}`);
  }

  info(message) {
    const symbol = this.noColor ? 'ℹ' : logSymbols.info;
    console.log(`${symbol} ${this.noColor ? message : chalk.blue(message)}`);
  }

  log(message) {
    console.log(message);
  }

  verbose(message) {
    if (this.verboseMode) {
      console.log(`${this.noColor ? '[VERBOSE]' : chalk.gray('[VERBOSE]')} ${message}`);
    }
  }

  debug(message, error = null) {
    if (this.debugMode) {
      console.log(`${this.noColor ? '[DEBUG]' : chalk.magenta('[DEBUG]')} ${message}`);
      if (error && error.stack) {
        console.log(error.stack);
      }
    }
  }

  table(data, headers = null) {
    if (!data || data.length === 0) {
      this.info('No data to display');
      return;
    }

    this.printTable(data, headers);
  }

  printTable(data, headers = null) {
    if (!Array.isArray(data) || data.length === 0) return;

    const allKeys = headers || [...new Set(data.flatMap(Object.keys))];
    
    const columnWidths = {};
    allKeys.forEach(key => {
      const headerLength = key.length;
      const maxDataLength = Math.max(...data.map(row => {
        const value = row[key];
        const cleanValue = typeof value === 'string' ? value.replace(/\x1B\[[0-9;]*m/g, '') : String(value || '');
        return cleanValue.length;
      }));
      columnWidths[key] = Math.max(headerLength, maxDataLength, 3);
    });

    const headerRow = allKeys.map(key => key.padEnd(columnWidths[key])).join(' │ ');
    console.log(`┌─${allKeys.map(key => '─'.repeat(columnWidths[key])).join('─┬─')}─┐`);
    console.log(`│ ${headerRow} │`);
    console.log(`├─${allKeys.map(key => '─'.repeat(columnWidths[key])).join('─┼─')}─┤`);

    data.forEach(row => {
      const dataRow = allKeys.map(key => {
        const value = row[key] || '';
        const cleanValue = typeof value === 'string' ? value.replace(/\x1B\[[0-9;]*m/g, '') : String(value);
        const padding = columnWidths[key] - cleanValue.length;
        return value + ' '.repeat(Math.max(0, padding));
      }).join(' │ ');
      console.log(`│ ${dataRow} │`);
    });

    console.log(`└─${allKeys.map(key => '─'.repeat(columnWidths[key])).join('─┴─')}─┘`);
  }

  json(data) {
    console.log(JSON.stringify(data, null, 2));
  }

  formatVMStatus(status) {
    if (this.noColor) {
      return status === 'up' ? '● up' : '● down';
    }
    return status === 'up' ? 
      `\x1b[1;32m● up\x1b[0m` :
      `\x1b[1;31m● down\x1b[0m`;
  }

  formatResponseTime(ms) {
    if (this.noColor) {
      return `${ms}ms`;
    }
    
    if (ms < 100) return chalk.bold.green(`${ms}ms`);
    if (ms < 500) return chalk.bold.yellow(`${ms}ms`);
    return chalk.bold.red(`${ms}ms`);
  }

  formatProtocol(protocol) {
    if (this.noColor) {
      return protocol;
    }

    switch (protocol.toUpperCase()) {
      case 'HTTP':
        return `\x1b[1;34m${protocol}\x1b[0m`;
      case 'HTTPS':
        return `\x1b[1;32m${protocol}\x1b[0m`;
      case 'TCP':
        return `\x1b[1;36m${protocol}\x1b[0m`;
      default:
        return `\x1b[1;35m${protocol}\x1b[0m`;
    }
  }

  formatSize(size, unit = 'MB') {
    if (this.noColor) {
      return `${size} ${unit}`;
    }
    return `\x1b[1;33m${size} ${unit}\x1b[0m`;
  }

  formatIP(ip) {
    if (this.noColor || !ip || ip === 'N/A') {
      return ip || 'N/A';
    }
    return `\x1b[1;36m${ip}\x1b[0m`;
  }

  formatHostname(hostname) {
    if (this.noColor) {
      return hostname;
    }
    return `\x1b[1;37m${hostname}\x1b[0m`;
  }

  formatID(id) {
    if (this.noColor) {
      return id;
    }
    return `\x1b[1;35m${id}\x1b[0m`;
  }

  formatPort(port) {
    if (this.noColor) {
      return port;
    }
    return `\x1b[1;33m${port}\x1b[0m`;
  }

  formatDomain(domain) {
    if (this.noColor) {
      return domain;
    }
    return `\x1b[1;34m${domain}\x1b[0m`;
  }

  printHeader(title) {
    if (this.noColor) {
      console.log(`\n=== ${title} ===\n`);
    } else {
      console.log(`\n${chalk.bold.cyan(`=== ${title} ===`)}\n`);
    }
  }

  printSeparator() {
    console.log('');
  }

  progressBar(used, total, length = 10) {
    try {
      const usedNum = parseFloat(used);
      const totalNum = parseFloat(total);
      
      if (totalNum <= 0) {
        return '░'.repeat(length);
      }
      
      const percentage = Math.min(usedNum / totalNum, 1);
      const filled = Math.round(percentage * length);
      const empty = length - filled;
      
      if (this.noColor) {
        return '█'.repeat(filled) + '░'.repeat(empty);
      }
      
      let color;
      if (percentage < 0.5) {
        color = '\x1b[1;32m';
      } else if (percentage < 0.8) {
        color = '\x1b[1;33m';
      } else {
        color = '\x1b[1;31m';
      }
      
      return `${color}${'█'.repeat(filled)}\x1b[0m${'░'.repeat(empty)}`;
    } catch (error) {
      return '░'.repeat(length);
    }
  }

  formatPercentage(used, total) {
    try {
      const usedNum = parseFloat(used);
      const totalNum = parseFloat(total);
      
      if (totalNum <= 0) {
        return this.noColor ? '0%' : '\x1b[1;37m0%\x1b[0m';
      }
      
      const percentage = Math.min((usedNum / totalNum) * 100, 100);
      const percentStr = `${percentage.toFixed(1)}%`;
      
      if (this.noColor) {
        return percentStr;
      }
      
      if (percentage < 50) {
        return `\x1b[1;32m${percentStr}\x1b[0m`;
      } else if (percentage < 80) {
        return `\x1b[1;33m${percentStr}\x1b[0m`;
      } else {
        return `\x1b[1;31m${percentStr}\x1b[0m`;
      }
    } catch (error) {
      return this.noColor ? '0%' : '\x1b[1;37m0%\x1b[0m';
    }
  }

  formatUsage(used, total, unit = 'GB') {
    const usedStr = parseFloat(used).toFixed(1);
    const totalStr = parseFloat(total).toFixed(1);
    
    if (this.noColor) {
      return `${usedStr}/${totalStr} ${unit}`;
    }
    
    return `\x1b[1;36m${usedStr}\x1b[0m/\x1b[1;37m${totalStr}\x1b[0m \x1b[1;33m${unit}\x1b[0m`;
  }
}

module.exports = Output;