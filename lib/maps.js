const axios = require('axios');

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

async function getEta(origin, destination) {
  try {
    if (!GOOGLE_MAPS_API_KEY) {
      console.warn('GOOGLE_MAPS_API_KEY not set');
      return null;
    }

    const response = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
      params: {
        origins: origin,
        destinations: destination,
        key: GOOGLE_MAPS_API_KEY,
        mode: 'driving'
      }
    });

    if (response.data.rows && response.data.rows.length > 0) {
      const element = response.data.rows[0].elements[0];

      if (element.status === 'OK') {
        return {
          distance: element.distance.text,
          duration: element.duration.text,
          durationSeconds: element.duration.value
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Maps API error:', error.message);
    throw error;
  }
}

async function getRoute(origin, destination) {
  try {
    if (!GOOGLE_MAPS_API_KEY) {
      console.warn('GOOGLE_MAPS_API_KEY not set');
      return null;
    }

    const response = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
      params: {
        origin: origin,
        destination: destination,
        key: GOOGLE_MAPS_API_KEY,
        mode: 'driving'
      }
    });

    if (response.data.routes && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      return {
        distance: route.legs[0].distance.text,
        duration: route.legs[0].duration.text,
        steps: route.legs[0].steps.map(step => ({
          instruction: step.html_instructions,
          distance: step.distance.text,
          duration: step.duration.text
        }))
      };
    }

    return null;
  } catch (error) {
    console.error('Maps API error:', error.message);
    throw error;
  }
}

module.exports = {
  getEta,
  getRoute
};
