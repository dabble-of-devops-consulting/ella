/* jshint esnext: true */
/* jshint esnext: true */

angular.module('workbench')
    .factory('Config', [function() {

    return {
        getConfig: function() {

            return {
                'frequencies': {
                    'ExAC': [
                        'AFR',
                        'AMR',
                        'EAS',
                        'FIN',
                        'NFE',
                        'OTH',
                        'SAS',
                    ],
                    '1000g': [
                        'G',
                        'AMR',
                        'ASN',
                        'EUR',
                        'AA',
                        'EA'
                    ]
                }
            };

        }
    };

}]);
