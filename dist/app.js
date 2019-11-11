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
                var aInfo;
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
                        console.log("[e] [".concat(message, "] Expired."));
                        _context.next = 5;
                        return getAuctionById(message);

                      case 5:
                        aInfo = _context.sent;

                        if (!(aInfo.b_club_id == 0)) {
                          _context.next = 9;
                          break;
                        }

                        console.log("[r] [".concat(message, "] No buyer was found."));
                        return _context.abrupt("return", resetTransferPlayer(message));

                      case 9:
                        console.log("[t] [".concat(message, "] Buyer(").concat(aInfo.b_club_id, ") has been found."));

                      case 10:
                      case "end":
                        return _context.stop();
                    }
                  }
                }, _callee);
              }));

              return function (_x3, _x4) {
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
  _regenerator["default"].mark(function _callee3(id) {
    var query, res;
    return _regenerator["default"].wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            query = "{ getAuctionById(id: \"".concat(id, "\") { id player_id b_club_id s_club_id current_bid buy_now } }");
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
    var query, res;
    return _regenerator["default"].wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            query = "mutation { resetTransferPlayer(auction_id: \"".concat(aId, "\") { id } }");
            _context4.next = 3;
            return graphql.request(query);

          case 3:
            res = _context4.sent;
            return _context4.abrupt("return", true);

          case 5:
          case "end":
            return _context4.stop();
        }
      }
    }, _callee4);
  }));
  return _resetTransferPlayer.apply(this, arguments);
}