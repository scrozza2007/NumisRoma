const { resolveApproximateLocation } = require('../../src/utils/sessionLocation');

describe('resolveApproximateLocation', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    global.fetch = jest.fn();
    process.env = { ...OLD_ENV };
    delete process.env.MAXMIND_CITY_DB_PATH;
    delete process.env.MAXMIND_ASN_DB_PATH;
    delete process.env.MAXMIND_ISP_DB_PATH;
    delete process.env.MAXMIND_ANONYMOUS_IP_DB_PATH;
  });

  afterAll(() => {
    process.env = OLD_ENV;
    delete global.fetch;
  });

  test('labels localhost sessions without pretending to know a city', async () => {
    await expect(resolveApproximateLocation('127.0.0.1')).resolves.toMatchObject({
      label: 'Unknown location',
      source: 'local_development'
    });
    await expect(resolveApproximateLocation('::1')).resolves.toMatchObject({ label: 'Unknown location' });
  });

  test('labels private network sessions without sending them to GeoIP', async () => {
    await expect(resolveApproximateLocation('192.168.1.5')).resolves.toMatchObject({
      label: 'Unknown location',
      source: 'private_network'
    });
    await expect(resolveApproximateLocation('10.0.0.4')).resolves.toMatchObject({ source: 'private_network' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('returns unknown for public IPs when no local geolocation database is configured', async () => {
    await expect(resolveApproximateLocation('8.8.8.8')).resolves.toMatchObject({
      label: 'Unknown location',
      source: 'unavailable'
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('does not make external network requests during geolocation resolution', async () => {
    global.fetch.mockRejectedValue(new Error('external geolocation must not be called'));

    await expect(resolveApproximateLocation('217.200.146.218')).resolves.toMatchObject({
      label: 'Unknown location',
      source: 'unavailable'
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
