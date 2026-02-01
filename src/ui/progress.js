const cliProgress = require('cli-progress');
const cliSpinners = require('cli-spinners');

class Progress {
  constructor() {
    this.spinner = null;
    this.progressBar = null;
    this.spinnerInterval = null;
  }

  startSpinner(message = 'Loading...', spinnerType = 'dots') {
    if (this.spinnerInterval) {
      this.stopSpinner();
    }

    const spinner = cliSpinners[spinnerType] || cliSpinners.dots;
    let frameIndex = 0;

    process.stdout.write(`${spinner.frames[frameIndex]} ${message}`);

    this.spinnerInterval = setInterval(() => {
      frameIndex = (frameIndex + 1) % spinner.frames.length;
      process.stdout.write(`\r${spinner.frames[frameIndex]} ${message}`);
    }, spinner.interval);

    return this;
  }

  updateSpinner(message) {
    if (this.spinnerInterval) {
      process.stdout.write(`\r${message}`);
    }
  }

  stopSpinner(finalMessage = null) {
    if (this.spinnerInterval) {
      clearInterval(this.spinnerInterval);
      this.spinnerInterval = null;
      
      if (finalMessage) {
        process.stdout.write(`\r${finalMessage}\n`);
      } else {
        process.stdout.write('\r');
      }
    }
  }

  createProgressBar(total, message = 'Progress') {
    this.progressBar = new cliProgress.SingleBar({
      format: `${message} |{bar}| {percentage}% | {value}/{total}`,
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });

    this.progressBar.start(total, 0);
    return this.progressBar;
  }

  updateProgressBar(current, message = null) {
    if (this.progressBar) {
      this.progressBar.update(current);
      if (message) {
        this.progressBar.updateETA();
      }
    }
  }

  stopProgressBar() {
    if (this.progressBar) {
      this.progressBar.stop();
      this.progressBar = null;
    }
  }

  async withSpinner(promise, message = 'Loading...', successMessage = null, errorMessage = null) {
    this.startSpinner(message);
    
    try {
      const result = await promise;
      this.stopSpinner(successMessage);
      return result;
    } catch (error) {
      this.stopSpinner(errorMessage);
      throw error;
    }
  }

  async withProgressBar(items, processor, message = 'Processing') {
    const progressBar = this.createProgressBar(items.length, message);
    const results = [];

    try {
      for (let i = 0; i < items.length; i++) {
        const result = await processor(items[i], i);
        results.push(result);
        this.updateProgressBar(i + 1);
      }
      
      this.stopProgressBar();
      return results;
    } catch (error) {
      this.stopProgressBar();
      throw error;
    }
  }
}

module.exports = Progress;