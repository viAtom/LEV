var lang = "en_US"; // "en_US"
var output = "";
var lev = angular.module('lev', []);
lev.controller('lev-controller', function($scope, $timeout) {
	$scope.players = false;
	$scope.loading = true;
	$scope.ddragon = "http://ddragon.leagueoflegends.com/cdn/";
	$scope.items = {};
	$scope.game = false;
	$scope.games = false;
	$scope.general = false;
	$scope.blueTeam = {};
	$scope.redTeam = {};
	$scope.annonces = [];
	$scope.loadingPerc = 0;
	$scope.loadingMaxPerc = 20;
	$scope.loadingMessage = "Please wait while loading .. ";
	$scope.isReplaying = false;
	$scope.Math = window.Math;
	var intPerc = setInterval(function() {
		if ($scope.loading) {
			if ($scope.loadingPerc < $scope.loadingMaxPerc) {
				$scope.loadingPerc++;
				$scope.$apply();
			}
		}
	}, 10);

	$.getJSON("https://ddragon.leagueoflegends.com/api/versions.json", function(data) {
		$scope.ddragon += data[0];
		$scope.loadingMaxPerc += 20;
		$scope.$apply();
		$.getJSON($scope.ddragon + "/data/" + lang + "/item.json", function(data) {
			$scope.items = data;
			$scope.loadingMaxPerc += 20;
			$scope.$apply();
		});
	})

	$.getJSON('http://api.lolesports.com/api/issueToken', function(issueData) {
		$scope.loadingMaxPerc += 20;
		$scope.socket = new WebSocket('ws://livestats.proxy.lolesports.com/stats?jwt=' + issueData.token);
		$scope.socket.onopen = function() {
			$scope.loadingMaxPerc += 20;
		};
		$scope.socket.onerror = function() {
			$scope.loadingMaxPerc = 0;
			$scope.loadingMessage = "Couldn't connect to Riot LiveStats";
			$scope.$apply();
		}
		$scope.socket.onmessage = function(evt) {
			var data = JSON.parse(evt.data);
			$scope.general = data;
			$scope.games = Object.keys(data);
			$scope.game = Object.keys(data).reverse()[0];
			if ($scope.loading) {
				$scope.players = data[$scope.game].playerStats;
				$scope.loading = false;
				clearInterval(intPerc)
				$scope.getTeamPlayers();
				$scope.socket.onmessage = function(evt) {
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
				$.each(data[gameUpdated].playerStats, function(i, val) {
					for (key in val) {
						$scope.general[gameUpdated].playerStats[i][key] = val[key];
					}
					var player = $scope.general[gameUpdated].playerStats[i];
					if (val.h && val.h==0) player.baronActive = false;
					if (val.pentaKills)	addAnnonce(player.summonerName+" ("+player.championName+") PENTAKILL !!!", 4);
					else if (val.quadraKills) addAnnonce(player.summonerName+" ("+player.championName+") Quadra Kill !!", 3);
					else if (val.tripleKills) addAnnonce(player.summonerName+" ("+player.championName+") Triple Kill !", 3);
					else if (val.doubleKills) addAnnonce(player.summonerName+" ("+player.championName+") Double Kill", 2);
					else if (val.kills) addAnnonce(player.summonerName+" ("+player.championName+") has slain an enemy", 2);
				});
				$.each(data[gameUpdated].teamStats, function(teamId, val) {
					for (key in val) {
						$scope.general[gameUpdated].teamStats[teamId][key] = val[key];
					}
					var team = $scope.general[gameUpdated].playerStats[teamId/20].summonerName.split(" ")[0];
					if (val.baronsKilled) {
						addAnnonce(team+" has slain the Baron Nashor", 4);
						$.each($scope.general[gameUpdated].playerStats, function(iP, player) {
							if (player.teamId==teamId) player.baronActive=true;
						});
						$timeout(function() { 
							$.each($scope.general[gameUpdated].playerStats, function(iP, player) {
								if (player.teamId==teamId) player.baronActive=false;
							});
						}, 210*1000);
					}
					if (val.dragonsKilled) addAnnonce(team+" has killed a dragon", 2);
					if (val.towersKilled) addAnnonce(team+" has destroyed a tower", 2);
					if (val.inhibitorsKilled) addAnnonce(team+" has destroyed an inhibitor", 3);
				})
				$scope.general[gameUpdated].t = data[gameUpdated].t;
				if (data[gameUpdated].gameComplete) {
					$scope.general[gameUpdated].gameComplete = data[gameUpdated].gameComplete;
					var blueTeamWin = $scope.general[gameUpdated].teamStats[100].matchVictory==1;
					var winner = 0;
					var loser = 0;
					if (blueTeamWin) {
						winner = $scope.general[gameUpdated].playerStats[1].summonerName.split(" ")[0];
						loser = $scope.general[gameUpdated].playerStats[10].summonerName.split(" ")[0];
					} else {
						winner = $scope.general[gameUpdated].playerStats[10].summonerName.split(" ")[0];
						loser = $scope.general[gameUpdated].playerStats[1].summonerName.split(" ")[0];
					}
					addAnnonce(winner+ " VICTORY against "+loser, 4, gameUpdated);
				}
			}
		});
		try { $scope.$apply(); } catch (e) { console.log(e); }
	}

	$scope.chooseGame = function(game) {
		if ($scope.isReplaying) {
			$scope.isReplaying = false;
			var lastData = {};
			lastData[$scope.game] = replayGames[$scope.game];
			setTimeout(function() {
				$scope.execData(lastData);
			}, 250);
		}
		$scope.game = game;
		$scope.getTeamPlayers();
	}

	$scope.replay = function() {
		$scope.isReplaying = true;
		var script = "";
		switch ($scope.game) {
			case "1001960052":
				script = "SKTSSGG1.js";
				break;
			case "1001960063":
				script = "SKTSSGG2.js";
				break;
			case "1001960064":
				script = "SKTSSGG3.js";
				break;
			case "1001960065":
				script = "SKTSSGG4.js";
				break;
			case "1001960067":
				script = "SKTSSGG5.js";
				break;
			default:
				return false;
				break;
		}

		$.get('assets/js/' + script, function(data) {
			eval(data);

			function execReplay(i) {
				if (replayGame[i] && $scope.isReplaying) {
					$scope.execData(replayGame[i]);
					setTimeout(function() { execReplay(i + 1) }, 1000);
				} else return true;
			}
			setTimeout(function() { execReplay(0) }, 10);
		});
	}

	$scope.showLog = function() {
		$.each($scope.general[$scope.game].playerStats, function(iP, player) {
			player.baronActive=true;
		});
	};

	addAnnonce = function(text, time) {
		time = typeof time !== 'undefined' ? time : 2;
		$scope.annonces.push({"text":text, "time":time, "until":-1});
		$scope.annonces.push({"text":"", "time":1, "until":-1});
	}

	$scope.getAnnonces = function() {
		if ($scope.annonces.length == 0) return "";
		else {
			var annonce = $scope.annonces[0];
			if (annonce.until==-1) {
				$scope.annonces[0].until = Date.now()+annonce.time*1000;
				return annonce.text;
			} else if (Date.now() < annonce.until) {
				$timeout(function() { }, annonce.until-Date.now());
				return annonce.text;
			} else {
				$scope.annonces.shift();
				return $scope.getAnnonces();
			}
		}
	}

	$scope.getTeamPlayers = function() {
		var iB = 1,
			iR = 1;
		$scope.players = $scope.general[$scope.game].playerStats;
		$.each($scope.players, function(i, player) {
			if (player.teamId == 100) {
				$scope.blueTeam[iB] = $scope.players[i];
				iB++;
			} else {
				$scope.redTeam[iR] = $scope.players[i];
				iR++;
			}
		});
	}

	getTeamNumber = function(team) {
		if (team == "blue" || team == 100) return 100;
		else if (team == "red" || team == 200) return 200;
		else throw "Unknown team '" + team + "'";
	}

	$scope.getTeam = function(team) {
		if (getTeamNumber(team) == 100) return $scope.blueTeam;
		else if (getTeamNumber(team) == 200) return $scope.redTeam;
		else throw "Unknown team '" + team + "'";
	}

	$scope.getInfoTeam = function(team) {
		if ($scope.game) {
			var k = 0,
				d = 0,
				a = 0;
				tg = 0;
			var gteam = $scope.getTeam(team);
			var infoTeam = $scope.general[$scope.game].teamStats[getTeamNumber(team)];
			$.each(gteam, function(i, player) {
				k += player.kills;
				d += player.deaths;
				a += player.assists;
				tg += player.tg;
			});

			infoTeam['kills'] = k;
			infoTeam['deaths'] = d;
			infoTeam['assists'] = a;
			infoTeam['tg'] = tg;
			infoTeam['name'] = gteam[1].summonerName.split(" ")[0];

			return [infoTeam];
		} else return {};
	}

	$scope.getNameMatch = function(match) {
		var matchGeneral = $scope.general[match];
		if (matchGeneral) {
			var matchName = matchGeneral.generatedName.split("|");
			var blueTeam = matchName[0];
			var redTeam = matchName[1];
			var matchNumber = matchName[2].substr(1);
			return blueTeam + " vs " + redTeam + " Game " + matchNumber;
		} else return "error";
	}

	$scope.getDiffGold = function(player) {
		return $scope.blueTeam[player].tg - $scope.redTeam[player].tg;
	}

	$scope.getDiffGoldColor = function(player) {
		var diff = $scope.getDiffGold(player);
		if (diff == 0) return ""
		else if (diff > 0) return "background-color: rgb(35, 103, 118);"
		else return "background-color: rgb(110, 43, 48);"
	}

	$scope.isEnergyChampion = function(key) {
		// Akali, Kennen, LeeSin, Shen, Zed
		var energyChampions = ["Akali", "Kennen", "LeeSin", "Shen", "Zed"];
		return (energyChampions.indexOf(key)!=-1);
	}

	$scope.isRedbarChampion = function(key) {
		// Gnar, Rek'sai, Renekton, Rengar, Rumble, Shyvana, Tryndamere, Yasuo
		var redbarChampions = ["Gnar", "RekSai", "Renekton", "Rengar", "Rumble", "Shyvana", "Tryndamere", "Yasuo"]
		return (redbarChampions.indexOf(key)!=-1);
	}

	$scope.isGameLive = function(match) {
		var match = $scope.general[match];
		return !match.gameComplete;
	}

	function pad(n) {
		if (n < 10) return "0" + n;
		else return n;
	}

	$scope.getTime = function() {
		var time = $scope.general[$scope.game].t;
		return pad(Math.round(time / 1000 / 60)) + ":" + pad(Math.round(time / 1000 % 60));
	}

	$scope.hover = function(id) {
		$('#' + id).addClass('hovered');
		$('#' + id + ' .champion-square').mouseover();
	}

	$scope.unhover = function(id) {
		$('#' + id).removeClass('hovered');
		$('#' + id + ' .champion-square').mouseout();
	}
});
lev.directive('tooltip', function() {
	return function(scope, element, attrs) {
		attrs.$observe('title', function(title) {
			element.tooltip('destroy');
			if (jQuery.trim(title)) element.tooltip();
		})
		element.on('$destroy', function() {
			element.tooltip('destroy');
			delete attrs.$$observers['title'];
		});
	}
});

lev.config(function($sceDelegateProvider) {
	$sceDelegateProvider.resourceUrlWhitelist([
		'self',
		'http://ddragon.leagueoflegends.com/**'
	]);
});