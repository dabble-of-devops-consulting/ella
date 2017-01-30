var http = require('http');
var addCommands = require('./commands');

var debug = process.env.DEBUG;
var BUNDLED_APP = 'app.js'; // see gulp file

exports.config = {

    debug: debug,

    //
    // ==================
    // Specify Test Files
    // ==================
    // Define which test specs should run. The pattern is relative to the directory
    // from which `wdio` was called. Notice that, if you are calling `wdio` from an
    // NPM script (see https://docs.npmjs.com/cli/run-script) then the current working
    // directory is where your package.json resides, so `wdio` will be called from there.
    //
    specs: [
        // 'src/webui/tests/e2e/tests/**/*.js'
        'src/webui/tests/e2e/tests/analyses.js'
    ],
    // Patterns to exclude.
    exclude: [
        // 'path/to/excluded/files'
    ],
    //
    // ============
    // Capabilities
    // ============
    // Define your capabilities here. WebdriverIO can run multiple capabilities at the same
    // time. Depending on the number of capabilities, WebdriverIO launches several test
    // sessions. Within your capabilities you can overwrite the spec and exclude options in
    // order to group specific specs to a specific capability.
    //
    // First, you can define how many instances should be started at the same time. Let's
    // say you have 3 different capabilities (Chrome, Firefox, and Safari) and you have
    // set maxInstances to 1; wdio will spawn 3 processes. Therefore, if you have 10 spec
    // files and you set maxInstances to 10, all spec files will get tested at the same time
    // and 30 processes will get spawned. The property handles how many capabilities
    // from the same test should run tests.
    //
    maxInstances: 10,
    //
    // If you have trouble getting all important capabilities together, check out the
    // Sauce Labs platform configurator - a great tool to configure your capabilities:
    // https://docs.saucelabs.com/reference/platforms-configurator
    //
    capabilities: [{
        // maxInstances can get overwritten per capability. So if you have an in-house Selenium
        // grid with only 5 firefox instance available you can make sure that not more than
        // 5 instance gets started at a time.
        "chromeOptions" : {
            // "args": ["--kiosk"] // maximizes the browser, but  still not-clickable errors happen
            // these don't have any effect: ["--start-fullscreen", start-fullscreen", "--start-maximized", start-maximized"]
        },
        maxInstances: 1,
        browserName: 'chrome'
    }],

    // Defined at cli...
    //host: "172.17.0.1",
    //port: 4444,
    //path: '/',
    //
    // ===================
    // Test Configurations
    // ===================
    // Define all options that are relevant for the WebdriverIO instance here
    //
    // By default WebdriverIO commands are executed in a synchronous way using
    // the wdio-sync package. If you still want to run your tests in an async way
    // e.g. using promises you can set the sync option to false.
    sync: true,
    //
    // Level of logging verbosity: silent | verbose | command | data | result | error
    logLevel: 'silent',
    //
    // Enables colors for log output.
    coloredLogs: true,
    //
    // Saves a screenshot to a given path if a command fails.
    screenshotPath: './errorShots/',
    //
    // Default timeout for all waitFor* commands.
    waitforTimeout: 10000,
    //
    // Default timeout in milliseconds for request
    // if Selenium Grid doesn't send response
    connectionRetryTimeout: 90000,
    //
    // Default request retries count
    connectionRetryCount: 3,
    //
    // Initialize the browser instance with a WebdriverIO plugin. The object should have the
    // plugin name as key and the desired plugin options as properties. Make sure you have
    // the plugin installed before running any tests. The following plugins are currently
    // available:
    // WebdriverCSS: https://github.com/webdriverio/webdrivercss
    // WebdriverRTC: https://github.com/webdriverio/webdriverrtc
    // Browserevent: https://github.com/webdriverio/browserevent
    // plugins: {
    //     webdrivercss: {
    //         screenshotRoot: 'my-shots',
    //         failedComparisonsRoot: 'diffs',
    //         misMatchTolerance: 0.05,
    //         screenWidth: [320,480,640,1024]
    //     },
    //     webdriverrtc: {},
    //     browserevent: {}
    // },
    //
    // Test runner services
    // Services take over a specific job you don't want to take care of. They enhance
    // your test setup with almost no effort. Unlike plugins, they don't add new
    // commands. Instead, they hook themselves up into the test process.
    // services: [],//
    // Framework you want to run your specs with.
    // The following are supported: Mocha, Jasmine, and Cucumber
    // see also: http://webdriver.io/guide/testrunner/frameworks.html
    //
    // Make sure you have the wdio adapter package for the specific framework installed
    // before running any tests.
    framework: 'jasmine',
    //
    // Test reporter for stdout.
    // The only one supported by default is 'dot'
    // see also: http://webdriver.io/guide/testrunner/reporters.html
    // reporters: ['dot'],
    //
    // Options to be passed to Jasmine.
    jasmineNodeOpts: {
        //
        // Jasmine default timeout
        // We set this high, since some tests takes some time...
        defaultTimeoutInterval: debug ? (24 * 60 * 60 * 1000) : 120000,
        //
        // The Jasmine framework allows interception of each assertion in order to log the state of the application
        // or website depending on the result. For example, it is pretty handy to take a screenshot every time
        // an assertion fails.
        expectationResultHandler: function(passed, assertion) {
            // do something
        }
    },

    //
    // =====
    // Hooks
    // =====
    // WebdriverIO provides several hooks you can use to interfere with the test process in order to enhance
    // it and to build services around it. You can either apply a single function or an array of
    // methods to it. If one of them returns with a promise, WebdriverIO will wait until that promise got
    // resolved to continue.
    //
    // Gets executed once before all workers get launched.
    // onPrepare: function (config, capabilities) {
    // },
    //
    // Gets executed before test execution begins. At this point you can access all global
    // variables, such as `browser`. It is the perfect place to define custom commands.
    before: function (capabilities, specs) {
        addCommands();
        // Despite these settings, not-clickable errors happen locally. (height is limited running on Mac)
        // browser.setViewportSize({ width: 1280, height: 1000});
        console.log('\nbrowser window size:');
        console.log(browser.windowHandleSize());
    },
    //
    // Hook that gets executed before the suite starts
    beforeSuite: function (suite) {
        browser.waitUntil(function () {
            return new Promise(function(resolve, reject) {
                let baseUrl = browser.options.baseUrl;
                var host = baseUrl.substring(0, baseUrl.lastIndexOf(":"));
                var port = baseUrl.substring(baseUrl.lastIndexOf(":") + 1, baseUrl.length);
                let options = {
                    host: host,
                    port: port,
                    path: '/' + BUNDLED_APP
                };
                let callback = function(response) {
                    response.on('data', function (chunk) {});
                    response.on('end', function () {
                        let ok = response.statusCode === 200;
                        if (ok) {
                            console.log(BUNDLED_APP + ' is compiled, moving on...');
                        }
                        else {
                            console.log(BUNDLED_APP + ' is still compiling, waiting...');
                        }
                        resolve(ok);
                    });
                };
                http.request(options, callback).end();
            });
        }, 30000, 'waiting for gulp to finish building');
    },
    //
    // Hook that gets executed _before_ a hook within the suite starts (e.g. runs before calling
    // beforeEach in Mocha)
    // beforeHook: function () {
    // },
    //
    // Hook that gets executed _after_ a hook within the suite starts (e.g. runs after calling
    // afterEach in Mocha)
    // afterHook: function () {
    // },
    //
    // Function to be executed before a test (in Mocha/Jasmine) or a step (in Cucumber) starts.
    // beforeTest: function (test) {
    // },
    //
    // Runs before a WebdriverIO command gets executed.
    //beforeCommand: function (commandName, args) {
    // },
    //
    // Runs after a WebdriverIO command gets executed
    afterCommand: function (commandName, args, result, error) {
        // Wait for angular digest to finish.
        browser.waitForAngular();
    },
    //
    // Function to be executed after a test (in Mocha/Jasmine) or a step (in Cucumber) starts.
    // afterTest: function (test) {
    // },
    //
    // Hook that gets executed after the suite has ended
    // afterSuite: function (suite) {
    // },
    //
    // Gets executed after all tests are done. You still have access to all global variables from
    // the test.
    // after: function (result, capabilities, specs) {
    // },
    //
    // Gets executed after all workers got shut down and the process is about to exit. It is not
    // possible to defer the end of the process using a promise.
    // onComplete: function(exitCode) {
    // }
};

// require("babel-register")({
//     presets: ['es2015', 'stage-0'],
//     plugins: ["babel-plugin-transform-decorators-legacy"]
// });