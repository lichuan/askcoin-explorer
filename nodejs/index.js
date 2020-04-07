var WebSocket = require('ws');
var express = require('express');
var app = express();
const exphbs = require('express-handlebars');

var ws = new WebSocket('ws://explorer.askcoin.me:19050');

ws.on('open', function() {
    // send ping message    
    ws.send(JSON.stringify({msg_type:0, msg_cmd:0, msg_id:0}));
});

ws.on('error', function(err) {
    console.log("error happened: ", err);
    process.exit();
});

ws.on('close', function() {
    console.log("websocket closed");
    process.exit();
});

var top100_reqs = [];
var supply_reqs = [];

ws.on('message', function(msg_data) {
    var msg_obj = JSON.parse(msg_data);

    if(msg_obj.msg_type == 0 && msg_obj.msg_cmd == 1) { // SYS_PONG
        setTimeout(function() {
            ws.send(JSON.stringify({msg_type:0, msg_cmd:0, msg_id:0})); // SYS_PING
        }, 10000);
    } else if(msg_obj.msg_type == 1 && msg_obj.msg_cmd == 1) {
	var res = top100_reqs.shift();
	var top100 = msg_obj.top100;

	for(var i = 0; i < top100.length; ++i) {
	    var account = top100[i];
	    account.name = Buffer.from(account.name, 'base64').toString();
	}

	res.render('top100', {
	    layout: false,
	    top100: top100,
	    helpers: {
		add_one: function(index) {
		    return index + 1;
		}
	    }
	});
    } else if(msg_obj.msg_type == 6 && msg_obj.msg_cmd == 11) {
	var res = supply_reqs.shift();
	var cur_supply = msg_obj.cur_supply;
	var supply = {cur: cur_supply, total: 1000000000000};
	res.render('supply', {
	    layout: false,
	    supply: supply
	});
    }
});

app.engine('html', exphbs({
    extname: '.html'
}));

app.set('view engine', 'html');
app.set("views", __dirname + "/views");
app.use(express.static(__dirname + '/../www'));

app.get('/top100.html', function (req, res) {
    ws.send(JSON.stringify({msg_type:1, msg_cmd:1, msg_id:0}));
    top100_reqs.push(res);
});

app.get('/supply.html', function (req, res) {
    ws.send(JSON.stringify({msg_type:6, msg_cmd:11, msg_id:0}));
    supply_reqs.push(res);
});

app.listen(8089, function () {
    console.log("explorer's backend start successfully.");
});
