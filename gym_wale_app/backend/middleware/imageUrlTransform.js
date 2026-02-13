/**
 * Middleware to transform local image URLs to full URLs
 * This ensures backward compatibility during migration to Cloudinary
 */

const transformImageUrl = (imageUrl, baseUrl) => {
  // Return null for any falsy values (null, undefined, empty string)
  if (!imageUrl || imageUrl.trim() === '') {
    return null;
  }
  
  // If already a full URL (Cloudinary or external like Pexels), return as is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  // IMPORTANT: Local paths should not exist anymore - all images should be on Cloudinary
  // If we encounter a local path, return null to use default placeholder
  if (imageUrl.startsWith('/uploads/') || imageUrl.startsWith('uploads/')) {
    console.warn(`⚠️ Found local image path (should be migrated to Cloudinary): ${imageUrl}`);
    return null; // Return null to trigger default avatar/placeholder
  }
  
  // Default case - return null for unrecognized formats
  return null;
};

const transformUserImages = (user, baseUrl) => {
  if (!user) return user;
  
  if (user.profileImage) {
    user.profileImage = transformImageUrl(user.profileImage, baseUrl);
  }
  
  return user;
};

const transformGymImages = (gym, baseUrl) => {
  if (!gym) return gym;
  
  // Transform logo
  if (gym.logoUrl) {
    gym.logoUrl = transformImageUrl(gym.logoUrl, baseUrl);
  }
  
  // Transform gym photos
  if (gym.gymPhotos && Array.isArray(gym.gymPhotos)) {
    gym.gymPhotos = gym.gymPhotos.map(photo => {
      if (photo.imageUrl) {
        photo.imageUrl = transformImageUrl(photo.imageUrl, baseUrl);
      }
      return photo;
    });
  }
  
  // Transform images array (used in some responses)
  if (gym.images && Array.isArray(gym.images)) {
    gym.images = gym.images.map(img => transformImageUrl(img, baseUrl));
  }
  
  // Transform equipment photos
  if (gym.equipment && Array.isArray(gym.equipment)) {
    gym.equipment = gym.equipment.map(eq => {
      if (eq.photos && Array.isArray(eq.photos)) {
        eq.photos = eq.photos.map(photo => transformImageUrl(photo, baseUrl));
      }
      return eq;
    });
  }
  
  return gym;
};

const transformMemberImages = (member, baseUrl) => {
  if (!member) return member;
  
  if (member.profileImage) {
    member.profileImage = transformImageUrl(member.profileImage, baseUrl);
  }
  
  return member;
};

/**
 * Express middleware to intercept JSON responses and transform image URLs
 */
const imageUrlTransformMiddleware = (req, res, next) => {
  const originalJson = res.json;
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  
  res.json = function(data) {
    if (data && typeof data === 'object') {
      // Transform user data
      if (data.user) {
        data.user = transformUserImages(data.user, baseUrl);
      }
      
      // Transform gym data
      if (data.gym) {
        data.gym = transformGymImages(data.gym, baseUrl);
      }
      
      // Transform gyms array
      if (data.gyms && Array.isArray(data.gyms)) {
        data.gyms = data.gyms.map(gym => transformGymImages(gym, baseUrl));
      }
      
      // Transform data.data if it's a gym
      if (data.data && data.data.gymName) {
        data.data = transformGymImages(data.data, baseUrl);
      }
      
      // Transform member data
      if (data.member) {
        data.member = transformMemberImages(data.member, baseUrl);
      }
      
      // Transform members array
      if (data.members && Array.isArray(data.members)) {
        data.members = data.members.map(member => transformMemberImages(member, baseUrl));
      }
      
      // Transform pass data (membership passes)
      if (data.pass) {
        if (data.pass.profileImage) {
          data.pass.profileImage = transformImageUrl(data.pass.profileImage, baseUrl);
        }
        if (data.pass.gym && data.pass.gym.logo) {
          data.pass.gym.logo = transformImageUrl(data.pass.gym.logo, baseUrl);
        }
      }
      
      // Handle direct user response (common in profile endpoints)
      if (data.profileImage && !data.user && !data.gym) {
        data.profileImage = transformImageUrl(data.profileImage, baseUrl);
      }
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

module.exports = {
  imageUrlTransformMiddleware,
  transformImageUrl,
  transformUserImages,
  transformGymImages,
  transformMemberImages
};
