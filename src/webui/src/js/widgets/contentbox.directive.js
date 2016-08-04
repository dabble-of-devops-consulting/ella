/* jshint esnext: true */

import {Directive, Inject} from '../ng-decorators';

/**
 <contentbox>
 A content box element with vertical header
 */
@Directive({
    selector: 'contentbox',
    scope: {
        ngDisabled: '=?'
    },
    transclude: { cbheader: 'cbheader', cbbody: 'cbbody' },
    template: '<div class="neo-content-box fixed-width-numbers" ng-disabled="vm.ngDisabled"><div class="cb-header" ng-transclude="cbheader"></div> <div class="cb-body" ng-transclude="cbbody"></div> </div>',
    link: (scope, elem, attrs) => {
      setTimeout(() => {
        let e = elem[0].querySelector(".title")
        let h = (e.getBoundingClientRect().height * 1.2) + 7;
        elem[0].querySelector(".neo-content-box").style.minHeight = h + "px";
        if (e.querySelector("a")) {
          console.log("TRIGGERED");
          elem[0].querySelector(".cb-header").style.backgroundColor = "#4B879B";
        }
      }, 0);
    }
})
export class ContentboxController { }