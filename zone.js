'use strict';

const GCDNS = require('@google-cloud/dns');
const DEFAULT_TTL = 300;  // seconds

class Zone {
  constructor(projectId, zoneName) {
    this.zone = new GCDNS({projectId: projectId}).zone(zoneName);
  }

  getRecord(name, type) {
    const promise =
      this.zone.getRecords({name: name, type: type})
        .then(([records,]) => {
          if (records.length > 0 && records[0].data && records[0].data.length > 0) {
            return records[0];
          } else {
            return null;
          }
        });

    return promise;
  }

  changeRecord(newRecord, currentRecord) {
    const change = {add: newRecord};
    if (currentRecord != undefined) {
      change.delete = currentRecord;
    }

    return this.zone.createChange(change);
  }

  record(name, type, address, ttl=DEFAULT_TTL) {
    return this.zone.record(type, {
      name: name,
      data: [address],
      ttl: ttl
    });
  }
}

module.exports = Zone;
