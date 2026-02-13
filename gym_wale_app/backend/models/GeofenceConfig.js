const mongoose = require('mongoose');

const geofenceConfigSchema = new mongoose.Schema({
  gym: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gym',
    required: true,
    unique: true // One geofence config per gym
  },
  type: {
    type: String,
    enum: ['circular', 'polygon'],
    default: 'circular'
  },
  // For circular geofence
  center: {
    lat: { type: Number },
    lng: { type: Number }
  },
  radius: {
    type: Number, // in meters
    min: 50,
    max: 500
  },
  // For polygon geofence
  polygonCoordinates: [{
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  }],
  // Settings
  enabled: {
    type: Boolean,
    default: true
  },
  autoMarkEntry: {
    type: Boolean,
    default: true
  },
  autoMarkExit: {
    type: Boolean,
    default: true
  },
  allowMockLocation: {
    type: Boolean,
    default: false
  },
  minimumAccuracy: {
    type: Number,
    default: 20, // meters
    min: 10,
    max: 50
  },
  minimumStayDuration: {
    type: Number,
    default: 5, // minutes
    min: 1,
    max: 120
  },
  // Operating hours
  operatingHoursStart: {
    type: String, // Format: "HH:mm"
    default: '06:00'
  },
  operatingHoursEnd: {
    type: String, // Format: "HH:mm"
    default: '22:00'
  }
}, {
  timestamps: true
});

// Index for faster queries
geofenceConfigSchema.index({ gym: 1 });

// Method to check if a point is inside the geofence
geofenceConfigSchema.methods.containsPoint = function(lat, lng) {
  if (this.type === 'circular') {
    if (!this.center || !this.radius) return false;
    const distance = calculateDistance(
      this.center.lat,
      this.center.lng,
      lat,
      lng
    );
    return distance <= this.radius;
  } else if (this.type === 'polygon') {
    if (!this.polygonCoordinates || this.polygonCoordinates.length < 3) return false;
    return isPointInPolygon(lat, lng, this.polygonCoordinates);
  }
  return false;
};

// Method to check if operating hours are valid
geofenceConfigSchema.methods.isWithinOperatingHours = function() {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  if (!this.operatingHoursStart || !this.operatingHoursEnd) {
    return true; // No restrictions if not set
  }
  
  return currentTime >= this.operatingHoursStart && currentTime <= this.operatingHoursEnd;
};

// Helper function to calculate distance using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Helper function to check if point is inside polygon (Ray casting algorithm)
function isPointInPolygon(lat, lng, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lat, yi = polygon[i].lng;
    const xj = polygon[j].lat, yj = polygon[j].lng;

    const intersect = ((yi > lng) !== (yj > lng)) &&
      (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

module.exports = mongoose.model('GeofenceConfig', geofenceConfigSchema);
