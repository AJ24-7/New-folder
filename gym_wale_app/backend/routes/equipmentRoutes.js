const express = require('express');
const router = express.Router();
const Gym = require('../models/gym');
const Payment = require('../models/Payment');
const GymNotification = require('../models/GymNotification');
const authMiddleware = require('../middleware/gymadminAuth');
const path = require('path');
const fs = require('fs').promises;

// POST /api/equipment - Add new equipment (direct route)
router.post('/', authMiddleware, async (req, res) => {
  try {
    // Get gym from authenticated user
    const gym = await Gym.findById(req.admin.id);
    if (!gym) {
      return res.status(404).json({ message: 'Gym not found' });
    }

    // Validate and normalize category
    const validCategories = ['cardio', 'strength', 'functional', 'flexibility', 'accessories', 'other'];
    const normalizedCategory = req.body.category ? req.body.category.toLowerCase() : 'other';
    const category = validCategories.includes(normalizedCategory) ? normalizedCategory : 'other';

    // Validate and normalize status
    const validStatuses = ['available', 'maintenance', 'out-of-order'];
    const normalizedStatus = req.body.status ? req.body.status.toLowerCase() : 'available';
    const status = validStatuses.includes(normalizedStatus) ? normalizedStatus : 'available';

    // Clean up existing equipment to ensure valid enum values
    if (gym.equipment && gym.equipment.length > 0) {
      gym.equipment = gym.equipment.map(eq => {
        const eqObj = eq.toObject ? eq.toObject() : eq;
        const eqCategory = eqObj.category ? eqObj.category.toLowerCase() : 'other';
        const eqStatus = eqObj.status ? eqObj.status.toLowerCase() : 'available';
        return {
          ...eqObj,
          category: validCategories.includes(eqCategory) ? eqCategory : 'other',
          status: validStatuses.includes(eqStatus) ? eqStatus : 'available'
        };
      });
    }

    const equipmentData = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: req.body.name,
      brand: req.body.brand,
      category: category,
      model: req.body.model,
      quantity: parseInt(req.body.quantity) || 1,
      status: status,
      purchaseDate: req.body.purchaseDate,
      price: req.body.price ? parseFloat(req.body.price) : undefined,
      warranty: req.body.warranty ? parseInt(req.body.warranty) : undefined,
      location: req.body.location,
      description: req.body.description,
      specifications: req.body.specifications,
      photos: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Process photos from request body (Cloudinary URLs)
    if (req.body.photos && Array.isArray(req.body.photos)) {
      equipmentData.photos = req.body.photos;
    }

    // Add equipment to gym's equipment array
    if (!gym.equipment) {
      gym.equipment = [];
    }
    gym.equipment.push(equipmentData);

    await gym.save();
    

    // Create payment record if price is provided
    if (equipmentData.price && equipmentData.price > 0) {
      try {
        const paymentData = {
          gymId: gym._id,
          type: 'paid',
          category: 'equipment_purchase',
          amount: equipmentData.price,
          description: `Equipment Purchase: ${equipmentData.name}${equipmentData.brand ? ` - ${equipmentData.brand}` : ''}${equipmentData.model ? ` ${equipmentData.model}` : ''}`,
          paymentMethod: 'cash', // Default method, can be updated later
          status: 'completed',
          paidDate: equipmentData.purchaseDate ? new Date(equipmentData.purchaseDate) : new Date(),
          notes: `Automatically created for equipment: ${equipmentData.name} (ID: ${equipmentData.id})`,
          createdBy: req.admin.id
        };

        const payment = new Payment(paymentData);
        await payment.save();
      } catch (paymentError) {
        console.error('Error creating payment record:', paymentError);
        // Don't fail the equipment creation if payment creation fails
      }
    }

    // Create notification for new equipment
    try {
      const notificationData = {
        gymId: gym._id,
        type: 'system-alert',
        title: 'New Equipment Added',
        message: `New equipment "${equipmentData.name}" has been added to your inventory.${equipmentData.price ? ` Purchase amount: ₹${equipmentData.price}` : ''}`,
        priority: 'medium',
        metadata: {
          equipmentId: equipmentData.id,
          equipmentName: equipmentData.name,
          equipmentCategory: equipmentData.category,
          purchaseAmount: equipmentData.price || 0,
          source: 'equipment-management'
        },
        actions: [{
          type: 'acknowledge',
          label: 'View Equipment',
          url: `/gymadmin/equipment.html`
        }]
      };

      const notification = new GymNotification(notificationData);
      await notification.save();
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Don't fail the equipment creation if notification creation fails
    }

    res.status(201).json({
      success: true,
      message: 'Equipment added successfully',
      equipment: equipmentData
    });
  } catch (error) {
    console.error('Error adding equipment:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      errors: error.errors,
      stack: error.stack
    });
    res.status(500).json({ 
      message: 'Server error while adding equipment',
      error: error.message,
      details: error.errors 
    });
  }
});

// PUT /api/equipment/:id - Update equipment (direct route)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get gym from authenticated user
    const gym = await Gym.findById(req.admin.id);
    if (!gym) {
      return res.status(404).json({ message: 'Gym not found' });
    }

    // Clean up existing equipment to ensure valid enum values
    const validCategories = ['cardio', 'strength', 'functional', 'flexibility', 'accessories', 'other'];
    const validStatuses = ['available', 'maintenance', 'out-of-order'];
    
    if (gym.equipment && gym.equipment.length > 0) {
      gym.equipment = gym.equipment.map(eq => {
        const eqObj = eq.toObject ? eq.toObject() : eq;
        const eqCategory = eqObj.category ? eqObj.category.toLowerCase() : 'other';
        const eqStatus = eqObj.status ? eqObj.status.toLowerCase() : 'available';
        return {
          ...eqObj,
          category: validCategories.includes(eqCategory) ? eqCategory : 'other',
          status: validStatuses.includes(eqStatus) ? eqStatus : 'available'
        };
      });
    }

    // Find equipment by ID
    const equipmentIndex = gym.equipment.findIndex(eq => (eq.id || eq._id) == id);
    if (equipmentIndex === -1) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    // Validate and normalize category
    let category = gym.equipment[equipmentIndex].category;
    if (req.body.category) {
      const normalizedCategory = req.body.category.toLowerCase();
      category = validCategories.includes(normalizedCategory) ? normalizedCategory : 'other';
    }

    // Validate and normalize status
    let status = gym.equipment[equipmentIndex].status;
    if (req.body.status) {
      const normalizedStatus = req.body.status.toLowerCase();
      status = validStatuses.includes(normalizedStatus) ? normalizedStatus : 'available';
    }

    // Update equipment data
    const existingEquipment = gym.equipment[equipmentIndex];
    const updatedEquipment = {
      ...existingEquipment,
      name: req.body.name || existingEquipment.name,
      brand: req.body.brand || existingEquipment.brand,
      category: category,
      model: req.body.model || existingEquipment.model,
      quantity: req.body.quantity ? parseInt(req.body.quantity) : existingEquipment.quantity,
      status: status,
      purchaseDate: req.body.purchaseDate || existingEquipment.purchaseDate,
      price: req.body.price ? parseFloat(req.body.price) : existingEquipment.price,
      warranty: req.body.warranty ? parseInt(req.body.warranty) : existingEquipment.warranty,
      location: req.body.location || existingEquipment.location,
      description: req.body.description || existingEquipment.description,
      specifications: req.body.specifications || existingEquipment.specifications,
      updatedAt: new Date()
    };

    // Process photos from request body (Cloudinary URLs)
    if (req.body.photos && Array.isArray(req.body.photos)) {
      updatedEquipment.photos = req.body.photos;
    } else {
      updatedEquipment.photos = existingEquipment.photos || [];
    }

    gym.equipment[equipmentIndex] = updatedEquipment;
    await gym.save();

    // Create payment record if price was added or changed
    const oldPrice = existingEquipment.price || 0;
    const newPrice = updatedEquipment.price || 0;
    
    if (newPrice > 0 && newPrice !== oldPrice) {
      try {
        const paymentData = {
          gymId: gym._id,
          type: 'paid',
          category: 'equipment_purchase',
          amount: newPrice,
          description: oldPrice === 0 
            ? `Equipment Purchase: ${updatedEquipment.name}${updatedEquipment.brand ? ` - ${updatedEquipment.brand}` : ''}${updatedEquipment.model ? ` ${updatedEquipment.model}` : ''}`
            : `Equipment Price Update: ${updatedEquipment.name} (Previous: ₹${oldPrice}, New: ₹${newPrice})`,
          paymentMethod: 'cash',
          status: 'completed',
          paidDate: updatedEquipment.purchaseDate ? new Date(updatedEquipment.purchaseDate) : new Date(),
          notes: `${oldPrice === 0 ? 'Created' : 'Updated'} for equipment: ${updatedEquipment.name} (ID: ${updatedEquipment.id})`,
          createdBy: req.admin.id
        };

        const payment = new Payment(paymentData);
        await payment.save();
      } catch (paymentError) {
        console.error('Error creating payment record:', paymentError);
      }
    }

    // Create notification for equipment update
    if (newPrice !== oldPrice || updatedEquipment.name !== existingEquipment.name) {
      try {
        const notificationData = {
          gymId: gym._id,
          type: 'system-alert',
          title: 'Equipment Updated',
          message: `Equipment "${updatedEquipment.name}" has been updated.${newPrice !== oldPrice ? ` Purchase amount updated to: ₹${newPrice}` : ''}`,
          priority: 'low',
          metadata: {
            equipmentId: updatedEquipment.id,
            equipmentName: updatedEquipment.name,
            equipmentCategory: updatedEquipment.category,
            oldPrice: oldPrice,
            newPrice: newPrice,
            source: 'equipment-management'
          },
          actions: [{
            type: 'acknowledge',
            label: 'View Equipment',
            url: `/gymadmin/equipment.html`
          }]
        };

        const notification = new GymNotification(notificationData);
        await notification.save();
      } catch (notificationError) {
        console.error('Error creating notification:', notificationError);
      }
    }

    res.json({
      success: true,
      message: 'Equipment updated successfully',
      equipment: updatedEquipment
    });
  } catch (error) {
    console.error('Error updating equipment:', error);
    res.status(500).json({ message: 'Server error while updating equipment' });
  }
});

// DELETE /api/equipment/:id - Delete equipment (direct route)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get gym from authenticated user
    const gym = await Gym.findById(req.admin.id);
    if (!gym) {
      return res.status(404).json({ message: 'Gym not found' });
    }

    // Find equipment by ID
    const equipmentIndex = gym.equipment.findIndex(eq => (eq.id || eq._id) == id);
    if (equipmentIndex === -1) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    // Remove equipment from array
    gym.equipment.splice(equipmentIndex, 1);
    await gym.save();

    // Note: Photos are stored in Cloudinary and managed automatically

    res.json({
      success: true,
      message: 'Equipment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting equipment:', error);
    res.status(500).json({ message: 'Server error while deleting equipment' });
  }
});

// GET /api/gym/:gymId/equipment - Get all equipment for a gym
router.get('/:gymId/equipment', authMiddleware, async (req, res) => {
  try {
    const { gymId } = req.params;
    
    // Find the gym and populate equipment
    const gym = await Gym.findById(gymId);
    if (!gym) {
      return res.status(404).json({ message: 'Gym not found' });
    }

    // Check if user has access to this gym
    if (gym._id.toString() !== req.user.gymId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const equipment = gym.equipment || [];
    res.json({ equipment });
  } catch (error) {
    console.error('Error fetching equipment:', error);
    res.status(500).json({ message: 'Server error while fetching equipment' });
  }
});

// POST /api/gym/:gymId/equipment - Add new equipment
router.post('/:gymId/equipment', authMiddleware, async (req, res) => {
  try {
    const { gymId } = req.params;
    const {
      name,
      brand,
      category,
      model,
      quantity,
      status,
      purchaseDate,
      price,
      warranty,
      location,
      description,
      specifications
    } = req.body;

    // Find the gym
    const gym = await Gym.findById(gymId);
    if (!gym) {
      return res.status(404).json({ message: 'Gym not found' });
    }

    // Check if user has access to this gym
    if (gym._id.toString() !== req.user.gymId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Process photos from request body (Cloudinary URLs)
    let photos = [];
    if (req.body.photos && Array.isArray(req.body.photos)) {
      photos = req.body.photos;
    }

    // Create new equipment object
    const newEquipment = {
      id: new Date().getTime().toString(), // Simple ID generation
      name: name || '',
      brand: brand || '',
      category: category || 'other',
      model: model || '',
      quantity: parseInt(quantity) || 1,
      status: status || 'available',
      purchaseDate: purchaseDate || null,
      price: parseFloat(price) || null,
      warranty: parseInt(warranty) || null,
      location: location || '',
      description: description || '',
      specifications: specifications || '',
      photos: photos,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Initialize equipment array if it doesn't exist
    if (!gym.equipment) {
      gym.equipment = [];
    }

    // Add equipment to gym
    gym.equipment.push(newEquipment);
    await gym.save();

    res.status(201).json({
      message: 'Equipment added successfully',
      equipment: newEquipment
    });
  } catch (error) {
    console.error('Error adding equipment:', error);
    res.status(500).json({ message: 'Server error while adding equipment' });
  }
});

// PUT /api/gym/:gymId/equipment/:equipmentId - Update equipment
router.put('/:gymId/equipment/:equipmentId', authMiddleware, async (req, res) => {
  try {
    const { gymId, equipmentId } = req.params;
    const {
      name,
      brand,
      category,
      model,
      quantity,
      status,
      purchaseDate,
      price,
      warranty,
      location,
      description,
      specifications
    } = req.body;

    // Find the gym
    const gym = await Gym.findById(gymId);
    if (!gym) {
      return res.status(404).json({ message: 'Gym not found' });
    }

    // Check if user has access to this gym
    if (gym._id.toString() !== req.user.gymId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Find the equipment
    const equipmentIndex = gym.equipment.findIndex(eq => eq.id === equipmentId);
    if (equipmentIndex === -1) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    const existingEquipment = gym.equipment[equipmentIndex];

    // Process photos from request body (Cloudinary URLs)
    let photos = [];
    if (req.body.photos && Array.isArray(req.body.photos)) {
      photos = req.body.photos;
    } else {
      photos = existingEquipment.photos || [];
    }

    // Update equipment object
    const updatedEquipment = {
      ...existingEquipment,
      name: name || existingEquipment.name,
      brand: brand || existingEquipment.brand,
      category: category || existingEquipment.category,
      model: model || existingEquipment.model,
      quantity: quantity ? parseInt(quantity) : existingEquipment.quantity,
      status: status || existingEquipment.status,
      purchaseDate: purchaseDate || existingEquipment.purchaseDate,
      price: price ? parseFloat(price) : existingEquipment.price,
      warranty: warranty ? parseInt(warranty) : existingEquipment.warranty,
      location: location || existingEquipment.location,
      description: description || existingEquipment.description,
      specifications: specifications || existingEquipment.specifications,
      photos: photos,
      updatedAt: new Date()
    };

    // Update equipment in gym
    gym.equipment[equipmentIndex] = updatedEquipment;
    await gym.save();

    res.json({
      message: 'Equipment updated successfully',
      equipment: updatedEquipment
    });
  } catch (error) {
    console.error('Error updating equipment:', error);
    res.status(500).json({ message: 'Server error while updating equipment' });
  }
});

// DELETE /api/gym/:gymId/equipment/:equipmentId - Delete equipment
router.delete('/:gymId/equipment/:equipmentId', authMiddleware, async (req, res) => {
  try {
    const { gymId, equipmentId } = req.params;

    // Find the gym
    const gym = await Gym.findById(gymId);
    if (!gym) {
      return res.status(404).json({ message: 'Gym not found' });
    }

    // Check if user has access to this gym
    if (gym._id.toString() !== req.user.gymId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Find the equipment
    const equipmentIndex = gym.equipment.findIndex(eq => eq.id === equipmentId);
    if (equipmentIndex === -1) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    // Remove equipment from gym
    gym.equipment.splice(equipmentIndex, 1);
    
    // Note: Photos are stored in Cloudinary and managed automatically
    await gym.save();

    res.json({ message: 'Equipment deleted successfully' });
  } catch (error) {
    console.error('Error deleting equipment:', error);
    res.status(500).json({ message: 'Server error while deleting equipment' });
  }
});

// DELETE /api/gym/:gymId/equipment/:equipmentId/photo - Delete specific photo
router.delete('/:gymId/equipment/:equipmentId/photo', authMiddleware, async (req, res) => {
  try {
    const { gymId, equipmentId } = req.params;
    const { photoPath } = req.body;

    if (!photoPath) {
      return res.status(400).json({ message: 'Photo path is required' });
    }

    // Find the gym
    const gym = await Gym.findById(gymId);
    if (!gym) {
      return res.status(404).json({ message: 'Gym not found' });
    }

    // Check if user has access to this gym
    if (gym._id.toString() !== req.user.gymId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Find the equipment
    const equipmentIndex = gym.equipment.findIndex(eq => eq.id === equipmentId);
    if (equipmentIndex === -1) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    const equipment = gym.equipment[equipmentIndex];

    // Find and remove the photo URL
    const photoIndex = equipment.photos.findIndex(photo => photo === photoPath);
    if (photoIndex === -1) {
      return res.status(404).json({ message: 'Photo not found' });
    }

    // Remove photo from equipment (Cloudinary handles cloud storage)
    equipment.photos.splice(photoIndex, 1);
    equipment.updatedAt = new Date();

    await gym.save();

    res.json({ 
      message: 'Photo deleted successfully',
      equipment: equipment
    });
  } catch (error) {
    console.error('Error deleting equipment photo:', error);
    res.status(500).json({ message: 'Server error while deleting photo' });
  }
});

// GET /api/gym/:gymId/equipment/stats - Get equipment statistics
router.get('/:gymId/equipment/stats', authMiddleware, async (req, res) => {
  try {
    const { gymId } = req.params;

    // Find the gym
    const gym = await Gym.findById(gymId);
    if (!gym) {
      return res.status(404).json({ message: 'Gym not found' });
    }

    // Check if user has access to this gym
    if (gym._id.toString() !== req.user.gymId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const equipment = gym.equipment || [];

    // Calculate statistics
    const stats = {
      total: equipment.length,
      available: equipment.filter(eq => eq.status === 'available' || !eq.status).length,
      maintenance: equipment.filter(eq => eq.status === 'maintenance').length,
      outOfOrder: equipment.filter(eq => eq.status === 'out-of-order').length,
      categories: {},
      totalValue: 0
    };

    // Calculate category breakdown and total value
    equipment.forEach(eq => {
      const category = eq.category || 'other';
      stats.categories[category] = (stats.categories[category] || 0) + 1;
      
      if (eq.price) {
        stats.totalValue += parseFloat(eq.price) * (parseInt(eq.quantity) || 1);
      }
    });

    res.json({ stats });
  } catch (error) {
    console.error('Error fetching equipment stats:', error);
    res.status(500).json({ message: 'Server error while fetching equipment statistics' });
  }
});

module.exports = router;
