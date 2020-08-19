const jwt = require("express-jwt");
const secret = require("../.config").secret;

function getTokenFromHeader(req) {
	if (
		req.headers.authorization &&
		req.headers.authorization.split(" ")[0] === "Token"
	) {
		return req.headers.authorization.split(" ")[1];
	}
	return null;
}

const auth = {
	required: jwt({
		secret,
		userProperty: "payload",
		getToken: getTokenFromHeader,
		algorithms: ['HS256']
	}),
	optional: jwt({
		secret,
		userProperty: "payload",
		credentialsRequired: false,
		getToken: getTokenFromHeader,
		algorithms: ['HS256']
	}),
};

module.exports = auth;
