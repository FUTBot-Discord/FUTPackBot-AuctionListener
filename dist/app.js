"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _asyncRedis = require("async-redis");

var _graphqlRequest = require("graphql-request");

var _dotenv = _interopRequireDefault(require("dotenv"));

_dotenv["default"].config();

var graphql = new _graphqlRequest.GraphQLClient(process.env.G_ENDPOINT, {
  headers: {}
});
var redis = (0, _asyncRedis.createClient)({
  host: process.env.REDIS_HOST,
  db: process.env.REDIS_DATABASE,
  retry_strategy: function retry_strategy(options) {
    if (options.error && options.error.code === "ECONNREFUSED") {
      return new Error("The server refused the connection");
    }

    if (options.total_retry_time > 1000 * 60 * 60) {
      return new Error("Retry time exhausted");
    }

    if (options.attempt > 10) {
      return undefined;
    }

    return Math.min(options.attempt * 100, 3000);
  }
});

function init() {
  return _init.apply(this, arguments);
}

function _init() {
  _init = (0, _asyncToGenerator2["default"])(
  /*#__PURE__*/
  _regenerator["default"].mark(function _callee2() {
    var expired_subKey;
    return _regenerator["default"].wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return redis.send_command("config", ["set", "notify-keyspace-events", "Ex"]);

          case 2:
            expired_subKey = "__keyevent@" + process.env.REDIS_DATABASE + "__:expired";
            redis.subscribe(expired_subKey).then(function () {
              return console.log("[i] Subscribed to " + expired_subKey);
            });
            redis.on("message",
            /*#__PURE__*/
            function () {
              var _ref = (0, _asyncToGenerator2["default"])(
              /*#__PURE__*/
              _regenerator["default"].mark(function _callee(channel, message) {
                var aInfo, pInfo, pName;
                return _regenerator["default"].wrap(function _callee$(_context) {
                  while (1) {
                    switch (_context.prev = _context.next) {
                      case 0:
                        if (!(channel !== expired_subKey)) {
                          _context.next = 2;
                          break;
                        }

                        return _context.abrupt("return");

                      case 2:
                        console.log("[a] [".concat(message, "] Expired."));
                        _context.next = 5;
                        return getAuctionById(message);

                      case 5:
                        aInfo = _context.sent;

                        if (!(aInfo == null)) {
                          _context.next = 8;
                          break;
                        }

                        return _context.abrupt("return");

                      case 8:
                        if (!(aInfo.b_club_id == 0)) {
                          _context.next = 11;
                          break;
                        }

                        console.log("[a] [".concat(message, "] No buyer was found."));
                        return _context.abrupt("return", resetTransferPlayer(message));

                      case 11:
                        console.log("[a] [".concat(message, "] Buyer(").concat(aInfo.b_club_id, ") has been found."));
                        _context.next = 14;
                        return addCoinsToClub(aInfo.s_club_id, aInfo.current_bid);

                      case 14:
                        _context.next = 16;
                        return auctionBuyNow(aInfo.id, aInfo.b_club_id);

                      case 16:
                        _context.next = 18;
                        return getPlayerVersionById(aInfo.player_id);

                      case 18:
                        pInfo = _context.sent;
                        pName = pInfo.meta_info.common_name ? pInfo.meta_info.common_name : "".concat(pInfo.meta_info.first_name, " ").concat(pInfo.meta_info.last_name);
                        redis.publish("auctionEnd", JSON.stringify(aInfo));

                      case 21:
                      case "end":
                        return _context.stop();
                    }
                  }
                }, _callee);
              }));

              return function (_x8, _x9) {
                return _ref.apply(this, arguments);
              };
            }());

          case 5:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2);
  }));
  return _init.apply(this, arguments);
}

init();

function getAuctionById(_x) {
  return _getAuctionById.apply(this, arguments);
}

function _getAuctionById() {
  _getAuctionById = (0, _asyncToGenerator2["default"])(
  /*#__PURE__*/
  _regenerator["default"].mark(function _callee3(auction_id) {
    var query, res;
    return _regenerator["default"].wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            query = "{ getAuctionById(id: \"".concat(auction_id, "\") { id player_id b_club_id s_club_id current_bid start_price buy_now end_timestamp } }");
            _context3.next = 3;
            return graphql.request(query);

          case 3:
            res = _context3.sent;
            return _context3.abrupt("return", res.getAuctionById);

          case 5:
          case "end":
            return _context3.stop();
        }
      }
    }, _callee3);
  }));
  return _getAuctionById.apply(this, arguments);
}

function resetTransferPlayer(_x2) {
  return _resetTransferPlayer.apply(this, arguments);
}

function _resetTransferPlayer() {
  _resetTransferPlayer = (0, _asyncToGenerator2["default"])(
  /*#__PURE__*/
  _regenerator["default"].mark(function _callee4(aId) {
    var query;
    return _regenerator["default"].wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            query = "mutation { resetTransferPlayer(auction_id: \"".concat(aId, "\") { id } }");
            _context4.prev = 1;
            _context4.next = 4;
            return graphql.request(query);

          case 4:
            _context4.next = 8;
            break;

          case 6:
            _context4.prev = 6;
            _context4.t0 = _context4["catch"](1);

          case 8:
            return _context4.abrupt("return", true);

          case 9:
          case "end":
            return _context4.stop();
        }
      }
    }, _callee4, null, [[1, 6]]);
  }));
  return _resetTransferPlayer.apply(this, arguments);
}

function addCoinsToClub(_x3, _x4) {
  return _addCoinsToClub.apply(this, arguments);
}

function _addCoinsToClub() {
  _addCoinsToClub = (0, _asyncToGenerator2["default"])(
  /*#__PURE__*/
  _regenerator["default"].mark(function _callee5(club_id, coins) {
    var query;
    return _regenerator["default"].wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            query = "mutation { addCoinsToClub(club_id: \"".concat(club_id, "\", coins: \"").concat(coins, "\") { id } }");
            _context5.prev = 1;
            _context5.next = 4;
            return graphql.request(query);

          case 4:
            _context5.next = 10;
            break;

          case 6:
            _context5.prev = 6;
            _context5.t0 = _context5["catch"](1);
            console.log(_context5.t0);
            return _context5.abrupt("return", false);

          case 10:
            return _context5.abrupt("return", true);

          case 11:
          case "end":
            return _context5.stop();
        }
      }
    }, _callee5, null, [[1, 6]]);
  }));
  return _addCoinsToClub.apply(this, arguments);
}

function auctionBuyNow(_x5, _x6) {
  return _auctionBuyNow.apply(this, arguments);
}

function _auctionBuyNow() {
  _auctionBuyNow = (0, _asyncToGenerator2["default"])(
  /*#__PURE__*/
  _regenerator["default"].mark(function _callee6(auction_id, club_id) {
    var query;
    return _regenerator["default"].wrap(function _callee6$(_context6) {
      while (1) {
        switch (_context6.prev = _context6.next) {
          case 0:
            query = "mutation { changeTransferPlayer(club_id: \"".concat(club_id, "\", auction_id: \"").concat(auction_id, "\") { id } }");
            _context6.prev = 1;
            _context6.next = 4;
            return graphql.request(query);

          case 4:
            _context6.next = 10;
            break;

          case 6:
            _context6.prev = 6;
            _context6.t0 = _context6["catch"](1);
            console.log(_context6.t0);
            return _context6.abrupt("return", false);

          case 10:
            return _context6.abrupt("return", true);

          case 11:
          case "end":
            return _context6.stop();
        }
      }
    }, _callee6, null, [[1, 6]]);
  }));
  return _auctionBuyNow.apply(this, arguments);
}

function getPlayerVersionById(_x7) {
  return _getPlayerVersionById.apply(this, arguments);
}

function _getPlayerVersionById() {
  _getPlayerVersionById = (0, _asyncToGenerator2["default"])(
  /*#__PURE__*/
  _regenerator["default"].mark(function _callee7(id) {
    var query, res;
    return _regenerator["default"].wrap(function _callee7$(_context7) {
      while (1) {
        switch (_context7.prev = _context7.next) {
          case 0:
            query = "{ getPlayerVersionById(id: ".concat(id, ") { def dri id nation_info{ img } pac pas phy meta_info{ common_name last_name first_name img } preferred_position rareflag rating sho min_price club_info{ img } } }");
            _context7.next = 3;
            return graphql.request(query);

          case 3:
            res = _context7.sent;
            return _context7.abrupt("return", res.getPlayerVersionById);

          case 5:
          case "end":
            return _context7.stop();
        }
      }
    }, _callee7);
  }));
  return _getPlayerVersionById.apply(this, arguments);
}