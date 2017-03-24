/* jshint esnext: true */


// Export angular functions that we use so it's easier to replace later
export let deepEquals = angular.equals;
export let deepCopy = angular.copy;
export let UUID = function generateUUID () { // http://stackoverflow.com/a/8809472
    var d = new Date().getTime();
    if (typeof performance !== 'undefined' && typeof performance.now === 'function'){
        d += performance.now(); //use high-precision timer if available
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}



