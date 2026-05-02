const GOOGLE_GEOCODING_ENDPOINT = 'https://maps.googleapis.com/maps/api/geocode/json';

const parseCoordinate = (value) => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        return null;
    }

    return Number(value.toFixed(6));
};

exports.geocodeAddress = async (address) => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey || !address || !String(address).trim()) {
        return null;
    }

    try {
        const url = new URL(GOOGLE_GEOCODING_ENDPOINT);
        url.searchParams.set('address', address);
        url.searchParams.set('key', apiKey);
        url.searchParams.set('region', 'id');

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Geocoding HTTP ${response.status}`);
        }

        const payload = await response.json();

        if (payload.status !== 'OK' || !Array.isArray(payload.results) || payload.results.length === 0) {
            return null;
        }

        const firstResult = payload.results[0];
        const location = firstResult.geometry?.location;

        if (!location) {
            return null;
        }

        return {
            formattedAddress: firstResult.formatted_address || address,
            latitude: parseCoordinate(location.lat),
            longitude: parseCoordinate(location.lng),
        };
    } catch (error) {
        console.error('Geocoding pickup gagal:', error);
        return null;
    }
};
