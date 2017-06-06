/* jshint esnext: true */

import {Directive, Inject} from '../ng-decorators';

@Directive({
    selector: 'user-dashboard',
    templateUrl: 'ngtmpl/userDashboard.ngtmpl.html'
})
@Inject('$scope', '$location', 'Config', 'User', 'Navbar', 'OverviewResource', 'toastr')
export class UserDashboardController {
    constructor($scope, location, Config, User,Navbar, OverviewResource, toastr) {
        this.location = location;
        this.user = User;
        this.users = [];
        this.toastr = toastr;
        this.overviewResource = OverviewResource;
        this.config = Config.getConfig()


        this.overviewResource.getActivities().then(d => {
            this.activity_stream = d;
        });
    }

    getActivityStartAction(item) {
        let actions = {
            started: 'started analysing',
            started_review: 'started reviewing',
            review: 'reviewed'
        }
        if (item.start_action in actions) {
            return actions[item.start_action];
        }
        return 'unknown';
    }

    getActivityEndAction(item) {
        let actions = {
            finalized: ' and finalized it',
            marked_review: ' and marked it for review'
        }
        if (item.end_action in actions) {
            return actions[item.end_action];
        }
        return '';
    }

    getActivityName(item) {
        if ('allele' in item) {
            return item.allele.toString();
        }
        if ('analysis' in item) {
            return item.analysis.name;
        }
    }

    getActivityUser(item) {
        if (this.isUserAction(item)) {
            return 'You';
        }
        return item.user.full_name;

    }

    getActivityUrl(item) {
        if (item.allele) {
            return `/variants/${item.allele.genome_reference}/` +
            `${item.allele.chromosome}-${item.allele.start_position}-${item.allele.open_end_position}-${item.allele.change_from}-${item.allele.change_to}` +
            `?gp_name=${item.genepanel.name}&gp_version=${item.genepanel.version}&allele_id=${item.allele.id}`;
        }
        if (item.analysis) {
            return `/analyses/${item.analysis.id}`
        }
    }

    isUserAction(item) {
        return item.user.id == this.user.getCurrentUserId()
    }
}
