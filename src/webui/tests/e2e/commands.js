function waitForAngular() {
    browser.timeoutsAsyncScript(15000).executeAsync(function(done) {
        // use 'window.'' to work around weird bug when testing for undefined..
        if(window.angular && window.angular.getTestability) {
            window.angular.getTestability(document.body).whenStable(done);
        }
        else {
            done();
        }
    });
}

module.exports = function addCommands() {

    browser.addCommand('resetDb', () => {
        console.log(`Resetting database (this can take a while...)`);
        browser.url('http://' + browser.options.baseUrl + '/reset?testset=e2e&blocking=true');
        console.log("Database reset done!");
    });

    browser.addCommand('getClass', (selector) => browser.getAttribute(selector, 'class').split(' '));
    browser.addCommand('isCommentEditable', (selector) => {
        let res = browser.getAttribute(selector, 'contenteditable');
        return res === 'true';
    });
    browser.addCommand('waitForAngular', waitForAngular);

};