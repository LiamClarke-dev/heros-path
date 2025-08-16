import {
  calculateDistance,
  calculateRouteDistance,
  formatDistance,
  formatDuration,
  generateJourneyName,
  isValidEmail,
  isValidCoordinate,
  generateId,
} from '../helpers';

describe('Helper Functions', () => {
  describe('calculateDistance', () => {
    it('should calculate distance between two coordinates', () => {
      const coord1 = { latitude: 37.7749, longitude: -122.4194 };
      const coord2 = { latitude: 37.7849, longitude: -122.4094 };
      const distance = calculateDistance(coord1, coord2);
      expect(distance).toBeGreaterThan(0);
      expect(typeof distance).toBe('number');
    });

    it('should return 0 for identical coordinates', () => {
      const coord = { latitude: 37.7749, longitude: -122.4194 };
      const distance = calculateDistance(coord, coord);
      expect(distance).toBe(0);
    });
  });

  describe('calculateRouteDistance', () => {
    it('should calculate total route distance', () => {
      const path = [
        { latitude: 37.7749, longitude: -122.4194 },
        { latitude: 37.775, longitude: -122.4195 },
        { latitude: 37.7751, longitude: -122.4196 },
      ];
      const distance = calculateRouteDistance(path);
      expect(distance).toBeGreaterThan(0);
    });

    it('should return 0 for empty or single point path', () => {
      expect(calculateRouteDistance([])).toBe(0);
      expect(
        calculateRouteDistance([{ latitude: 37.7749, longitude: -122.4194 }])
      ).toBe(0);
    });
  });

  describe('formatDistance', () => {
    it('should format meters correctly', () => {
      expect(formatDistance(500)).toBe('500m');
      expect(formatDistance(999)).toBe('999m');
    });

    it('should format kilometers correctly', () => {
      expect(formatDistance(1000)).toBe('1.0km');
      expect(formatDistance(1500)).toBe('1.5km');
      expect(formatDistance(2000)).toBe('2.0km');
    });
  });

  describe('formatDuration', () => {
    it('should format seconds only', () => {
      expect(formatDuration(30)).toBe('30s');
      expect(formatDuration(59)).toBe('59s');
    });

    it('should format minutes and seconds', () => {
      expect(formatDuration(90)).toBe('1m 30s');
      expect(formatDuration(150)).toBe('2m 30s');
    });

    it('should format hours and minutes', () => {
      expect(formatDuration(3600)).toBe('1h 0m');
      expect(formatDuration(3900)).toBe('1h 5m');
    });
  });

  describe('generateJourneyName', () => {
    it('should generate a journey name from timestamp', () => {
      const timestamp = '2024-01-01T09:30:00Z';
      const name = generateJourneyName(timestamp);
      expect(name).toContain('Journey');
      expect(typeof name).toBe('string');
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email formats', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
    });
  });

  describe('isValidCoordinate', () => {
    it('should validate correct coordinates', () => {
      expect(
        isValidCoordinate({ latitude: 37.7749, longitude: -122.4194 })
      ).toBe(true);
      expect(isValidCoordinate({ latitude: 0, longitude: 0 })).toBe(true);
    });

    it('should reject invalid coordinates', () => {
      expect(isValidCoordinate({ latitude: 91, longitude: 0 })).toBe(false);
      expect(isValidCoordinate({ latitude: 0, longitude: 181 })).toBe(false);
      expect(isValidCoordinate({ latitude: 'invalid', longitude: 0 })).toBe(
        false
      );
      expect(isValidCoordinate(null)).toBe(false);
    });
  });

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(typeof id2).toBe('string');
    });
  });
});
