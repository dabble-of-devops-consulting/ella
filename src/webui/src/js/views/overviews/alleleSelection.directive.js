'use strict';
/* jshint esnext: true */

import {Directive, Inject} from '../../ng-decorators';


@Directive({
    selector: 'allele-selection',
    templateUrl: 'ngtmpl/alleleSelection.ngtmpl.html',
})
@Inject('$scope', '$interval', 'Navbar', 'OverviewResource', 'User')
class AlleleSelectionController {

    constructor($scope, $interval, Navbar, OverviewResource, User) {
        this.scope = $scope;
        this.interval = $interval;
        this.navbarService = Navbar;
        this.overviewResource = OverviewResource;
        this.user = User;
        this.overview = {};
        this.ongoing_user = []; // Holds filtered list of ongoing alleles belonging to user
        this.ongoing_others = [];  // Inverse of above list
        this._setup();
    }

    _setup() {
        this.updateNavbar();
        this.loadOverview();
        this.pollOverview();
    }

    pollOverview() {
        let cancel = this.interval(() => this.loadOverview(), 60000);
        this.scope.$on('$destroy', () => this.interval.cancel(cancel));
    }

    loadOverview() {
        this.overviewResource.getAllelesOverview().then(data => {
            console.log(data);
            this.overview = data;

            this.ongoing_user = this.overview.alleles.ongoing.filter(item => {
                return item.interpretations[item.interpretations.length-1].user_id === this.user.getCurrentUserId();
            });

            this.ongoing_others = this.overview.alleles.ongoing.filter(item => {
                return item.interpretations[item.interpretations.length-1].user_id !== this.user.getCurrentUserId();
            });
        });
    }

    updateNavbar() {
        this.navbarService.clearAllele();
        this.navbarService.replaceItems([
            {
                title: 'Choose a variant'
            }
        ]);
    }
}

export default AlleleSelectionController;
