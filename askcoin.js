const MSG_SYS = 0;
const SYS_PING = 0;
const SYS_PONG = 1;

const MSG_EXPLORER = 5;
const EXPLORER_MAIN_PAGE = 0;
const EXPLORER_NEXT_PAGE = 1;
const EXPLORER_BLOCK_PAGE = 2;
const EXPLORER_TX_PAGE = 3;
const EXPLORER_ACCOUNT_PAGE = 4;
const EXPLORER_QUERY = 5;

var page_array = [];
var enable_previous = false;
var enable_next = true;
var in_main_page = true;
var block_list_page = null;
var msg_id = 0;
var history_pages = {};
var last_hash = null;

var ws = new WebSocket("ws://explorer.askcoin.me:19050");

function base64tohex(base64) {
    var raw = atob(base64);
    var hex_str = '';
    for ( i = 0; i < raw.length; i++ ) {
        var _hex = raw.charCodeAt(i).toString(16)
        hex_str += (_hex.length==2?_hex:'0'+_hex);
    }
    return hex_str;
}

function utc_str(utc) {
    var dt = new Date(utc * 1000);
    var year = dt.getUTCFullYear();
    var month = dt.getUTCMonth() + 1;
    month = month < 10 ? "0" + month : month;
    var day = dt.getUTCDate();
    day = day < 10 ? "0" + day : day;
    var hour = dt.getUTCHours();
    hour = hour < 10 ? "0" + hour : hour;
    var minute = dt.getUTCMinutes();
    minute = minute < 10 ? "0" + minute : minute;
    var sec = dt.getUTCSeconds();
    sec = sec < 10 ? "0" + sec : sec;
    var dt_str = year + "/" + month + "/" + day + " " + hour + ":" + minute + ":" + sec;
    return dt_str;
}

function syntax_high_light(json) {
    if (typeof json != 'string') {
        json = JSON.stringify(json, undefined, 2);
    }
    json = json.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
        function(match) {
        var cls = 'number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'key';
            } else {
                cls = 'string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'boolean';
        } else if (/null/.test(match)) {
            cls = 'null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
}

ws.onopen = function (ev) {
    setTimeout(function () {
        ws.send(JSON.stringify({msg_type:MSG_SYS, msg_cmd:SYS_PING, msg_id:0}));
    }, 10000);
    ws.send(JSON.stringify({msg_type: MSG_EXPLORER, msg_cmd: EXPLORER_MAIN_PAGE, msg_id:0}));
};

ws.onerror = function (ev) {
    $("#notice").show();
    $("#notice span:odd").text("The network connection to the API node was disconnected !");
};

ws.onclose = function (ev) {
    $("#notice").show();
    $("#notice span:odd").text("The network connection to the API node was disconnected !");
};

window.onpopstate = function () {
    if(history.state == null || !history_pages[history.state.hash]) {
        if(block_list_page) {
            $("#top_div_2").remove();
            $("#top_div_1").append(block_list_page.page);
            $("#main_table tr.data td:nth-child(2) a").off("click").on("click", function () {
                // event.preventDefault();
                var block_hash = $(this).attr("block_hash");
                ws.send(JSON.stringify({msg_type: MSG_EXPLORER, msg_cmd: EXPLORER_BLOCK_PAGE, msg_id:++msg_id, block_hash:block_hash}));
                return false;
            });
            $("#main_table tr.data td:nth-child(5) a").off("click").on("click", function () {
                // event.preventDefault();
                var pubkey = $(this).attr("pubkey");
                ws.send(JSON.stringify({
                    msg_type: MSG_EXPLORER,
                    msg_cmd: EXPLORER_ACCOUNT_PAGE,
                    msg_id: ++msg_id,
                    pubkey: pubkey
                }));
                return false;
            });
            $("nav li:last button").off("click").on("click", function () {
                if (!enable_next) {
                    return;
                }
                ws.send(JSON.stringify({
                    msg_type: MSG_EXPLORER,
                    msg_cmd: EXPLORER_NEXT_PAGE,
                    msg_id: ++msg_id,
                    block_hash: last_hash
                }));
            });
            if(block_list_page.from_main) {
                in_main_page = true;
                setTimeout(function () {
                    ws.send(JSON.stringify({msg_type:MSG_EXPLORER, msg_cmd:EXPLORER_MAIN_PAGE, msg_id:0}));
                }, 5000);
            } else {
                $("nav li:first button").off("click").on("click", function () {
                    if(page_array.length == 0) {
                        return;
                    }
                    if(!enable_next) {
                        $("nav li:last button").removeClass("disabled");
                        enable_next = true;
                    }
                    var obj = page_array.pop();
                    if(page_array.length == 0) {
                        $(this).addClass("disabled");
                        $(this).off("click");
                        enable_previous = false;
                        in_main_page = true;
                        setTimeout(function () {
                            ws.send(JSON.stringify({msg_type:MSG_EXPLORER, msg_cmd:EXPLORER_MAIN_PAGE, msg_id:0}));
                        }, 5000);
                    }
                    last_hash = obj.last_hash;
                    $("#main_table").remove();
                    $("#main_div").prepend(obj.page);
                    $("#main_table tr.data td:nth-child(2) a").off("click").on("click", function () {
                        // event.preventDefault();
                        var block_hash = $(this).attr("block_hash");
                        ws.send(JSON.stringify({msg_type: MSG_EXPLORER, msg_cmd: EXPLORER_BLOCK_PAGE, msg_id:++msg_id, block_hash:block_hash}));
                        return false;
                    });
                    $("#main_table tr.data td:nth-child(5) a").off("click").on("click", function () {
                        // event.preventDefault();
                        var pubkey = $(this).attr("pubkey");
                        ws.send(JSON.stringify({
                            msg_type: MSG_EXPLORER,
                            msg_cmd: EXPLORER_ACCOUNT_PAGE,
                            msg_id: ++msg_id,
                            pubkey: pubkey
                        }));
                        return false;
                    });
                });
            }
        }
    } else {
        $("#top_div_2").remove();
        $("#top_div_1").append(history_pages[history.state.hash]);
        in_main_page = false;
        if(history.state.type == "block") {
            $("#pre_hash a").off("click").on("click", function () {
                // event.preventDefault();
                var block_hash = $(this).attr("block_hash");
                ws.send(JSON.stringify({msg_type: MSG_EXPLORER, msg_cmd: EXPLORER_BLOCK_PAGE, msg_id:++msg_id, block_hash:block_hash}));
                return false;
            });
            $("#miner a").off("click").on("click", function () {
                // event.preventDefault();
                var pubkey = $(this).attr("pubkey");
                ws.send(JSON.stringify({
                    msg_type: MSG_EXPLORER,
                    msg_cmd: EXPLORER_ACCOUNT_PAGE,
                    msg_id: ++msg_id,
                    pubkey: pubkey
                }));
                return false;
            });
            $("#txs a").off("click").on("click", function () {
                // event.preventDefault();
                var tx_hash = $(this).attr("tx_hash");
                ws.send(JSON.stringify({msg_type: MSG_EXPLORER, msg_cmd: EXPLORER_TX_PAGE, msg_id:++msg_id, block_hash:history.state.hash, tx_hash:tx_hash}));
                return false;
            });
        } else if(history.state.type == "account") {
            $("#referrer a").off("click").on("click", function () {
                // event.preventDefault();
                var pubkey = $(this).attr("pubkey");
                ws.send(JSON.stringify({
                    msg_type: MSG_EXPLORER,
                    msg_cmd: EXPLORER_ACCOUNT_PAGE,
                    msg_id: ++msg_id,
                    pubkey: pubkey
                }));
                return false;
            });
            $("#txs a").off("click").on("click", function () {
                // event.preventDefault();
                var tx_hash = $(this).attr("tx_hash");
                var block_hash = $(this).attr("block_hash");
                ws.send(JSON.stringify({msg_type: MSG_EXPLORER, msg_cmd: EXPLORER_TX_PAGE, msg_id:++msg_id, block_hash:block_hash, tx_hash:tx_hash}));
                return false;
            });
        } else if(history.state.type == "tx") {
            $("#owner a").off("click").on("click", function () {
                // event.preventDefault();
                var pubkey = $(this).attr("pubkey");
                ws.send(JSON.stringify({
                    msg_type: MSG_EXPLORER,
                    msg_cmd: EXPLORER_ACCOUNT_PAGE,
                    msg_id: ++msg_id,
                    pubkey: pubkey
                }));
                return false;
            });
            $("#other a").off("click").on("click", function () {
                // event.preventDefault();
                var pubkey = $(this).attr("pubkey");
                ws.send(JSON.stringify({
                    msg_type: MSG_EXPLORER,
                    msg_cmd: EXPLORER_ACCOUNT_PAGE,
                    msg_id: ++msg_id,
                    pubkey: pubkey
                }));
                return false;
            });
            $("#txblock a").off("click").on("click", function () {
                // event.preventDefault();
                var block_hash = $(this).attr("block_hash");
                ws.send(JSON.stringify({msg_type: MSG_EXPLORER, msg_cmd: EXPLORER_BLOCK_PAGE, msg_id:++msg_id, block_hash:block_hash}));
                return false;
            });
        }
    }
};

ws.onmessage = function (ev) {
    var obj = JSON.parse(ev.data);
    if(obj.msg_type == MSG_SYS && obj.msg_cmd == SYS_PONG) {
        setTimeout(function () {
            ws.send(JSON.stringify({msg_type:MSG_SYS, msg_cmd:SYS_PING, msg_id:0}));
        }, 10000);
        return;
    }
    if(obj.msg_type != MSG_EXPLORER) {
        $("#notice").show();
        $("#notice span:odd").text("Invalid message from API node");
        ws.close();
        return;
    }
    if(obj.msg_cmd == EXPLORER_MAIN_PAGE) {
        if (!in_main_page) {
            return;
        }
        $("#main_table").empty();
        $("#main_table").append('<tr class="title">' +
            '<td>Height</td>' +
            '<td>Hash</td>' +
            '<td>UTC</td>' +
            '<td>Zero_bits</td>' +
            '<td>Miner</td>' +
            '<td>Transactions</td>' +
            '</tr>');
        for (var i = 0; i < obj.block_list.length; ++i) {
            var block = obj.block_list[i];
            var dt_str = utc_str(block.utc);
            $("#main_table").append('' +
                '<tr class="data">' +
                '<td>' + block.block_id + '</td>' +
                '<td><a href="javascript:void(0);" block_hash=' + block.block_hash + '>' + block.block_hash + '</a></td>' +
                '<td>' + dt_str + '</td>' +
                '<td>' + block.zero_bits + '</td>' +
                '<td><a href="javascript:void(0);" pubkey=' + block.miner_pubkey + '>' + Base64.decode(block.miner_name) + '</td>' +
                '<td>' + block.tx_num + '</td>' +
                '</tr>');
        }
        $("#main_table tr.data td:nth-child(2) a").off("click").on("click", function () {
            // event.preventDefault();
            var block_hash = $(this).attr("block_hash");
            ws.send(JSON.stringify({
                msg_type: MSG_EXPLORER,
                msg_cmd: EXPLORER_BLOCK_PAGE,
                msg_id: ++msg_id,
                block_hash: block_hash
            }));
            return false;
        });
        $("#main_table tr.data td:nth-child(5) a").off("click").on("click", function () {
            // event.preventDefault();
            var pubkey = $(this).attr("pubkey");
            ws.send(JSON.stringify({
                msg_type: MSG_EXPLORER,
                msg_cmd: EXPLORER_ACCOUNT_PAGE,
                msg_id: ++msg_id,
                pubkey: pubkey
            }));
            return false;
        });
        if (obj.block_list.length < 20) {
            $("nav li:last button").addClass("disabled");
            enable_next = false;
        } else {
            last_hash = obj.block_list[obj.block_list.length - 1].block_hash;
            $("nav li:last button").off("click").on("click", (function () {
                ws.send(JSON.stringify({
                    msg_type: MSG_EXPLORER,
                    msg_cmd: EXPLORER_NEXT_PAGE,
                    msg_id: ++msg_id,
                    block_hash: last_hash
                }));
            }));
        }
        if (!block_list_page) {
            $("#query").off("click").on("click", function () {
                var input_val = $("#input").val();
                if (!/^\d+$/.test(input_val)) {
                    if (input_val.length == 0) {
                        $("#notice").show();
                        $("#notice span:odd").text("Block hash or Account id can't be empty !");
                    } else if (input_val.length != 44) {
                        $("#notice").show();
                        $("#notice span:odd").text("The length of block hash must be 44 bytes !");
                    } else {
                        ws.send(JSON.stringify({
                            msg_type: MSG_EXPLORER,
                            msg_cmd: EXPLORER_QUERY,
                            msg_id: ++msg_id,
                            block_hash: input_val
                        }));
                    }
                } else {
                    var account_id = parseInt(input_val);
                    ws.send(JSON.stringify({
                        msg_type: MSG_EXPLORER,
                        msg_cmd: EXPLORER_QUERY,
                        msg_id: ++msg_id,
                        id: account_id
                    }));
                }
            });
        }
        block_list_page = {};
        block_list_page.page = $("#top_div_2").clone();
        block_list_page.from_main = true;
        setTimeout(function () {
            ws.send(JSON.stringify({msg_type: MSG_EXPLORER, msg_cmd: EXPLORER_MAIN_PAGE, msg_id: 0}));
        }, 5000);
    }else if(obj.msg_cmd == EXPLORER_QUERY) {
        $("#notice").show();
        if(obj.type == 1) {
            $("#notice span:odd").text("Account id does not exist !");
        } else {
            $("#notice span:odd").text("Block hash does not exist !");
        }
    } else if(obj.msg_cmd == EXPLORER_NEXT_PAGE) {
        if (obj.msg_id != msg_id) {
            return;
        }
        in_main_page = false;
        page_array.push({page: $("#main_table").clone(), last_hash: last_hash});
        $("#main_table").empty();
        $("#main_table").append('<tr class="title">' +
            '<td>Height</td>' +
            '<td>Hash</td>' +
            '<td>UTC</td>' +
            '<td>Zero_bits</td>' +
            '<td>Miner</td>' +
            '<td>Transactions</td>' +
            '</tr>');
        for (var i = 0; i < obj.block_list.length; ++i) {
            var block = obj.block_list[i];
            var dt_str = utc_str(block.utc);
            $("#main_table").append('' +
                '<tr class="data">' +
                '<td>' + block.block_id + '</td>' +
                '<td><a href="javascript:void(0);" block_hash=' + block.block_hash + '>' + block.block_hash + '</a></td>' +
                '<td>' + dt_str + '</td>' +
                '<td>' + block.zero_bits + '</td>' +
                '<td><a href="javascript:void(0);" pubkey=' + block.miner_pubkey + '>' + Base64.decode(block.miner_name) + '</td>' +
                '<td>' + block.tx_num + '</td>' +
                '</tr>');
        }
        if (!enable_previous) {
            $("nav li:first button").removeClass("disabled");
            enable_previous = true;
        }
        // $("html,body").animate({scrollTop:0},5000);
        $("nav li:first button").off("click").on("click", function () {
            if (page_array.length == 0) {
                return;
            }
            if (!enable_next) {
                $("nav li:last button").removeClass("disabled");
                enable_next = true;
            }
            var obj = page_array.pop();
            if (page_array.length == 0) {
                $(this).addClass("disabled");
                $(this).off("click");
                enable_previous = false;
                in_main_page = true;
                setTimeout(function () {
                    ws.send(JSON.stringify({msg_type: MSG_EXPLORER, msg_cmd: EXPLORER_MAIN_PAGE, msg_id: 0}));
                }, 5000);
            }
            last_hash = obj.last_hash;
            $("#main_table").remove();
            $("#main_div").prepend(obj.page);
            $("#main_table tr.data td:nth-child(2) a").off("click").on("click", function () {
                // event.preventDefault();
                var block_hash = $(this).attr("block_hash");
                ws.send(JSON.stringify({
                    msg_type: MSG_EXPLORER,
                    msg_cmd: EXPLORER_BLOCK_PAGE,
                    msg_id: ++msg_id,
                    block_hash: block_hash
                }));
                return false;
            });
            $("#main_table tr.data td:nth-child(5) a").off("click").on("click", function () {
                // event.preventDefault();
                var pubkey = $(this).attr("pubkey");
                ws.send(JSON.stringify({
                    msg_type: MSG_EXPLORER,
                    msg_cmd: EXPLORER_ACCOUNT_PAGE,
                    msg_id: ++msg_id,
                    pubkey: pubkey
                }));
                return false;
            });
        });
        $("#main_table tr.data td:nth-child(2) a").off("click").on("click", function () {
            // event.preventDefault();
            var block_hash = $(this).attr("block_hash");
            ws.send(JSON.stringify({
                msg_type: MSG_EXPLORER,
                msg_cmd: EXPLORER_BLOCK_PAGE,
                msg_id: ++msg_id,
                block_hash: block_hash
            }));
            return false;
        });
        $("#main_table tr.data td:nth-child(5) a").off("click").on("click", function () {
            // event.preventDefault();
            var pubkey = $(this).attr("pubkey");
            ws.send(JSON.stringify({
                msg_type: MSG_EXPLORER,
                msg_cmd: EXPLORER_ACCOUNT_PAGE,
                msg_id: ++msg_id,
                pubkey: pubkey
            }));
            return false;
        });
        if (obj.block_list.length < 20) {
            $("nav li:last button").addClass("disabled");
            $("nav li:last button").off("click");
            enable_next = false;
        } else {
            last_hash = obj.block_list[obj.block_list.length - 1].block_hash;
            $("nav li:last button").off("click").on("click", function () {
                if (!enable_next) {
                    return;
                }
                ws.send(JSON.stringify({
                    msg_type: MSG_EXPLORER,
                    msg_cmd: EXPLORER_NEXT_PAGE,
                    msg_id: ++msg_id,
                    block_hash: last_hash
                }));
            });
        }
        block_list_page = {};
        block_list_page.page = $("#top_div_2").clone();
        block_list_page.from_main = false;
    }else if(obj.msg_cmd == EXPLORER_ACCOUNT_PAGE) {
        if (obj.msg_id != msg_id) {
            return;
        }
        in_main_page = false;
        $("#top_div_2").remove();
        var top_div_2 = $('<div id="top_div_2"></div>');
        var check_dict = {};
        var arr_by_time = [];
        for (var i = 0; i < obj.txs.length; ++i) {
            var txobj = obj.txs[i];
            if (!check_dict[txobj.tx]) {
                check_dict[txobj.tx] = true;
                arr_by_time.unshift(txobj);
            }
        }
        top_div_2.html('' +
            '<ol id="path" style="font-size: 1em;" class="breadcrumb">' +
            '<li>Home | Account | <span>' + obj.id + '</span></li>' +
            '</ol>' +
            '<h3 style="margin-bottom: 2em; margin-top: 2em;">' +
            '<strong style="margin-left: 0.5em;">Account details</strong>' +
            '</h3>' +
            '<div id="main_div">' +
            '<table id="main_table" class="table table-striped table-hover">' +
            '</table>' +
            '</div>' +
            '<h3 style="margin-bottom: 2em; margin-top: 4em;">' +
            '<strong style="margin-left: 0.5em;">Recent related transactions (' + arr_by_time.length + ')</strong>' +
            '</h3>' +
            '<table id="txs" class="table table-striped table-hover">' +
            '</table>' +
            '<div style="height: 2em;"></div>');
        $('#top_div_1').append(top_div_2);
        var block_details = '' +
            '<tr class="twofield">' +
            '<td>Account name</td>' +
            '<td>' + Base64.decode(obj.name) + '</td>' +
            '</tr>' +
            '<tr class="twofield">' +
            '<td>Account id</td>' +
            '<td>' + obj.id + '</td>' +
            '</tr>' +
            '<tr class="twofield">' +
            '<td>Balance</td>' +
            '<td>' + obj.balance + ' ASK</td>' +
            '</tr>' +
            '<tr class="twofield">' +
            '<td>Pubkey</td>' +
            '<td>' + obj.pubkey + '</td>' +
            '</tr>' +
            '<tr class="twofield">' +
            '<td>Avatar</td>' +
            '<td>' + obj.avatar + '</td>' +
            '</tr>';
        if (obj.referrer_name) {
            block_details += '' +
                '<tr class="twofield">' +
                '<td>Referrer name</td>' +
                '<td id="referrer"><a href="javascript:void(0);" pubkey=' + obj.referrer_pubkey + '>' + Base64.decode(obj.referrer_name) + '</a></td>' +
                '</tr>';
        }
        block_details += '' +
            '<tr class="twofield">' +
            '<td>Registration time (block height)</td>' +
            '<td>' + obj.reg_block_id + '</td>' +
            '</tr>';
        $("#main_table").append(block_details);
        for (var i = 0; i < arr_by_time.length; ++i) {
            var txobj = arr_by_time[i];
            $("#txs").append('' +
                '<tr class="data">' +
                '<td><a href="javascript:void(0);" tx_hash=' + txobj.tx + ' block_hash=' + txobj.block_hash + '>' + txobj.tx + '</a></td>' +
                '<td>' + utc_str(txobj.utc) + '</td>' +
                '</tr>'
            );
        }
        $("#referrer a").off("click").on("click", function () {
            // event.preventDefault();
            var pubkey = $(this).attr("pubkey");
            ws.send(JSON.stringify({
                msg_type: MSG_EXPLORER,
                msg_cmd: EXPLORER_ACCOUNT_PAGE,
                msg_id: ++msg_id,
                pubkey: pubkey
            }));
            return false;
        });
        $("#txs a").off("click").on("click", function () {
            // event.preventDefault();
            var tx_hash = $(this).attr("tx_hash");
            var block_hash = $(this).attr("block_hash");
            ws.send(JSON.stringify({msg_type: MSG_EXPLORER, msg_cmd: EXPLORER_TX_PAGE, msg_id:++msg_id, block_hash:block_hash, tx_hash:tx_hash}));
            return false;
        });
        var pageobj = $("#top_div_2").clone();
        history_pages[obj.pubkey] = pageobj;
        history.pushState({type: "account", hash: obj.pubkey}, "account", null);
        $("html").scrollTop(0);
    }else if(obj.msg_cmd == EXPLORER_TX_PAGE) {
        if (obj.msg_id != msg_id) {
            return;
        }
        in_main_page = false;
        $("#top_div_2").remove();
        var top_div_2 = $('<div id="top_div_2"></div>');
        top_div_2.html('' +
            '<ol id="path" style="font-size: 1em;" class="breadcrumb">' +
            '<li>Home | Tx | <span>' + obj.tx_hash + '</span></li>' +
            '</ol>' +
            '<h3 style="margin-bottom: 2em; margin-top: 2em;">' +
            '<strong style="margin-left: 0.5em;">Transaction details</strong>' +
            '</h3>' +
            '<div id="main_div">' +
            '<table id="main_table" class="table table-striped table-hover">' +
            '</table>' +
            '</div>' +
            '<h3 style="margin-bottom: 2em; margin-top: 4em;">' +
            '<strong style="margin-left: 0.5em;">Raw data</strong>' +
            '</h3>' +
            '<pre id="raw"></pre>' +
            '<div style="height: 2em;"></div>');
        $('#top_div_1').append(top_div_2);
        var rawobj = JSON.parse(obj.raw);
        var block_details = '' +
            '<tr class="twofield">' +
            '<td>Tx hash</td>' +
            '<td>' + obj.tx_hash + '</td>' +
            '</tr>' +
            '<tr class="twofield">' +
            '<td>Tx type</td>';
        if(obj.type == 1) {
            block_details += '' +
                '<td>1 (Register account)</td>' +
                '</tr>' +
                '<tr class="twofield">' +
                '<td>Reg name</td>' +
                '<td id="owner"><a href="javascript:void(0);" pubkey=' + obj.pubkey + '>' + Base64.decode(obj.name) + '</a></td>' +
                '</tr>' +
                '<tr class="twofield">' +
                '<td>Avatar</td>' +
                '<td>' + obj.avatar + '</td>' +
                '</tr>' +
                '<tr class="twofield">' +
                '<td>Referrer name</td>' +
                '<td id="other"><a href="javascript:void(0);" pubkey=' + obj.referrer_pubkey + '>' + Base64.decode(obj.referrer_name) + '</a></td>' +
                '</tr>';
        } else if(obj.type == 2) {
            block_details += '' +
                '<td>2 (Send coin)</td>' +
                '</tr>' +
                '<tr class="twofield">' +
                '<td>Sender</td>' +
                '<td id="owner"><a href="javascript:void(0);" pubkey=' + obj.pubkey + '>' + Base64.decode(obj.owner) + '</a></td>' +
                '</tr>' +
                '<tr class="twofield">' +
                '<td>Receiver</td>' +
                '<td id="other"><a href="javascript:void(0);" pubkey=' + obj.receiver_pubkey + '>' + Base64.decode(obj.receiver) + '</a></td>' +
                '</tr>' +
                '<tr class="twofield">' +
                '<td>Amount</td>' +
                '<td>' + obj.amount + ' ASK</td>' +
                '</tr>';
            if(obj.memo) {
                block_details += '' +
                    '<tr class="twofield">' +
                    '<td>Memo (base64)</td>' +
                    '<td>' + obj.memo + '</td>' +
                    '</tr>';
            }
        } else if(obj.type == 3) {
            block_details += '' +
                '<td>3 (New topic)</td>' +
                '</tr>' +
                '<tr class="twofield">' +
                '<td>Topic initiator</td>' +
                '<td id="owner"><a href="javascript:void(0);" pubkey=' + obj.pubkey + '>' + Base64.decode(obj.owner) + '</a></td>' +
                '</tr>' +
                '<tr class="twofield">' +
                '<td>Topic reward</td>' +
                '<td>' + obj.reward + ' ASK</td>' +
                '</tr>';
        } else if(obj.type == 4) {
            block_details += '' +
                '<td>4 (Reply to)</td>' +
                '</tr>' +
                '<tr class="twofield">' +
                '<td>Replier</td>' +
                '<td id="owner"><a href="javascript:void(0);" pubkey=' + obj.pubkey + '>' + Base64.decode(obj.owner) + '</a></td>' +
                '</tr>';
        } else if(obj.type == 5) {
            block_details += '' +
                '<td>5 (Give reward)</td>' +
                '</tr>' +
                '<tr class="twofield">' +
                '<td>Rewarder</td>' +
                '<td id="owner"><a href="javascript:void(0);" pubkey=' + obj.pubkey + '>' + Base64.decode(obj.owner) + '</a></td>' +
                '</tr>' +
                '<tr class="twofield">' +
                '<td>Reward amount</td>' +
                '<td>' + obj.reward + ' ASK</td>' +
                '</tr>';
        }
        block_details += '' +
            '<tr class="twofield">' +
            '<td>Tx fee</td>' +
            '<td>2 ASK</td>' +
            '</tr>' +
            '<tr class="twofield">' +
            '<td>Tx utc</td>' +
            '<td>' + utc_str(obj.utc) + '</td>' +
            '</tr>' +
            '<tr class="twofield">' +
            '<td>Tx\'s block height</td>' +
            '<td>' + obj.block_id + '</td>' +
            '</tr>' +
            '<tr class="twofield">' +
            '<td>Tx\'s block hash</td>' +
            '<td id="txblock"><a href="javascript:void(0);" block_hash=' + obj.block_hash + '>' + obj.block_hash + '</a></td>' +
            '</tr>';
        $("#main_table").append(block_details);
        $("#raw").html(syntax_high_light(rawobj));
        $("#owner a").off("click").on("click", function () {
            // event.preventDefault();
            var pubkey = $(this).attr("pubkey");
            ws.send(JSON.stringify({
                msg_type: MSG_EXPLORER,
                msg_cmd: EXPLORER_ACCOUNT_PAGE,
                msg_id: ++msg_id,
                pubkey: pubkey
            }));
            return false;
        });
        $("#other a").off("click").on("click", function () {
            // event.preventDefault();
            var pubkey = $(this).attr("pubkey");
            ws.send(JSON.stringify({
                msg_type: MSG_EXPLORER,
                msg_cmd: EXPLORER_ACCOUNT_PAGE,
                msg_id: ++msg_id,
                pubkey: pubkey
            }));
            return false;
        });
        $("#txblock a").off("click").on("click", function () {
            // event.preventDefault();
            var block_hash = $(this).attr("block_hash");
            ws.send(JSON.stringify({msg_type: MSG_EXPLORER, msg_cmd: EXPLORER_BLOCK_PAGE, msg_id:++msg_id, block_hash:block_hash}));
            return false;
        });
        var pageobj = $("#top_div_2").clone();
        history_pages[obj.tx_hash] = pageobj;
        history.pushState({type: "tx", hash: obj.tx_hash}, "tx", null);
        $("html").scrollTop(0);
    } else if(obj.msg_cmd == EXPLORER_BLOCK_PAGE) {
        if(obj.msg_id != msg_id) {
            return;
        }
        in_main_page = false;
        $("#top_div_2").remove();
        var top_div_2 = $('<div id="top_div_2"></div>');
        top_div_2.html('' +
            '<ol id="path" style="font-size: 1em;" class="breadcrumb">' +
            '<li>Home | Block | <span>' + obj.block_hash + '</span></li>' +
            '</ol>' +
            '<h3 style="margin-bottom: 2em; margin-top: 2em;">' +
            '<strong style="margin-left: 0.5em;">Block details</strong>' +
            '</h3>' +
            '<div id="main_div">' +
            '<table id="main_table" class="table table-striped table-hover">' +
            '</table>' +
            '</div>' +
            '<h3 style="margin-bottom: 2em; margin-top: 4em;">' +
            '<strong style="margin-left: 0.5em;">Transactions (' + obj.tx_num + ')</strong>' +
            '</h3>' +
            '<table id="txs" class="table table-striped table-hover">' +
            '</table>' +
            '<div style="height: 2em;"></div>');
        $('#top_div_1').append(top_div_2);
        var dt_str = utc_str(obj.utc);
        var block_details = '' +
            '<tr class="twofield">' +
            '<td>Block height</td>' +
            '<td>' + obj.block_id + '</td>' +
            '</tr>' +
            '<tr class="twofield">' +
            '<td>Block hash</td>' +
            '<td>' + obj.block_hash + '</td>' +
            '</tr>' +
            '<tr class="twofield">' +
            '<td>Block hash (hex)</td>' +
            '<td>' + base64tohex(obj.block_hash) + '</td>' +
            '</tr>';
        if(obj.pre_hash) {
            block_details += '' +
                '<tr class="twofield">' +
                '<td>Previous block</td>' +
                '<td id="pre_hash"><a href="javascript:void(0);" block_hash=' + obj.pre_hash + '>' + obj.pre_hash + '</a></td>' +
                '</tr>';
        }
        block_details += '' +
            '<tr class="twofield">' +
            '<td>Number of transactions</td>' +
            '<td>' + obj.tx_num + '</td>' +
            '</tr>' +
            '<tr class="twofield">' +
            '<td>Block time (utc)</td>' +
            '<td>' + dt_str + '</td>' +
            '</tr>' +
            '<tr class="twofield">' +
            '<td>Zero_bits</td>' +
            '<td>' + obj.zero_bits + '</td>' +
            '</tr>' +
            '<tr class="twofield">' +
            '<td>Miner name</td>' +
            '<td id="miner"><a href="javascript:void(0);" pubkey=' + obj.miner_pubkey + '>' + Base64.decode(obj.miner_name) + '</a></td>' +
            '</tr>' +
            '<tr class="twofield">' +
            '<td>Block reward</td>' +
            '<td>' + obj.block_reward + ' ASK</td>' +
            '</tr>' +
            '<tr class="twofield">' +
            '<td>Tx reward</td>' +
            '<td>' + obj.tx_num + ' ASK</td>' +
            '</tr>' +
            '<tr class="twofield">' +
            '<td>Referrer reward</td>' +
            '<td>' + obj.tx_num + ' ASK</td>' +
            '</tr>' +
            '<tr class="twofield">' +
            '<td>Total fee</td>' +
            '<td>' + obj.tx_num * 2 + ' ASK</td>' +
            '</tr>';

        $("#main_table").append(block_details);
        for(var i = 0; i < obj.tx_list.length; ++i) {
            var tx_id = obj.tx_list[i];
            $("#txs").append('' +
                '<tr class="data">' +
                '<td><a href="javascript:void(0);" tx_hash=' + tx_id + '>' + tx_id + '</a></td>' +
                '</tr>'
            );
        }
        $("#txs a").off("click").on("click", function () {
            // event.preventDefault();
            var tx_hash = $(this).attr("tx_hash");
            ws.send(JSON.stringify({msg_type: MSG_EXPLORER, msg_cmd: EXPLORER_TX_PAGE, msg_id:++msg_id, block_hash:obj.block_hash, tx_hash:tx_hash}));
            return false;
        });
        $("#pre_hash a").off("click").on("click", function () {
            // event.preventDefault();
            var block_hash = $(this).attr("block_hash");
            ws.send(JSON.stringify({msg_type: MSG_EXPLORER, msg_cmd: EXPLORER_BLOCK_PAGE, msg_id:++msg_id, block_hash:block_hash}));
            return false;
        });
        $("#miner a").off("click").on("click", function () {
            // event.preventDefault();
            var pubkey = $(this).attr("pubkey");
            ws.send(JSON.stringify({
                msg_type: MSG_EXPLORER,
                msg_cmd: EXPLORER_ACCOUNT_PAGE,
                msg_id: ++msg_id,
                pubkey: pubkey
            }));
            return false;
        });
        var pageobj = $("#top_div_2").clone();
        history_pages[obj.block_hash] = pageobj;
        history.pushState({type:"block", hash: obj.block_hash}, "block", null);
        $("html").scrollTop(0);
    }
};
