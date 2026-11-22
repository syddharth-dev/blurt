// Reanimated runs on the UI thread natively; Jest uses a small stand-in (see the file).
jest.mock('react-native-reanimated', () => require('./src/test/reanimatedMock'));
