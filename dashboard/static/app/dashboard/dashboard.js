/**
 * Created by davis on 4/16/15.
 */
var dashApp = angular.module('dash-demo', ['chart.js']);

n = -1;

dashApp.controller('dashTestCtrl', ['$scope', '$http', function($scope, $http) {
    $scope.barseries = ['Rep Signups', 'Non-Rep Signups'];
    $scope.onClick = function(points, evt) {
        var start = null, end = null;
        if (n <= 14) { // currently displaying by day; can't zoom in any further.

        }
        else if (n <= 56) { // currently displaying by week, zoom into the seven days.
            var date = new Date(points[0].label);
            start = date;
            end = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 6);
        }
        else if (n <= 730)  { // currently displaying by month
            var date = new Date(points[0].label.slice(4), month_names.indexOf(points[0].label.slice(0,3)));
            start = date;
            console.log(start.toISOString().slice(0,10));
            end = new Date(date.getUTCFullYear(), date.getUTCMonth()+1, 0);
        }
        else { // currently displaying by year

        }
        if (start && end) {
            $scope.startDate = start.toISOString().slice(0, 10);
            $scope.endDate = end.toISOString().slice(0, 10);
            $scope.getData();
        }
    };
    // by default, start with this year so far.
    var e = new Date();
    var s = new Date(e.getUTCFullYear(), 0);

    $scope.startDate = s.toISOString().slice(0,10);
    $scope.endDate = e.toISOString().slice(0,10);
    // sample data ?method=range&start=2014-9-2&end=2015-9-15
    $scope.getData = function() {
        $http.get('/dashboard/api?method=range&start='+$scope.startDate+'&end='+$scope.endDate).success(function(d) {
            var data = JSON.parse(d.data);
            console.log(data[0]);
            data = data.sort(function(a, b) {
                return new Date(a['fields'].date) - new Date(b['fields'].date);
            });

            var r = generateChart(data);

            $scope.barlabels = r['dates'];
            $scope.bardata = r['stats'];
        });
    };
    $scope.getData();
}]);
month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// year is normal, but month is 0-based.
function daysInMonth(d) {
    d = new Date(d); // make sure it's not a datestring, but an actual date object.
    return new Date(d.getFullYear(), d.getUTCMonth()+1, 0).getDate();
}

function generateChart(data) {
    var dates = [];
    var stats = [[], []];
    /*
    * if the length is less than 14, just display it by day.
    * if the length is between 15 and 56, add it up by week.
    * greater than 56, do it by month.
    * greater than two years, do it by year.
    * TODO: refactor into one for loop for compactness.
    * */
    n = data.length;
    if (data.length <= 14) {
        for (var i in data) {
            var e = data[i]['fields'];
            var fdate = new Date(e.date);
            // for some reason, using local timezone gives the wrong date (day earlier in this case.
            // TODO: Check in the morning if this still gives the right date.
            dates.push((fdate.getUTCMonth()+1) +'/'+  fdate.getUTCDate() +'/'+ fdate.getUTCFullYear()%100);
            stats[0].push(e['day_rep_signups']);
            stats[1].push(e['day_nonrep_signups']);
        }
    }
    /*
     * Have to remember that some data might not be there.
     */
    else if (data.length <=56) { // max is eight weeks. (should it be 12 weeks?)
        //var i=0;
        //var week = [0,0];
        //dates.push(new Date(data[i]['fields'].date).toLocaleDateString());
        //for (i; i < data.length; i++) {
        //    var e = data[i]['fields'];
        //    var d = new Date(e.date);
        //    week[0] += parseInt(e['day_rep_signups']);
        //    week[1] += parseInt(e['day_nonrep_signups']);
        //    if (d.getDay() == 0) {
        //        if (i != 0) {
        //            dates.push(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()+1).toLocaleDateString());
        //            stats[0].push(week[0]);
        //            stats[1].push(week[1]);
        //        }
        //    }
        //}
        //// push the remaining data.
        //stats[0].push(week[0]);
        //stats[1].push(week[1]);

        for (var i=0; i<data.length;i+=7) {
            var week = [0,0];
            for (var j=0; j < 7 && i+j < data.length; j++) {
                e = data[i+j]['fields'];
                week[0] += parseInt(e['day_rep_signups']);
                week[1] += parseInt(e['day_nonrep_signups']);
            }
            var fdate = new Date(data[i]['fields'].date);

            dates.push((fdate.getUTCMonth()+1) +'/'+  fdate.getUTCDate() +'/'+ fdate.getUTCFullYear()%100);
            console.log(data[i]);
            stats[0].push(week[0]);
            stats[1].push(week[1]);
        }
    }
    /*
     * This is harder, since months have variable length, and some days might be missing.
     * I keep looping through, incrementing the counters, until the month changes.
     * When that happens, I push to the arrays, and reset the counters.
     */
    else if (data.length <=730) { // by month
        var i=0;
        var m = new Date(data[i]['fields'].date).getUTCMonth();
        var month = [0,0];
        for (i; i < data.length; i++) {
            var e = data[i]['fields'];
            var d = new Date(e.date);
            if (d.getUTCMonth() == m) {
                month[0] += parseInt(e['day_rep_signups']);
                month[1] += parseInt(e['day_nonrep_signups']);
            } else { // if we've gone into a new month,
                // push last month's stuff
                var lastMonth = new Date(d.getUTCFullYear(), d.getUTCMonth()-1);
                stats[0].push(month[0]);
                stats[1].push(month[1]);
                dates.push(month_names[lastMonth.getUTCMonth()] + ' ' + d.getFullYear());
                // start over
                month[0] = parseInt(e['day_rep_signups']);
                month[1] = parseInt(e['day_nonrep_signups']);
                m = new Date(e.date).getUTCMonth(); // change the month counter
            }
        }
        dates.push(month_names[new Date(data[i-1]['fields'].date).getUTCMonth()] + ' ' + d.getFullYear());
        stats[0].push(month[0]);
        stats[1].push(month[1]);
    }
    return {dates: dates, stats: stats};
}