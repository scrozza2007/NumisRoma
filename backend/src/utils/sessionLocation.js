const net = require('net');
const fs = require('fs');
const path = require('path');
const { Reader } = require('@maxmind/geoip2-node');
const logger = require('./logger');

const readers = {};

const isPrivateIpv4 = (ipAddress) => {
  const octets = ipAddress.split('.').map(Number);
  if (octets.length !== 4 || octets.some(octet => !Number.isInteger(octet))) {
    return false;
  }

  return octets[0] === 10
    || octets[0] === 127
    || (octets[0] === 169 && octets[1] === 254)
    || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
    || (octets[0] === 192 && octets[1] === 168);
};

const nonPublicResult = (label, source) => ({
  label,
  source,
  country: null,
  countryCode: null,
  region: null,
  city: null,
  latitude: null,
  longitude: null,
  timezone: null,
  isp: null,
  autonomousSystemNumber: null,
  isAnonymous: false,
  isVpn: false,
  isProxy: false,
  isTor: false
});

const classifyNonPublicIp = (ipAddress) => {
  if (!ipAddress || ipAddress === 'unknown') return nonPublicResult('Unknown location', 'unavailable');
  if (ipAddress === '::1' || ipAddress === '127.0.0.1') {
    return nonPublicResult('Unknown location', 'local_development');
  }
  if (net.isIPv4(ipAddress) && isPrivateIpv4(ipAddress)) {
    return nonPublicResult('Unknown location', 'private_network');
  }
  if (net.isIPv6(ipAddress) && (/^f[cd]/i.test(ipAddress) || /^fe[89ab]/i.test(ipAddress))) {
    return nonPublicResult('Unknown location', 'private_network');
  }
  return null;
};

const getReader = async (name, configuredPath, defaultFilename) => {
  const databasePath = configuredPath || (defaultFilename && path.resolve(__dirname, `../../../geoip/${defaultFilename}`));
  if (!databasePath) return null;
  if (!fs.existsSync(databasePath)) return null;
  if (!readers[name]) {
    readers[name] = Reader.open(databasePath, { watchForUpdates: true }).catch((error) => {
      logger.warn('Optional session location database unavailable', {
        database: name,
        path: databasePath,
        error: error.message
      });
      return null;
    });
  }
  return readers[name];
};

const hasDatabaseFile = (configuredPath, defaultFilename) => {
  const databasePath = configuredPath || (defaultFilename && path.resolve(__dirname, `../../../geoip/${defaultFilename}`));
  return Boolean(databasePath && fs.existsSync(databasePath));
};

const hasAnyGeoIpDatabase = () => [
  hasDatabaseFile(process.env.MAXMIND_CITY_DB_PATH, 'GeoLite2-City.mmdb'),
  hasDatabaseFile(process.env.MAXMIND_ASN_DB_PATH, 'GeoLite2-ASN.mmdb'),
  hasDatabaseFile(process.env.MAXMIND_ISP_DB_PATH, null),
  hasDatabaseFile(process.env.MAXMIND_ANONYMOUS_IP_DB_PATH, null)
].some(Boolean);

const formatCityLocation = (record) => {
  const pieces = [
    record.city?.names?.en,
    record.subdivisions?.[0]?.names?.en,
    record.country?.names?.en
  ].filter(Boolean);
  return pieces.length > 0 ? pieces.join(', ') : 'Unknown location';
};

const safeLookup = (reader, method, ipAddress) => {
  if (!reader) return null;
  try {
    return reader[method](ipAddress);
  } catch (error) {
    logger.debug('No GeoIP record found for session IP', { databaseMethod: method, error: error.message });
    return null;
  }
};

const lookupLocalGeoIp = async (ipAddress, source = 'ip_geolocation') => {
  if (!hasAnyGeoIpDatabase()) {
    return null;
  }

  const [cityReader, asnReader, ispReader, anonymousReader] = await Promise.all([
    getReader('city', process.env.MAXMIND_CITY_DB_PATH, 'GeoLite2-City.mmdb'),
    getReader('asn', process.env.MAXMIND_ASN_DB_PATH, 'GeoLite2-ASN.mmdb'),
    getReader('isp', process.env.MAXMIND_ISP_DB_PATH, null),
    getReader('anonymousIp', process.env.MAXMIND_ANONYMOUS_IP_DB_PATH, null)
  ]);

  const city = safeLookup(cityReader, 'city', ipAddress);
  const asn = safeLookup(asnReader, 'asn', ipAddress);
  const isp = safeLookup(ispReader, 'isp', ipAddress);
  const anonymous = safeLookup(anonymousReader, 'anonymousIP', ipAddress);

  if (!city && !asn && !isp && !anonymous) {
    return null;
  }

  return {
    label: city ? formatCityLocation(city) : 'Unknown location',
    source,
    country: city?.country?.names?.en || null,
    countryCode: city?.country?.isoCode || null,
    region: city?.subdivisions?.[0]?.names?.en || null,
    city: city?.city?.names?.en || null,
    latitude: city?.location?.latitude ?? null,
    longitude: city?.location?.longitude ?? null,
    timezone: city?.location?.timeZone || null,
    isp: isp?.isp || isp?.organization || asn?.autonomousSystemOrganization || null,
    autonomousSystemNumber: isp?.autonomousSystemNumber || asn?.autonomousSystemNumber || null,
    isAnonymous: Boolean(anonymous?.isAnonymous),
    isVpn: Boolean(anonymous?.isAnonymousVpn),
    isProxy: Boolean(anonymous?.isPublicProxy || anonymous?.isResidentialProxy),
    isTor: Boolean(anonymous?.isTorExitNode)
  };
};

const proprietaryGeoResolver = {
  lookup: lookupLocalGeoIp
};

exports.resolveApproximateLocation = async (ipAddress) => {
  const nonPublicLocation = classifyNonPublicIp(ipAddress);
  if (nonPublicLocation) return nonPublicLocation;

  const geo = await proprietaryGeoResolver.lookup(ipAddress);
  return geo ?? nonPublicResult('Unknown location', 'unavailable');
};
