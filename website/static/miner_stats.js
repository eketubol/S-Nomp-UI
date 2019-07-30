var workerHashrateData;
var workerHashrateChart;
var workerHistoryMax = 160;

var statData;
var totalHash;
var totalImmature;
var totalBal;
var totalPaid;
var totalShares;


function getReadableHashRateString(hashrate){
	hashrate = (hashrate * 2);
	if (hashrate < 1000000) {
		return (Math.round(hashrate / 1000) / 1000 ).toFixed(2)+' Sol/s';
	}
	var byteUnits = [ ' Sol/s', ' KSol/s', ' MSol/s', ' GSol/s', ' TSol/s', ' PSol/s' ];
	var i = Math.floor((Math.log(hashrate/1000) / Math.log(1000)) - 1);
	hashrate = (hashrate/1000) / Math.pow(1000, i + 1);
	return hashrate.toFixed(2) + byteUnits[i];
}

function timeOfDayFormat(timestamp){
    var dStr = d3.time.format('%I:%M %p')(new Date(timestamp));
    if (dStr.indexOf('0') === 0) dStr = dStr.slice(1);
    return dStr;
}

function getWorkerNameFromAddress(w) {
	var worker = w;
	if (w.split(".").length > 1) {
		worker = w.split(".")[1];
		if (worker == null || worker.length < 1) {
			worker = "noname";
		}
	} else {
		worker = "noname";
	}
	return worker;
}

function buildChartData(){
    var workers = {};
	for (var w in statData.history) {
		var worker = getWorkerNameFromAddress(w);
		var a = workers[worker] = (workers[worker] || {
			hashrate: []
		});
		for (var wh in statData.history[w]) {
			a.hashrate.push([statData.history[w][wh].time * 1000, statData.history[w][wh].hashrate]);
		}
		if (a.hashrate.length > workerHistoryMax) {
			workerHistoryMax = a.hashrate.length;
		}
	}
	
	var i=0;
    workerHashrateData = [];
    for (var worker in workers){
        workerHashrateData.push({
            key: worker,
			disabled: (i > Math.min((_workerCount-1), 3)),
            values: workers[worker].hashrate
        });
		i++;
    }
}

function updateChartData(){
    var workers = {};
	for (var w in statData.history) {
		var worker = getWorkerNameFromAddress(w);
		// get a reference to lastest workerhistory
		for (var wh in statData.history[w]) { }
		//var wh = statData.history[w][statData.history[w].length - 1];
		var foundWorker = false;
		for (var i = 0; i < workerHashrateData.length; i++) {
			if (workerHashrateData[i].key === worker) {
				foundWorker = true;
				if (workerHashrateData[i].values.length >= workerHistoryMax) {
					workerHashrateData[i].values.shift();
				}
				workerHashrateData[i].values.push([statData.history[w][wh].time * 1000, statData.history[w][wh].hashrate]);
				break;
			}
		}
		if (!foundWorker) {
			var hashrate = [];
			hashrate.push([statData.history[w][wh].time * 1000, statData.history[w][wh].hashrate]);
			workerHashrateData.push({
				key: worker,
				values: hashrate
			});
			rebuildWorkerDisplay();
			return true;
		}
	}
	triggerChartUpdates();
	return false;
}

function calculateAverageHashrate(worker) {
	var count = 0;
	var total = 1;
	var avg = 0;
	for (var i = 0; i < workerHashrateData.length; i++) {
		count = 0;
		for (var ii = 0; ii < workerHashrateData[i].values.length; ii++) {
			if (worker == null || workerHashrateData[i].key === worker) {
				count++;
				avg += parseFloat(workerHashrateData[i].values[ii][1]);
			}
		}
		if (count > total)
			total = count;
	}
	avg = avg / total;
	return avg;
}

function triggerChartUpdates(){
    workerHashrateChart.update();
}

function displayCharts() {
    nv.addGraph(function() {
        workerHashrateChart = nv.models.lineChart()
            .margin({left: 80, right: 30})
            .x(function(d){ return d[0] })
            .y(function(d){ return d[1] })
            .useInteractiveGuideline(true);

        workerHashrateChart.xAxis.tickFormat(timeOfDayFormat);

        workerHashrateChart.yAxis.tickFormat(function(d){
            return getReadableHashRateString(d);
        });
        d3.select('#workerHashrate').datum(workerHashrateData).call(workerHashrateChart);
        return workerHashrateChart;
    });
}

function updateStats() {
	totalHash = statData.totalHash;
	totalPaid = statData.paid;
	totalBal = statData.balance;
	totalImmature = statData.immature;
	totalShares = statData.totalShares;
	// do some calculations
	var _blocktime = 250;
	var _networkHashRate = parseFloat(statData.networkSols) * 1.2;
	var _myHashRate = (totalHash / 1000000) * 2;
	var luckDays =  ((_networkHashRate / _myHashRate * _blocktime) / (24 * 60 * 60)).toFixed(3);
	// update miner stats
	$("#statsHashrate").text(getReadableHashRateString(totalHash));
	$("#statsHashrateAvg").text(getReadableHashRateString(calculateAverageHashrate(null)));
	$("#statsLuckDays").text(luckDays);
	$("#statsTotalImmature").text(totalImmature);
	$("#statsTotalBal").text(totalBal);
	$("#statsTotalPaid").text(totalPaid);
	$("#statsTotalShares").text(totalShares.toFixed(2));
}
function updateWorkerStats() {
	// update worker stats
	var i=0;
	for (var w in statData.workers) { i++;
		var htmlSafeWorkerName = w.split('.').join('_').replace(/[^\w\s]/gi, '');
		var saneWorkerName = getWorkerNameFromAddress(w);
		$("#statsHashrate"+htmlSafeWorkerName).text(getReadableHashRateString(statData.workers[w].hashrate));
		$("#statsHashrateAvg"+htmlSafeWorkerName).text(getReadableHashRateString(calculateAverageHashrate(saneWorkerName)));
		$("#statsLuckDays"+htmlSafeWorkerName).text(statData.workers[w].luckDays);
		$("#statsPaid"+htmlSafeWorkerName).text(statData.workers[w].paid);
		$("#statsBalance"+htmlSafeWorkerName).text(statData.workers[w].balance);
		$("#statsShares"+htmlSafeWorkerName).text(Math.round(statData.workers[w].currRoundShares * 100) / 100);
		$("#statsDiff"+htmlSafeWorkerName).text(statData.workers[w].diff);
	}
}
function addWorkerToDisplay(name, htmlSafeName, workerObj) {
	var htmlToAdd = "";
	htmlToAdd = '<div class="col-lg-3 col-md-6 col-sm-12"><div class="card card-stats">';
	if (htmlSafeName.indexOf("_") >= 0) {
		htmlToAdd+='<div class="card-header card-header-primary card-header-icon">';
		htmlToAdd+='<div class="card-icon"><i class="fas fa-user"></i></div>';
		htmlToAdd+='<p class="card-category"></p>';
		htmlToAdd+='<h3 class="card-title"><small><span id="networkHashrate">'+htmlSafeName.substr(htmlSafeName.indexOf("_")+1,htmlSafeName.length)+'</span></small></h3></div>';
	} else {
		htmlToAdd+= '<div class="boxLowerHeader">noname</div>';
		htmlToAdd+='<div class="card-header card-header-warning card-header-icon">';
		htmlToAdd+='<div class="card-icon"><i class="material-icons">content_copy</i></div>';
		htmlToAdd+='<p class="card-category">noname</p>';
		htmlToAdd+='<h3 class="card-title"></h3></div>';
	}
	htmlToAdd+=''
	htmlToAdd+='<div class="stats" style="mergin-left:10px;"><i class="material-icons text-orange"></i><a>';
	htmlToAdd+='<div><i class="fa fa-tachometer"></i> <span id="statsHashrate'+htmlSafeName+'">'+getReadableHashRateString(workerObj.hashrate)+'</span> (Now)</div>';
	htmlToAdd+='<div><i class="fa fa-tachometer"></i> <span id="statsHashrateAvg'+htmlSafeName+'">'+getReadableHashRateString(calculateAverageHashrate(name))+'</span> (Avg)</div>';
	htmlToAdd+='<div><i class="fa fa-shield"></i> <small>Diff:</small> <span id="statsDiff'+htmlSafeName+'">'+workerObj.diff+'</span></div>';
	htmlToAdd+='<div><i class="fa fa-cog"></i> <small>Shares:</small> <span id="statsShares'+htmlSafeName+'">'+(Math.round(workerObj.currRoundShares * 100) / 100)+'</span></div>';
	htmlToAdd+='</div></div>';
	$("#boxesWorkers").html($("#boxesWorkers").html()+htmlToAdd);
}

function rebuildWorkerDisplay() {
	$("#boxesWorkers").html("");
	var i=0;
	for (var w in statData.workers) { i++;
		var htmlSafeWorkerName = w.split('.').join('_').replace(/[^\w\s]/gi, '');
		var saneWorkerName = getWorkerNameFromAddress(w);
		addWorkerToDisplay(saneWorkerName, htmlSafeWorkerName, statData.workers[w]);
	}
}

// resize chart on window resize
nv.utils.windowResize(triggerChartUpdates);


// grab initial stats
$.getJSON('/api/worker_stats?'+_miner, function(data){
    statData = data;
    for (var w in statData.workers) { _workerCount++; }
    buildChartData();
    displayCharts();
    rebuildWorkerDisplay();    
    updateStats();
    progressBar();
    getMarketStats();
    walletTransactions();
});

// live stat updates
statsSource.addEventListener('message', function(e){
	// TODO, create miner_live_stats...
	// miner_live_stats will return the same josn except without the worker history
	// FOR NOW, use this to grab updated stats
	$.getJSON('/api/worker_stats?'+_miner, function(data){
		statData = data;
		// check for missing workers
		var wc = 0;
		var rebuilt = false;
		// update worker stats
		for (var w in statData.workers) { wc++; }
		// TODO, this isn't 100% fool proof!
		if (_workerCount != wc) {
			if (_workerCount > wc) {
				rebuildWorkerDisplay();
				rebuilt = true;
			}
			_workerCount = wc;
		}
		rebuilt = (rebuilt || updateChartData());
		updateStats();
		if (!rebuilt) {
			updateWorkerStats();
		}
	});
});

//Update stats based on 60 second counter vs live_stats
setInterval(function() {
    rebuildprogressBar();
    walletStats();

    $.getJSON('/api/worker_stats?'+_miner, function(data){
        statData = data;
        // check for missing workers
        var wc = 0;
        var rebuilt = false;
        // update worker stats
        for (var w in statData.workers) { wc++; }
        // TODO, this isn't 100% fool proof!
        if (_workerCount != wc) {
            if (_workerCount > wc) {
                rebuildWorkerDisplay();
                rebuilt = true;
            }
            _workerCount = wc;
        }
        rebuilt = (rebuilt || updateChartData());
        updateStats();
        if (!rebuilt) {
            updateWorkerStats();
            walletStats();
        }
    });
}, 60 * 1000);

//Tabbed Stats - static

    function rebuildprogressBar() {
        $("#effortBar").html("");
        progressBar();
    }

    function progressBar() {

        //Progress bar for effort
		totalShares = statData.totalShares;
		var _coin = statData.coin;
		var blockReward = statData.blockreward.blockReward;
		var shareCount = statData.currentroundshares;
        var effortCount = (totalShares / shareCount * 100);
        var effortCount = effortCount.toFixed(2);
        var effortPercent = effortCount;
        if (effortPercent <= 15) { effortPercent = 15 }
        if (effortCount >= 100) { effortCount = 100 }
        var shareReward = (blockReward * effortCount / 100);
        var shareReward = shareReward.toFixed(2);
		console.log(_coin);
		console.log(statData);
		console.log(shareReward);
        console.log(effortCount);
		console.log(blockReward);
		console.log(effortPercent);
        var htmlToAdd2 = "";
        htmlToAdd2 = '<div class="effortBar" style="width:45%; float: right;margin-right: 1%;margin-bottom:1%;><span><i class="fa fa-spin fa-cog"></i> Block Share: <span class="pull-right"><a  data-toggle="tooltip" title="Your current total of submitted shares this round.">'+totalShares.toFixed(2)+' Shares</a> | <a data-toggle="tooltip" title="Your estimated reward.">'+shareReward+' '+_coin+'</a></span></span><div class="progress progress-lg mb-10 "><div class="progress-bar progress-bar-info" aria-valuemin="0%" aria-valuemax="100%" style="background:#2b2b3b; width: '+effortPercent+'%;" role="progressbar">'+effortCount+' %</div></div></div>';
        $("#effortBar").html($("#effortBar").html()+htmlToAdd2);
	}





function getMarketStats() {
	var _cgID = statData.blockreward.cgID;

    $.ajax({
        url: 'https://api.coingecko.com/api/v3/coins/' + _cgID + '?localization=en&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=true',
        dataType: 'json',
        success: function (geck_json) {

            var usd = geck_json.market_data.current_price.usd;
            var btc = geck_json.market_data.current_price.btc;
            var changeh1hbtc = geck_json.market_data.price_change_percentage_1h_in_currency.btc;
            var change24hbtc = geck_json.market_data.price_change_percentage_24h_in_currency.btc;
            var vol24hrbtc = geck_json.market_data.total_volume.btc;
            var vol24hrusd = geck_json.market_data.total_volume.usd;
            var symbol = geck_json.symbol;
            var marketcaprank = geck_json.market_data.market_cap_rank;
            var marketcapusd = geck_json.market_data.market_cap.usd;
            var marketcapbtc = geck_json.market_data.market_cap.btc;
			var usdPaid = totalPaid * usd;
			$('#statsMarket' + symbol + 'PriceUSD').text(usd.toFixed(2));
			$('#statstotalPaidUSD').text(usdPaid.toFixed(2));
            $('#statsMarket' + symbol + 'PriceBTC').text(btc.toFixed(8));

            $('#' + symbol + 'btc1h').text(changeh1hbtc);
            $('#' + symbol + 'btc24h').text(change24hbtc);

            if (changeh1hbtc != 0)
                if (changeh1hbtc < 0) {
                    $('#' + symbol + 'btc1hArrow').removeClass('fa-arrow-right').removeClass('fa-arrow-up').addClass('fa-arrow-down');
                    $('#' + symbol + 'btc1hArrow').parent().removeClass('text-success').addClass('text-danger');
                } else {
                    $('#' + symbol + 'btc1hArrow').removeClass('fa-arrow-right').removeClass('fa-arrow-down').addClass('fa-arrow-up');
                }


            if (change24hbtc != 0)
                if (change24hbtc < 0) {
                    $('#' + symbol + 'btc24hArrow').removeClass('fa-arrow-right').removeClass('fa-arrow-up').addClass('fa-arrow-down');
                    $('#' + symbol + 'btc24hArrow').parent().removeClass('text-success').addClass('text-danger');
                } else {
                    $('#' + symbol + 'btc24hArrow').removeClass('fa-arrow-right').removeClass('fa-arrow-down').addClass('fa-arrow-up');
                }

            $('#statsMarket' + symbol + 'VolumeUSD').text(vol24hrusd.toFixed(2).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","));
            $('#statsMarket' + symbol + 'VolumeBTC').text(vol24hrbtc.toFixed(2).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","));
            $('#statsMarket' + symbol + 'MarketCapUSD').text(marketcapusd.toFixed(2).toString());
            $('#statsMarket' + symbol + 'MarketCapBTC').text(marketcapbtc.toFixed(2).toString());
            $('#statsMarket' + symbol + 'Rank').text(marketcaprank);

        }
    });
}