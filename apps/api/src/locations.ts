// Configurable launch-market geography. These are city coordinates, not venue listings.
export const launchLocations = [
  { name: 'Visakhapatnam', state: 'Andhra Pradesh', latitude: 17.6868, longitude: 83.2185 },
  { name: 'Vijayawada', state: 'Andhra Pradesh', latitude: 16.5062, longitude: 80.648 },
  { name: 'Guntur', state: 'Andhra Pradesh', latitude: 16.3067, longitude: 80.4365 },
  { name: 'Tirupati', state: 'Andhra Pradesh', latitude: 13.6288, longitude: 79.4192 },
  { name: 'Nellore', state: 'Andhra Pradesh', latitude: 14.4426, longitude: 79.9865 },
  { name: 'Kakinada', state: 'Andhra Pradesh', latitude: 16.9891, longitude: 82.2475 },
  { name: 'Rajahmundry', state: 'Andhra Pradesh', latitude: 17.0005, longitude: 81.804 },
  { name: 'Kurnool', state: 'Andhra Pradesh', latitude: 15.8281, longitude: 78.0373 },
  { name: 'Anantapur', state: 'Andhra Pradesh', latitude: 14.6819, longitude: 77.6006 },
  { name: 'Hyderabad', state: 'Telangana', latitude: 17.385, longitude: 78.4867 },
  { name: 'Warangal', state: 'Telangana', latitude: 17.9689, longitude: 79.5941 },
  { name: 'Karimnagar', state: 'Telangana', latitude: 18.4386, longitude: 79.1288 },
  { name: 'Khammam', state: 'Telangana', latitude: 17.2473, longitude: 80.1514 },
  { name: 'Nizamabad', state: 'Telangana', latitude: 18.6725, longitude: 78.0941 },
  { name: 'Nalgonda', state: 'Telangana', latitude: 17.0575, longitude: 79.2684 },
  { name: 'Siddipet', state: 'Telangana', latitude: 18.1018, longitude: 78.852 },
].map((city) => ({ id: city.name.toLowerCase().replace(/ /g, '-'), ...city }));
