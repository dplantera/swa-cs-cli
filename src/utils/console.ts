import ProgressBar from 'progress';

export const ConsoleExt = {
  clearConsole() {
    process.stdout.write('\x1Bc');
  },
  showProgress(ticks: number, refreshRate: number = 150) {
    const bar = new ProgressBar(':bar', { total: ticks });
    const timer = setInterval(function () {
      bar.tick();
      if (bar.complete) {
        console.log('\ncomplete\n');
        clearInterval(timer);
      }
    }, refreshRate);
  },
};
