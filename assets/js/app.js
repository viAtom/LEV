var lang = "en_US"; // "en_US"
var output = "";
var lev = angular.module('lev', []).controller('lev-controller', function($scope) {
	$scope.players = false;
	$scope.loading = true;
	$scope.ddragon = "http://ddragon.leagueoflegends.com/cdn/6.21.1";
	$scope.items = {};
	$scope.game = false;
	$scope.games = false;
	$scope.general = false;
	$scope.redTeam = {};
	$scope.blueTeam = {};
	$scope.annonces = [];
	$scope.loadingPerc = 0;
	$scope.loadingMaxPerc = 25;
	$scope.loadingMessage = "Please wait while loading .. ";
	$scope.isReplaying = false;
	$scope.Math = window.Math;
	var intPerc = setInterval(function() { 
		if ($scope.loading) {
			if ($scope.loadingPerc<$scope.loadingMaxPerc) {
				$scope.loadingPerc++; 
				$scope.$apply();
			} 
		}
	}, 10);

	$.getJSON($scope.ddragon+"/data/"+lang+"/item.json", function(data) { 
		$scope.items=data; 
		$scope.loadingMaxPerc+=25;
		$scope.$apply(); 
	});
	$.getJSON('http://api.lolesports.com/api/issueToken', function(issueData) { 
		$scope.loadingMaxPerc+=25;
		$scope.socket = new WebSocket('ws://livestats.proxy.lolesports.com/stats?jwt='+issueData.token);
		$scope.socket.onopen = function() {
			$scope.loadingMaxPerc+=25;
		};
		$scope.socket.onerror = function() {
			$scope.loadingMaxPerc = 0;
			$scope.loadingMessage = "Couldn't connect to Riot LiveStats";
			$scope.$apply();
		}
		$scope.socket.onmessage = function (evt) {
			var data = JSON.parse(evt.data);
			data = Object.assign(ROXSKTG1, data);
			$scope.general = data;
			$scope.games = Object.keys(data);
			$scope.game = Object.keys(data).reverse()[0];
			if ($scope.loading) {
				$scope.players = data[$scope.game].playerStats;
				$scope.loading = false;
				clearInterval(intPerc)
				$scope.getTeamPlayers();
				$scope.socket.onmessage = function (evt) { 
					var data = JSON.parse(evt.data);
					$scope.execData(data);
				}
			} else alert('Error not loading');
			$scope.$apply();
		};
	});

	$scope.execData = function(data) {
		$.each(data, function(gameUpdated, value) {
			if ($scope.general[gameUpdated] == undefined) {
				$scope.general[gameUpdated] = value;
				$scope.games.push(gameUpdated);
				$scope.chooseGame(gameUpdated);
			} else {
				$.each(data[gameUpdated].playerStats, function(i,val) {
					for (key in val) {
						if (key=="deaths") {
							$scope.general[gameUpdated].playerStats[i].isDead = true;
						}
						if ($scope.general[gameUpdated].playerStats[i].isDead==true && key=="x") {
							$scope.general[gameUpdated].playerStats[i].isDead = false;
						}
						$scope.general[gameUpdated].playerStats[i][key] = val[key];
					}
				});
				$.each(data[gameUpdated].teamStats, function(i, val) {
					for (key in val) $scope.general[gameUpdated].teamStats[i][key] = val[key];
				})
				$scope.general[gameUpdated].t = data[gameUpdated].t;
				$scope.general[gameUpdated].gameComplete = data[gameUpdated].gameComplete;
			}
		});
		try { $scope.$apply(); } 
		catch (e) { console.log(e); }
	}

	$scope.chooseGame = function(game) { 
		if ($scope.isReplaying) {
			$scope.isReplaying = false;
			var lastData = {};
			lastData[$scope.game] = replayGames[$scope.game];
			$scope.execData(lastData);
			setTimeout(function() { 
				$scope.chooseGame(game);
			},500);
		} else {
			$scope.game = game; 
			$scope.getTeamPlayers(); 
		}
		
	}

	$scope.replay = function() {
		$scope.isReplaying = true;
		var script = "";
		switch ($scope.game) {
			case "1001960052": script = "SKTSSGG1.js"; break;
			case "1001960063": script = "SKTSSGG2.js"; break;
			case "1001960064": script = "SKTSSGG3.js"; break;
			case "1001960065": script = "SKTSSGG4.js"; break;
			case "1001960067": script = "SKTSSGG5.js"; break;
			default: return false; break;
		}

		$.get('assets/js/'+script, function(data) { eval(data);
			function execReplay(i) {
				if (replayGame[i] && $scope.isReplaying) {
					$scope.execData(replayGame[i]);
					setTimeout(function() { execReplay(i+1) }, 1000);
				} else return true;
			}
			setTimeout(function() { execReplay(0) }, 10);
		 });
	}

	$scope.showLog = function() { output = $scope.general[$scope.game].playerStats; console.log("Active players stats logged in var 'output'");};

	$scope.getAnnonces = function() {
		if ($scope.annonces.length==0) return "";
		else {
			var annonce = $scope.annonces[0];
		}
	}

	$scope.getTeamPlayers = function() {
		var iB = 1, iR = 1;
		$scope.players = $scope.general[$scope.game].playerStats;
		$.each($scope.players, function(i, player) {
			if (player.teamId==100) {
				$scope.blueTeam[iB] = $scope.players[i];
				iB++;
			} else {
				$scope.redTeam[iR] = $scope.players[i];
				iR++;
			}
		});
	}

	getTeamNumber = function(team) {
		if (team=="blue" || team==100) return 100;
		else if (team=="red" || team==200) return 200;
		else throw "Unknown team '"+team+"'";
	}

	$scope.getTeam = function (team) {
		if (getTeamNumber(team)==100) return $scope.blueTeam;
		else if (getTeamNumber(team)==200) return $scope.redTeam;
		else throw "Unknown team '"+team+"'";
	}

	$scope.getInfoTeam = function(team) {
		var k = 0,d = 0,a = 0;
		var gteam=$scope.getTeam(team);
		var infoTeam = {}
		$.each(gteam, function(i, player) {
			k+=player.kills;
			d+=player.deaths;
			a+=player.assists;
		});

		infoTeam['kills'] = k;
		infoTeam['deaths'] = d;
		infoTeam['assists'] = a;
		infoTeam['name'] = gteam[1].summonerName.substring(0,3);

		$.each($scope.general[$scope.game].teamStats[getTeamNumber(team)], function(i, val) {
			infoTeam[i] = val;
		});

		return infoTeam;
	}

	$scope.getNameMatch = function(match) {
		var matchGeneral = $scope.general[match];
		var blueTeam = matchGeneral.playerStats[1].summonerName.substring(0,3);
		var redTeam = matchGeneral.playerStats[10].summonerName.substring(0,3);
		var matchNumber = matchGeneral.generatedName.substring(9,10);
		return blueTeam+" vs "+redTeam+" Game "+matchNumber;
	}

	$scope.getDiffGold = function(player) {
		return $scope.blueTeam[player].tg-$scope.redTeam[player].tg;
	}

	$scope.getDiffGoldColor = function(player) {
		var diff = $scope.getDiffGold(player);
		if (diff==0) return ""
		else if (diff>0) return "background-color: rgb(35, 103, 118);"
		else return "background-color: rgb(110, 43, 48);"
	}

	function pad(n) {
		if (n<10) return "0"+n; else return n;
	}

	$scope.getTime = function() {
		var time = $scope.general[$scope.game].t;
		return pad(Math.round(time/1000/60)) + ":" + pad(Math.round(time/1000%60));
	}

	$scope.hover = function(id) {
		$('#'+id).addClass('hovered');
		$('#'+id+' .champion-square').mouseover();
	}

	$scope.unhover = function(id) {
		$('#'+id).removeClass('hovered');
		$('#'+id+' .champion-square').mouseout();
	}
});
lev.directive('tooltip', function() {
	return function(scope, element, attrs) {
		attrs.$observe('title',function(title){
		element.tooltip('destroy');
		if (jQuery.trim(title)) element.tooltip();
	})
		element.on('$destroy', function() {
			element.tooltip('destroy');
			delete attrs.$$observers['title'];
		});
	}
});
lev.filter('kda', function () { return function (infoTeam) { return infoTeam.kills+" / "+infoTeam.deaths+" / "+infoTeam.assists; }; });
lev.filter('name', function () { return function (infoTeam) { return infoTeam.name; }; });

lev.config(function($sceDelegateProvider) {
	$sceDelegateProvider.resourceUrlWhitelist([
		'self',
		'http://ddragon.leagueoflegends.com/**'
	]);
});