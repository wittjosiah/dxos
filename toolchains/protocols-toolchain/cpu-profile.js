const inspector = require('node:inspector');
const fs = require('node:fs');
const { resolve } = require('node:path');
const session = new inspector.Session();
session.connect();

const filename = resolve(`./${new Date().toISOString()}.cpuprofile`);

session.post('Profiler.enable', () => {
  session.post('Profiler.start', () => {
    console.log(`Profile will be saved to: ${filename}\n`)
  });
});

// Wait for mocha to register global hooks.
setTimeout(() => {
  // Run after mocha tests have finished.
  after(() => {
    session.post('Profiler.stop', (err, { profile }) => {
      if (!err) {
        fs.writeFileSync(filename, JSON.stringify(profile));
      }
    });
  })
}, 1000)