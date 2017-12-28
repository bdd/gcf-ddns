'use strict';

const Zone = require('./zone.js');
const DOMAINS = require('./domains.json');

exports.getZoneForDomain = (hostname) => {
  for (let domain in DOMAINS) {
    if (hostname.endsWith(`.${domain}`)) {
      return new Zone(DOMAINS[domain].projectId, DOMAINS[domain].zoneName);
    }
  }
};

exports.getRecordEntry = (hostname) => {
  for (let domain in DOMAINS) {
    if (hostname.endsWith(`.${domain}`)) {
      if (DOMAINS[domain].records.hasOwnProperty(hostname)) {
        return DOMAINS[domain].records[hostname];
      }
    }
  }
};
