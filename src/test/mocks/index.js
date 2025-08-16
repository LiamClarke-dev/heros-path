// Service mocks
export const mockAuthService = {
  signInWithGoogle: jest.fn(),
  signOut: jest.fn(),
  getCurrentUser: jest.fn(),
  storeToken: jest.fn(),
};

export const mockLocationService = {
  requestPermissions: jest.fn(),
  getCurrentLocation: jest.fn(),
  startTracking: jest.fn(),
  stopTracking: jest.fn(),
};

export const mockJourneyService = {
  saveJourney: jest.fn(),
  getUserJourneys: jest.fn(),
  getJourney: jest.fn(),
  deleteJourney: jest.fn(),
};

export const mockPlacesService = {
  searchAlongRoute: jest.fn(),
  getPlaceDetails: jest.fn(),
  savePlaceToUser: jest.fn(),
  getUserSavedPlaces: jest.fn(),
  searchNearbyPlaces: jest.fn(),
};

// Hook mocks
export const mockUseAuth = {
  user: null,
  loading: false,
  signIn: jest.fn(),
  signOut: jest.fn(),
};

export const mockUseLocation = {
  location: null,
  loading: false,
  error: null,
  requestPermissions: jest.fn(),
  getCurrentLocation: jest.fn(),
};

export const mockUseJourneys = {
  journeys: [],
  loading: false,
  error: null,
  saveJourney: jest.fn(),
  deleteJourney: jest.fn(),
};

// Reset all mocks
export const resetAllMocks = () => {
  Object.values(mockAuthService).forEach(mock => mock.mockReset());
  Object.values(mockLocationService).forEach(mock => mock.mockReset());
  Object.values(mockJourneyService).forEach(mock => mock.mockReset());
  Object.values(mockPlacesService).forEach(mock => mock.mockReset());
  Object.values(mockUseAuth).forEach(
    mock => typeof mock === 'function' && mock.mockReset()
  );
  Object.values(mockUseLocation).forEach(
    mock => typeof mock === 'function' && mock.mockReset()
  );
  Object.values(mockUseJourneys).forEach(
    mock => typeof mock === 'function' && mock.mockReset()
  );
};
