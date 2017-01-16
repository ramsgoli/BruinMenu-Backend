var _ = require('underscore')
var express = require('express')
var bodyParser = require('body-parser')
var request = require('request')
var util = require('util')
var cheerio = require('cheerio')
var tabletojson = require('tabletojson');
var fs = require('fs');
var app = express()

let hoursUrl = 'http://menu.dining.ucla.edu/Hours/%s'// yyyy-mm-dd
let overviewUrl = 'http://menu.ha.ucla.edu/foodpro/default.asp?date=%d%%2F%d%%2F%d'
let calendarUrl = 'http://www.registrar.ucla.edu/Calendars/Annual-Academic-Calendar'

let hallTitlesHours = [
    'Covel',
    'De Neve',
    'FEAST at Rieber',
    'Bruin Plate',
    'Bruin Café',
    'Café 1919',
    'Rendezvous',
    'De Neve Grab \'n\' Go',
    'The Study at Hedrick'
]

app.set('port', (process.env.PORT || 5000))
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())
app.use(express.static('website'))

/* Parameters:
    Date (optional)
*/
app.get('/overview', function (req, res) {
    var date = getDate(req, res)
    var month = date.getMonth() + 1 //getMonth returns 0 based month
    var day = date.getDate()
    var year = date.getFullYear()
    var url = util.format(overviewUrl, month, day, year)
    request(url, function(error, response, body) {
        if (error) {
            sendError(res, error)
        } else {
            parseOverviewPage(res, body)
        }
    })
})

/* Parameters:
    Date (optional)
*/
app.get('/hours', function (req, res) {
    var dateString = getDate(req, res)
    console.log(dateString)
    var url = util.format(hoursUrl, dateString)
    request(url, function(error, response, body) {
        if (error) {
            sendError(res, error)
        } else {
            parseHours(res, body)
        }
    })
})

/* Parameters:
    Date (optional)
*/
app.get('/menus', function (req, res) {
    // temporary cache file since website is down
    var html = fs.readFileSync("test.html");
    parseMenus(res, html);
})

app.get('/calendarYear', function(req, res){
    // TODO: get the calendar years for several 
    var url = util.format(calendarUrl);
    request(url, function(error, response, body)
    {
        if (error)
        {
            sendError(res, error)
        }
        else{
            res.send('TODO')
        }
    })
    res.send('TODO');
})

// Spin up the server
app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'))
})

function parseOverviewPage(res, body) {
    var response = {}
    response.breakfast = parseMealPeriod(body, 0)
    response.lunch = parseMealPeriod(body, 1)
    response.dinner = parseMealPeriod(body, 2)
    res.send(response)
}

function parseMealPeriod(body, mealNumber) {
    var result = []

    return result
}

function parseHours(res, body) {
    var response = []
    let breakfast_key = 'breakfast'
    let lunch_key = 'lunch'
    let dinner_key = 'dinner'
    let late_night_key = 'late_night'
    var obj = {}
    var hours = {}
    var $ = cheerio.load(body)
    $('.hours-closed, .hours-closed-allday, .hours-location, .hours-range').each(function(index, element) {
        var text = $(this).text().trim()
        console.log(text)
        if (hallTitlesHours.indexOf(text) != -1) {
            if (!_.isEmpty(obj)) {
                response.push(obj)
            }
            obj = {}
            obj['hall_name'] = text
            return
        }
        if (dinner_key in obj) {
            obj[late_night_key] = text
        } else if (lunch_key in obj) {
            obj[dinner_key] = text
        } else if (breakfast_key in obj) {
            obj[lunch_key] = text
        } else {
            obj[breakfast_key] = text
        }
        // if (index < 3) return
        // var obj = {}
        // var name = ''
        // $(this).find('td').each(function(index, element) {
        //     var text = $(this).text().replace(/\r\n\t/g, '').trim()
        //     if (index == 0) {
        //         var key = "hall_name"
        //     } else  if (index == 1) {
        //         var key = 'breakfast'
        //     } else if (index == 2) {
        //         var key = 'lunch'
        //     } else if (index == 3) {
        //         var key = 'dinner'
        //     } else if (index == 4) {
        //         var key = 'late_night'
        //     }
        //     obj[key] = text.replace(/- +/g, '- ').trim()
        // })
        // response.push(obj)
    })
    response.push(obj)
    res.send(response)
}

function parseMenus(res, html)
{
    var response = 
    {
        "Breakfast" : 
        [
            {
                "name" : "Bruin Plate",
                "menu" : []
            },
            {
                "name" : "De Neve Dining",
                "menu" : []
            }
        ],
        "Lunch" : 
        [
            {
                "name" : "Covel Dining",
                "menu" : []
            },
            {
                "name" : "Bruin Plate",
                "menu" : []
            },
            {
                "name" : "De Neve Dining",
                "menu" : []
            },
            {
                "name" : "FEAST at Rieber",
                "menu" : []
            }
        ],
        "Dinner" : 
        [
            {
                "name" : "Covel Dining",
                "menu" : []
            },
            {
                "name" : "Bruin Plate",
                "menu" : []
            },
            {
                "name" : "De Neve Dining",
                "menu" : []
            },
            {
                "name" : "FEAST at Rieber",
                "menu" : []
            }
        ]
    };

    var tablesAsJson = tabletojson.convert(html);

    for (var i = 1; i <= 5; i++)
    {
        var mealname;
        var nameMap;

        if (i == 1)
        {
            mealname = "Breakfast";
            nameMap = 
            {
                "Bruin Plate" : 0,
                "De Neve Dining" : 1
            }
        }
        else 
        {
            if (i == 2 || i == 3)
                mealname = "Lunch";
            else if (i == 4 || i == 5)
                mealname = "Dinner";
            nameMap = 
            {
                "Covel Dining" : 0,
                "Bruin Plate" : 1,
                "De Neve Dining" : 2,
                "FEAST at Rieber" : 3
            }
        }

        var table = tablesAsJson[i];
        var offset = 0;

        var name1;
        var name2;

        if (i == 3 || i == 5)
        {
            offset = 1;
            name1 = table[0]['0'];
            name2 = table[0]['1'];
        }
        else
        {
            name1 = table[1]['0'];
            name2 = table[1]['1'];
        }
        for (var j = (3-offset); j < table.length; j++)
        {
            var obj1 = 
            {
                "section_name" : "",
                "items" : []
            };

            var obj2 = 
            {
                "section_name" : "",
                "items" : []
            };

            var section1 = table[j]['0'];
            var arr1 = section1.replace(/\t/g, '').split('\n');
            obj1.section_name = arr1[0];
            arr1.shift();
            obj1.items = arr1;
            response[mealname][nameMap[name1]].menu.push(obj1);
            
            var section2 = table[j]['1'];
            var arr2 = section2.replace(/\t/g, '').split('\n');
            obj2.section_name = arr2[0];
            arr2.shift();
            obj2.items = arr2;
            response[mealname][nameMap[name2]].menu.push(obj2);
        }
    }
    // send the response object to the /menus page
    res.send(response);
}

function sendError(res, error) {
    //TODO: send JSON with the returned error message
    console.log('error')
    res.send(error)
}

function getDate(req, res) {
    let dateText = req.query['date']
    if (dateText) {
        return dateText //new Date(dateText)
        // TODO: Catch invalid dateText format and send appropriate error message on incorrect format
    }
    let date = new Date()
    let month = date.getMonth() + 1 //getMonth returns 0 based month
    let day = date.getDate()
    let year = date.getFullYear()
    return '' + year + '-' + minTwoDigits(month) + '-' + minTwoDigits(day)
}

function minTwoDigits(n) {
  return (n < 10 ? '0' : '') + n;
}

// TODO: Have a job that runs every hour that refreshes all the menus
// TODO: Store about a week's worth of menu info