'use strict';

exports.nic = DynApiV3;

const crypto = require('crypto');
const config = require('./config.js');

/*
 * Implement: Dyn Remote Access Update API v3
 * https://help.dyn.com/remote-access-api/perform-update/
 *
 * Deviations for spec:
 * - 'hostname' does NOT support multiple host updates even if they have
 *   same credentials.
 * - HTTP status codes are set appropriately instead of default to 200
 *   even for errors.
 * - 'offline' mode is not implemented.
 */
function DynApiV3(req, res) {
  const logstruct = {
    client_ip: req.ip,
    client_ua: req.header('user-agent'),
    req_authz: req.header('authorization') !== 'undefined',
    req_hostname: req.query.hostname,
    req_myip: req.query.myip,
  };

  if (req.path != '/update') {
    return respond(new Response('Not Found', {status: 404}));
  }

  if (req.method != 'GET' || req.header('user-agent') === undefined) {
    return respond(new Response('badagent', {status: 400}));
  }

  const hostname = req.query.hostname;
  if (hostname === undefined || !config.getRecordEntry(hostname)) {
    return respond(new Response('nohost', {status: 404}));
  }

  const [username, password] = getHttpBasicAuthCreds(req);
  if (username === undefined || !auth(hostname, username, password)) {
    return respond(new Response('badauth', {status: 401}));
  }

  const newAddr = req.query.myip
    ? req.query.myip.toLowerCase()
    : req.ip.toLowerCase();
  Object.assign(logstruct, {new_addr: newAddr}); // logging
  const recordType = newAddr.includes(':') ? 'AAAA' : 'A';
  const recordName = hostname.endsWith('.') ? hostname : `${hostname}.`;

  const zone = config.getZoneForDomain(hostname);
  zone.getRecord(recordName, recordType)
    .then((currentRecord) => {
      const newRecord = zone.record(recordName, recordType, newAddr);
      if (currentRecord) {
        const currentAddr = currentRecord.data[0].toLowerCase();
        Object.assign(logstruct, {current_addr: currentAddr}); // logging
        if (currentAddr == newAddr) {
          return new Response('nochg', {info: currentAddr});
        } else {
          return zone.changeRecord(newRecord, currentRecord);
        }
      } else {
        return zone.changeRecord(newRecord);
      }
    })
    .catch((e) => {
      console.error('DNS API Error: %o', e);
      return new Response('dnserr', {status: 502});
    })
    .then((response) => {
      return response instanceof Response
        ? response
        : new Response('good', {info: newAddr});
    }).then(_ => respond(_));

  function respond(response) {
    if (response instanceof Response) {
      Object.assign(logstruct, {
        code: response.code,
        info: response.info
      }); // logging
      res.status(response.status).send(
        [response.code, response.info].filter(_ => _).join(' ') + '\n'
      );
    } else {
      Object.assign(logstruct, {code: '911'}); // logging
      console.error(
        'respond: Type Error: Received non-Response object: %o', response
      );
      res.status(500).send('911');
    }

    console.log(logstruct);
  }
}

function getHttpBasicAuthCreds(req) {
  let username, password;
  const authType = 'basic'.toLowerCase();
  const header = req.header('authorization');

  if (header !== undefined) {
    const reqAuthType = header.slice(0, authType.length).toLowerCase();
    if (reqAuthType == authType) {
      const credsB64 = header.slice(authType.length + 1);
      const creds = Buffer.from(credsB64, 'base64').toString('ascii');
      [username, password] = creds.split(':');
    }
  }

  return [username, password];
}

function auth(hostname, username, password) {
  const entry = config.getRecordEntry(hostname);

  if (entry === undefined) return false;

  // `crypto.timingSafeEqual` can only compare equal length strings
  if (entry.username.length + entry.password.length !=
      username.length + password.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(entry.username + entry.password),
    Buffer.from(username + password)
  );
}

class Response {
  constructor(code, {info, status=200} = {}) {
    this.code = code;
    this.info = info;
    this.status = status;
  }
}
